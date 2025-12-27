# ☁️ Google Cloud Deployment Guide (100% Reliability)

If you want to ensure the bot NEVER sleeps and has the lowest possible latency, hosting on Google Cloud (GCP) is the best backup.

## 🚀 Option 1: Google Cloud Run (Easiest)

1. **Go to Cloud Run Console**: [https://console.cloud.google.com/run](https://console.cloud.google.com/run)
2. **Click "Create Service"**
3. **Source**: "Continuously deploy from a Git repository" (Connect your GitHub)
4. **Configuration**:
   - **Service name**: `stellar-sweep-bot`
   - **Region**: `us-east1` or `us-central1`
   - **Authentication**: "Allow unauthenticated invocations"
5. **Container, Networking, Security**:
   - **Capacity**: 512 MiB RAM, 1 CPU
   - **Variables**: Add all variables from `ENV_VARIABLES.txt`
   - **Cloud Run Execution Environment**: "Second generation" (Faster)
   - **CPU Allocation**: "CPU is always allocated" (CRITICAL: This prevents sleeping!)
6. **Click Create**

## 🚀 Option 2: Google Compute Engine (VPS - Most Reliable)

1. **Go to Compute Engine**: [https://console.cloud.google.com/compute](https://console.cloud.google.com/compute)
2. **Create Instance**:
   - **Name**: `stellar-sweep-bot`
   - **Machine type**: `e2-micro` (Free tier eligible!)
   - **OS**: `Ubuntu 22.04 LTS`
3. **SSH into the instance** and run:
   ```bash
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Clone your repo
   git clone https://github.com/yourusername/stellar-sweep-bot.git
   cd stellar-sweep-bot

   # Install dependencies
   npm install

   # Set up environment variables
   nano .env
   # (Paste your variables from ENV_VARIABLES.txt)

   # Install PM2 to keep it running forever
   sudo npm install -g pm2
   pm2 start server.js --name sweep-bot
   pm2 save
   pm2 startup
   ```

## 🎯 Why Google Cloud?

1. **No Cold Starts**: Unlike Render Free Tier, a VPS or Cloud Run (with always-on CPU) never sleeps.
2. **Static IP**: You can get a fixed IP address.
3. **Lower Latency**: Google's network is one of the fastest in the world.
4. **Reliability**: 99.99% uptime SLA.

## 💡 Recommendation

Keep **Render** as your primary dashboard, but run a second instance on **Google Cloud VPS** (e2-micro is FREE). Since the bot checks if the balance is already claimed, they won't conflict—the first one to trigger wins!
