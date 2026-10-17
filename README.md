# 🎯 Amazon Warehouse Hunter (v2.0)

Automated Amazon Warehouse Resale & Deep Discount Scanner with **24/7 Autonomous Watchlist Sniping**, persistent SQLite/JSON database, and automatic Docker updates via **GitHub Actions + Watchtower**.

---

## 🚀 Features

- **Store Mode Selector**: Amazon Warehouse (Open-box/Used) vs Normal Amazon (Brand New) vs Both Combined.
- **Deep Discount Sliders & Presets**: Target 60%–90%, 70%–95%, 80%+ mega-steals.
- **Fintech-Grade Price Filter**: Min & Max numeric bounds with dynamic currency tags (`A$`, `$`, `¥`, `£`, `€`) and quick presets (`< $50`, `$50–$200`, etc.).
- **Spam & Junk Blocker**: One-click accessory blocker with Amazon native `-term` query exclusion (`-case -cover -strap -cable`).
- **Warehouse Condition Filter**: Filter by *Used - Like New (Open Box / Mint)*, *Used - Very Good*, *Used - Good*, *Used - Acceptable*.
- **1-Click Deal Verification**:
  - 🐫 **CamelCamelCamel** price history chart.
  - 📊 **Keepa** interactive price charts.
  - 🦘 **OzBargain** community sentiment & deal history.
- **24/7 Autonomous Sniper Daemon**:
  - Scans Amazon Warehouse in the background every 10 minutes even when all browser tabs are closed.
  - Sends immediate push notifications to **Discord** or **Telegram** when a target price is matched.
- **Multi-Device Sync**: Server-side database (`/app/data/database.json`) syncs targets, sniped items, and saved deals across all your phones, laptops, and PCs.
- **Zero-Touch Auto-Updates**: Powered by **GitHub Actions** and **Watchtower**.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js 20 LTS (Alpine Linux container)
- **Web Server**: Express.js
- **Scraper Engine**: High-fidelity Headless DOM Renderer (`chromium-browser --headless=new --dump-dom`) with Cheerio HTML parsing (bypasses bot challenges)
- **Persistence**: Atomic JSON/SQLite database volume mounted at `/app/data`
- **Automation & CD**: GitHub Actions (`.github/workflows/docker-publish.yml`) + Watchtower

---

## 📦 Deploying on TrueNAS / Linux Server with Docker Compose

### Step 1: Push Code to Your GitHub Repository
1. In your GitHub account, the repository is created at: `https://github.com/nirajtimila/amazon.git`.
2. Push this project code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Amazon Warehouse Hunter v2.0"
   git branch -M main
   git remote add origin https://github.com/nirajtimila/amazon.git
   git push -u origin main
   ```
3. GitHub Actions will automatically trigger and build your Docker container to GitHub Container Registry (`ghcr.io/nirajtimila/amazon:latest`).

### Step 2: Make the GitHub Package Public (One-Time Setup)
1. Go to your GitHub profile -> **Packages** -> Click `amazon`.
2. Under **Package settings**, change visibility to **Public** so your TrueNAS server can pull it freely without login tokens.

### Step 3: Run with Docker Compose on TrueNAS
On TrueNAS SCALE (or any Linux server/VPS):

1. Create a directory:
   ```bash
   mkdir -p /mnt/pool/apps/warehouse-hunter
   cd /mnt/pool/apps/warehouse-hunter
   ```
2. Save this `docker-compose.yml`:
   ```yaml
   version: '3.8'

   services:
     warehouse-hunter:
       image: ghcr.io/nirajtimila/amazon:latest
       container_name: warehouse-hunter
       restart: unless-stopped
       ports:
         - "3000:3000"
       volumes:
         # Persistent database volume (preserves your targets, saved deals, and settings)
         - ./data:/app/data
       environment:
         - PORT=3000
         - NODE_ENV=production
         # Optional Phone Alerts (Uncomment and fill to receive alerts)
         # - DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
         # - TELEGRAM_BOT_TOKEN=123456789:ABC...
         # - TELEGRAM_CHAT_ID=-100123456789
       labels:
         - "com.centurylinklabs.watchtower.enable=true"

     watchtower:
       image: containrrr/watchtower:latest
       container_name: warehouse-watchtower
       restart: unless-stopped
       volumes:
         - /var/run/docker.sock:/var/run/docker.sock
       environment:
         - WATCHTOWER_CLEANUP=true
         - WATCHTOWER_POLL_INTERVAL=300
         - WATCHTOWER_LABEL_ENABLE=true
   ```
3. Launch the containers:
   ```bash
   docker compose up -d
   ```
4. Access the web dashboard at: `http://YOUR_TRUENAS_IP:3000`.

---

## 🔄 How the Auto-Update Works (100% Zero-Touch)

Whenever you edit any file or improve features:

```bash
git add .
git commit -m "Updated search filters"
git push origin main
```

1. **GitHub Actions** compiles and publishes the new Docker image in ~60 seconds.
2. **Watchtower** on your TrueNAS server checks every 5 minutes (`WATCHTOWER_POLL_INTERVAL=300`), detects the new image, gracefully replaces the container, and deletes the old image.
3. Your database in `./data` is untouched, so you never lose your watchlist or saved deals!

---

## 🔔 Setting Up Instant Phone Alerts (Optional)

### Discord Webhook
1. In your Discord server, right-click any channel -> **Edit Channel** -> **Integrations** -> **Webhooks** -> **New Webhook**.
2. Copy the Webhook URL and paste it into `DISCORD_WEBHOOK_URL` in `docker-compose.yml` (or in the dashboard settings).

### Telegram Bot
1. Chat with `@BotFather` on Telegram and create a new bot to receive your `TELEGRAM_BOT_TOKEN`.
2. Add your bot to a group or chat, and obtain your `TELEGRAM_CHAT_ID`.
3. Add both to `docker-compose.yml`.

---

## 💻 Local Development (Windows / Mac / Linux)

```bash
# Install dependencies
npm install

# Run server
npm start
```

Visit [http://localhost:3000](http://localhost:3000).
