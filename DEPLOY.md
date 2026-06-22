# Deployment Guide: Ubuntu VM Setup with MySQL & Nginx

This guide walks you through deploying and configuring this application on your Ubuntu VM (`192.168.38.131`) with a local MySQL database and Nginx server. Since this is a full-stack application, Nginx will serve as a reverse proxy forwarding external traffic to the Node.js backend port (`3000`).

---

## Architecture Overview
- **Frontend & Backend**: Single Express + Vite Node.js entrypoint running on port `3000` managed by **PM2**.
- **Database**: Local **MySQL** on port `3306`.
- **Web Server**: **Nginx** acting as a high-performance reverse proxy on port `80` (or `443`).

---

## Step 1: Exporting Your Code
To migrate this application from AI Studio to your local VM:
1. Open the **Settings** menu page (gear icon) in the top-right corner of AI Studio.
2. Select **Export to ZIP** or **Sync to GitHub**.
3. If using ZIP: Download and transfer the ZIP archive to your VM using `scp` or any SFTP client, then unzip it:
   ```bash
   scp path/to/project.zip saidul@192.168.38.131:/home/saidul/
   ssh saidul@192.168.38.131 "unzip project.zip -d task-management"
   ```

---

## Step 2: System Dependencies Installation
Update your repository index and install the necessary runtimes (Node.js 18+, MySQL, Nginx, and git):

```bash
sudo apt update && sudo apt upgrade -y

# 1. Install Node.js & NPM (Nodesource LTS recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify runtimes
node -v
npm -v

# 2. Install MySQL & Nginx
sudo apt install -y mysql-server nginx
```

---

## Step 3: MySQL Database Setup
By default, the application is preloaded to auto-migrate and seed its tables on first-run. Let's create your user and database schemas.

1. Access your MySQL prompt:
   ```bash
   sudo mysql
   ```

2. Run the secure creation commands. Make sure to match the requested configurations:
   ```sql
   -- Create database
   CREATE DATABASE IF NOT EXISTS taskmanagement CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

   -- Create custom user
   CREATE USER 'management'@'localhost' IDENTIFIED WITH mysql_native_password BY 'mymensingh2026@BD';

   -- Grant permissions
   GRANT ALL PRIVILEGES ON taskmanagement.* TO 'management'@'localhost';
   FLUSH PRIVILEGES;

   EXIT;
   ```

3. Enable and restart the database service:
   ```bash
   sudo systemctl enable mysql
   sudo systemctl restart mysql
   ```

---

## Step 4: Configure Environments
Navigate into your project folder and create a `.env` file to securely declare environment variables:

```bash
cd /home/saidul/task-management
nano .env
```

Paste the following configurations precisely:
```env
PORT=3000
NODE_ENV=production

# Database Credentials
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=management
DB_PASSWORD=mymensingh2026@BD
DB_NAME=taskmanagement
```
Press `Ctrl+O` then `Enter` to save, and `Ctrl+X` to exit nano.

---

## Step 5: Install, Build & Start Application
Run standard NPM operations to configure dependency modules and compile TypeScript:

```bash
# 1. Mount packages
npm install

# 2. Compile full-stack bundle (compiles server CJS and asset dists)
npm run build

# 3. Test launch the database sync
npm start
```
*At this stage, you should see logs stating: `[Database] Successfully connected to MySQL database` and `[Schema Seed] MySQL schema check complete.` to signify absolute success.*

---

## Step 6: Make Application Persistent with PM2
To keep your Node.js application running indefinitely in the background and survive VM restarts, configure **PM2**:

```bash
# Install globally
sudo npm install -g pm2

# Start task application process
pm2 start dist/server.cjs --name "task-manager-app"

# Configure auto-startup upon physical VM reboots
pm2 startup systemd
# Copy-paste the command printed by that prompt and execute it with sudo.

# Save current process list state
pm2 save
```

Useful PM2 Commands:
- View live stream application console logs: `pm2 logs task-manager-app`
- Check execution states: `pm2 status`
- Restart server: `pm2 restart task-manager-app`

---

## Step 7: Configure Nginx Reverse Proxy
Redirect standard browser traffic (Port 80) incoming to `192.168.38.131` directly into our Node.js app instance on port `3000`.

1. Delete default setup and build a fresh custom host:
   ```bash
   sudo rm /etc/nginx/sites-enabled/default
   sudo nano /etc/nginx/sites-available/taskmanagement
   ```

2. Add the clean forwarding block:
   ```nginx
   server {
       listen 80;
       server_name 192.168.38.131;

       # Restrict maximum file upload sizes
       client_max_body_size 32M;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           
           # Real IP configuration flags
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. Link site configuration and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/taskmanagement /etc/nginx/sites-enabled/
   
   # Test configurations for syntax integrity
   sudo nginx -t

   # Apply
   sudo systemctl enable nginx
   sudo systemctl restart nginx
   ```

---

## Step 8: Network Configurations & Testing
Ensure system firewall settings allow incoming web server traffic:

```bash
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Now, open your preferred web browser on any machine in your local net and navigate to:
`http://192.168.38.131`

Your application is now fully live, secured, and connected to your production MySQL database!
