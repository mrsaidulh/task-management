# Continuous Deployment Guide: Auto-Deploy to Private Ubuntu VM via GitHub Actions

Yes, this is **100% possible** and is highly recommended! 

Because your Ubuntu VM (`192.168.38.131`) runs on a **private local network**, GitHub cannot directly send Webhooks to it (since it does not have a public IP address). 

To solve this safely and securely without exposing your VM or router to the internet, you should use a **GitHub Self-Hosted Runner**. The runner sits on your VM, listens for push events from GitHub through an outbound connection, grabs the code changes, compiles them, and restarts the backend via PM2 instantly!

---

## Architectural Workflow
```text
[ Local Code Change ] ---> [ git push origin main ] ---> [ GitHub Repo ]
                                                               |
                                                   (Outbound Connection)
                                                               v
[ Ubuntu VM (192.168.38.131) ] <-------------------- [ Self-Hosted Runner ]
  - Pulle latest code
  - Runs npm install / npm run build
  - Restarts app seamlessly using PM2
```

---

## Step 1: Add the GitHub Workflow File
Create a specialized GitHub Actions deployment pipeline file inside your code directory. This tells GitHub what steps to run on your VM when you push to the repository.

Create a file named `.github/workflows/deploy.yml` in your project root:

```yaml
name: Continuous Deployment

# Trigger the workflow every time code is pushed to the 'main' branch
on:
  push:
    branches:
      - main

jobs:
  deploy:
    # Run this workflow ONLY on your self-hosted physical VM runner
    runs-on: self-hosted

    steps:
      - name: Checkout Code Repository
        uses: actions/checkout@v4

      - name: Install Node.js Dependencies
        run: npm install

      - name: Build Application Templates & Assets
        run: npm run build

      - name: Hot Restart Application Server with PM2
        run: pm2 restart task-manager-app || pm2 start dist/server.cjs --name "task-manager-app"
```

---

## Step 2: Register the Ubuntu VM on GitHub

To connect your Ubuntu VM to GitHub as a runner:

1. Open your project on **GitHub** (web interface).
2. Go to **Settings** -> **Actions** -> **Runners** (in the left sidebar).
3. Click the green **"New self-hosted runner"** button.
4. Select **Runner image: Linux** and your architecture (usually **x64**).
5. GitHub will display a list of simple command lines to write directly inside your VM console.

---

## Step 3: Run the Config Commands on your VM

Log in to your Ubuntu VM via SSH (`ssh saidul@192.168.38.131`) and copy-paste the commands supplied by GitHub. It will look like this:

```bash
# 1. Create a runner directory
mkdir actions-runner && cd actions-runner

# 2. Download and unpack the runner binaries (Version will adapt dynamically based on GitHub instructions)
curl -o actions-runner-linux-x64-2.317.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.317.0/actions-runner-linux-x64-2.317.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.317.0.tar.gz

# 3. Configure the connection (This command includes your safe repository token)
./config.sh --url https://github.com/YOUR_USERNAME/YOUR_REPO --token YOUR_GITHUB_SECURE_TOKEN
```

### Configuration Prompts:
* **Enter the name of the runner group**: Press `Enter` (default).
* **Enter the name of runner**: Press `Enter` (it defaults to your VM host name, e.g. `myserver`).
* **Enter any additional labels**: Type `self-hosted` and press `Enter`.
* **Enter work folder**: Press `Enter` (default `_work`).

---

## Step 4: Run the Runner as a Continuous System Service

Do not start the runner manually via `./run.sh`, as it would stop when you close your SSH terminal shell. Instead, let's register it as a native continuous Ubuntu service:

```bash
# Register the runner as a systemctl background service
sudo ./svc.sh install

# Start the continuous service
sudo ./svc.sh start

# Verify running state check
sudo ./svc.sh status
```

*Success! In your GitHub **Runners** list, the status of your runner will now change to green **"Idle" / "Online"**.*

---

## Step 5: Test Your Automatic CI/CD Pipeline!

1. Edit any file (such as a visual accent or caption in `/src/App.tsx`) on your local machine.
2. Commit and push the changes:
   ```bash
   git add .
   git commit -m "feat: design visual improvements"
   git push origin main
   ```
3. Open your GitHub repository web interface and click on the **Actions** tab.
4. You will see a live workflow pipeline running. GitHub is sending the commands safely back to the VM!
5. Within 30 seconds, your VM pulls the changes, installs new packages, builds the static bundle, restarts **PM2**, and refreshes the live server on `http://192.168.38.131` completely automatically without human setup interventions!
