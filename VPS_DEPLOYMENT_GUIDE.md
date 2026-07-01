# VPS Deployment Guide: Ubuntu with Nginx & MySQL

This production setup guide is customized for deploying your **Worksuite / Task Management** application onto your private VPS running **Ubuntu** at IP address **`172.20.10.44`**.

It covers installing system runtimes, establishing a secure local MySQL database, setting up the Node.js production server, managing persistence with PM2, and proxying traffic seamlessly through Nginx on Port 80.

---

## 🏗️ Architecture Overview

- **Frontend & Backend**: Unified Express and React (Vite) server running on port `3000` managed by **PM2**.
- **Database**: Local **MySQL** instance on port `3306`.
- **Web Server / Reverse Proxy**: **Nginx** listening on Port `80` (or `443` for SSL) forwarding incoming client traffic to Node on port `3000`.

---

## 📥 Step 1: Transferring the Codebase to your VPS

Before starting, export your source files from AI Studio (using **Export to ZIP** or **Sync to GitHub**).

If you are using a ZIP archive, copy it to your target folder on your VPS (e.g. `/var/www/worksuite`) from your local terminal:

```bash
# Transfer the zip from your local computer to the VPS
scp task-management.zip root@172.20.10.44:/var/www/worksuite/

# Log in to your VPS
ssh root@172.20.10.44

# Unzip inside your deployment directory
cd /var/www/worksuite
unzip task-management.zip -d task-management
```

Verify that you are in the correct directory where `package.json` resides:
```bash
cd /var/www/worksuite/task-management
ls -la
```

---

## 🛠️ Step 2: System Dependencies Installation

Update your Ubuntu packages and fetch the official runtimes:

```bash
sudo apt update && sudo apt upgrade -y

# 1. Install Node.js LTS (NodeSource Node 20 recommended)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Verify runtimes
node -v
npm -v

# 2. Install MySQL Server, Nginx, and git
sudo apt install -y mysql-server nginx git unzip
```

---

## 🗄️ Step 3: MySQL Database Configuration

This application automatically bootstraps, migrates, and seeds default records upon connecting. Set up your user credentials first.

1. Launch the MySQL root shell:
   ```bash
   sudo mysql
   ```

2. Run the database and user creation queries inside the prompt:
   ```sql
   -- Create database
   CREATE DATABASE IF NOT EXISTS workmanager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

   -- Create custom user
   -- Replace 'your_secure_password' with a password of your choice
   CREATE USER 'worksuite_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_secure_password';

   -- Grant permissions to the custom user
   GRANT ALL PRIVILEGES ON workmanager.* TO 'worksuite_user'@'localhost';
   FLUSH PRIVILEGES;

   EXIT;
   ```

3. Enable and restart MySQL database services:
   ```bash
   sudo systemctl enable mysql
   sudo systemctl restart mysql
   ```

---

## 🔒 Step 4: Environment Variables Configuration

Create the persistent production `.env` file inside your app folder:

```bash
cd /var/www/worksuite/task-management
nano .env
```

Paste the following configurations (adjust variables as necessary).

> **💡 Important note on environment modes:**
> Since this app uses a bundler, **do not** write `NODE_ENV=production` inside a `.env` file that is read by Vite during client compilation, as some local builds limit production variables in file scopes. Instead, keep it simple and explicit in your environment:

```env
PORT=3000
NODE_ENV=production

# Database Credentials
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=worksuite_user
DB_PASSWORD=your_secure_password
DB_NAME=workmanager

# Gemini AI Integration (Optional)
# If you are using any server-side AI integrations, paste your Gemini API key here
GEMINI_API_KEY="your_actual_gemini_api_key_here"
```

Save and exit: Press `Ctrl+O`, then `Enter`, then `Ctrl+X`.

---

## 🚀 Step 5: Install, Build & Test Run

Run commands in the app directory (`/var/www/worksuite/task-management`):

```bash
# 1. Install production dependencies
npm install

# 2. Compile full-stack bundle
# This generates static React assets in `dist/` and compiles `server.ts` to `dist/server.cjs`
npm run build

# 3. Test launch to verify MySQL connection and startup state
npm start
```

If successful, you will see output like:
```text
[Database] Successfully connected to MySQL database on 127.0.0.1
[Schema Seed] MySQL schema check complete.
Server running on http://localhost:3000
```
Once verified, shut down the temporary manual test by pressing `Ctrl+C`.

---

## 🔄 Step 6: Process Management with PM2

To ensure the application stays online 24/7, recovers from unexpected errors, and automatically restarts when the server reboots:

```bash
# 1. Install PM2 globally
sudo npm install -g pm2

# 2. Start your application in background mode
pm2 start dist/server.cjs --name "worksuite-app"

# 3. Configure PM2 system auto-startup on reboot
pm2 startup systemd
```

*The `pm2 startup` command will print a block of code to copy and run as root. Copy and paste that line into your terminal.*

Once that is done, save the current process layout:
```bash
pm2 save
```

### 📋 Handy PM2 Maintenance Commands:
- **View live server logs**: `pm2 logs worksuite-app`
- **Check application process list**: `pm2 status`
- **Restart application**: `pm2 restart worksuite-app`
- **Stop application**: `pm2 stop worksuite-app`

---

## 🌐 Step 7: Configuring Nginx Reverse Proxy

Now, let's configure Nginx to route all public web traffic incoming on port 80 to your Node.js application.

1. Erase the default placeholder server block:
   ```bash
   sudo rm -f /etc/nginx/sites-enabled/default
   ```

2. Open a custom file for your site config:
   ```bash
   sudo nano /etc/nginx/sites-available/worksuite
   ```

3. Paste the following configuration, swapping in your VPS IP `172.20.10.44`:
   ```nginx
   server {
       listen 80;
       server_name 172.20.10.44;

       # Maximize file uploads for task attachments (e.g., up to 32MB)
       client_max_body_size 32M;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           
           # Forward client headers
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

4. Link the configuration to activate it and test for syntax safety:
   ```bash
   sudo ln -s /etc/nginx/sites-available/worksuite /etc/nginx/sites-enabled/
   sudo nginx -t
   ```
   *(If it says `syntax is ok` and `test is successful`, you are safe to proceed)*

5. Restart Nginx to load the changes:
   ```bash
   sudo systemctl enable nginx
   sudo systemctl restart nginx
   ```

---

## 🛡️ Step 8: Firewall Rules Setup

Allow port 80 traffic (and secure port 443 if you add SSL certificates later) using Ubuntu's UFW firewall:

```bash
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 🏁 Verification & Troubleshooting

Now, open your favorite browser and visit your VPS IP:
👉 **`http://172.20.10.44`**

### 🔍 Quick Fixes & Diagnostics
1. **Can't connect / Connection timed out?**
   - Check if Nginx is active: `sudo systemctl status nginx`
   - Check if PM2 is running: `pm2 status`
   - Verify that your firewall is open: `sudo ufw status`

2. **Database Connection Errors?**
   - Verify your database service is online: `sudo systemctl status mysql`
   - Test login with your user: `mysql -u worksuite_user -p -D workmanager` (enter your configured password)
   - Ensure you spelled environment variables exactly correctly in your `.env` file.
   - Run `pm2 logs worksuite-app` to inspect the stack trace.
