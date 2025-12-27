# 🚀 Quick Start - Deploy in 5 Minutes

## What You Have

✅ **Claimable Balance**: 609.8364137 XLM  
✅ **Unlock Time**: 2025-12-27 09:18:54 UTC (Unix: 1766827134)  
✅ **Time Until Unlock**: ~14 hours 44 minutes  
✅ **All Tests Passed**: Bot verified and ready  

## Deploy to Render NOW

### Step 1: Go to Render (30 seconds)
1. Open [https://dashboard.render.com/](https://dashboard.render.com/)
2. Sign up or log in (free account)
3. Click **New +** → **Web Service**

### Step 2: Upload Code (1 minute)
1. Choose **"Public Git repository"** 
2. Or click **"Deploy from GitHub"** if you pushed to GitHub
3. Or upload the `stellar-sweep-bot.zip` file

### Step 3: Configure (2 minutes)
- **Name**: `stellar-sweep-bot`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: `Free` (or `Starter` for better timing)

### Step 4: Add Environment Variables (2 minutes)

Click **Advanced** → **Add Environment Variable**

Copy-paste each line (name = value):

```
SOURCE_SECRET = SBPKN6UH7QQLC37MIIYHFP2K4OAQAYFNSZC4ZQFJVA5RQ4VABV22O4FD
FEE_PAYER_SECRET = SD644ZM7YLXZE3HZZUKGSJC3R45PMM6LPP5CCO2UIIUW6STRJCVJ4XJR
DESTINATION_ACCOUNT = MD5HGPHVL73EBDUD2Z4K2VDRLUBC4FFN7GOBLKPK6OPPXH6TED4TQAAAAGMU2T4A4QT5Y
UNLOCK_TIMESTAMP = 1766827134
BALANCE_ID = 00000000a0a575e408edf3e491c02b4dcde164716d6893ebd591b305330040cb9a9d0459
PI_HORIZON_URL = https://api.mainnet.minepi.com
PI_NETWORK_PASSPHRASE = Pi Network
TRIGGER_OFFSET_MS = 100
BASE_FEE = 100
FEE_MULTIPLIER = 10
PORT = 5000
```

**Important**: Mark `SOURCE_SECRET` and `FEE_PAYER_SECRET` as **secret** (lock icon)

### Step 5: Deploy (30 seconds)
1. Click **Create Web Service**
2. Wait for build to complete (2-3 minutes)
3. You'll get a URL like: `https://stellar-sweep-bot-xxxx.onrender.com`

### Step 6: Start Bot (10 seconds)
1. Visit your Render URL
2. Click **"Start Bot"** button
3. Bot will schedule execution for unlock time

## Done! 🎉

Your bot is now live and will automatically execute at:
- **2025-12-27 09:18:53.900 UTC** (100ms before unlock)

## Monitor Status

Visit your Render URL to see:
- Current bot status
- Time remaining until execution
- Account balances
- Real-time logs

Or check via API:
```bash
curl https://your-url.onrender.com/api/bot/status
```

## ⚠️ Important for Free Tier Users

Render free tier sleeps after 15 minutes of inactivity. To keep it awake:

1. Use [UptimeRobot](https://uptimerobot.com/) (free)
2. Monitor: `https://your-url.onrender.com/api/health`
3. Interval: Every 10 minutes
4. Start 1 hour before unlock time

**Or upgrade to Starter plan ($7/mo) for guaranteed uptime**

## Alternative: Run on Your PC

If you prefer to run locally:

1. Extract `stellar-sweep-bot.zip`
2. Open terminal in extracted folder
3. Run:
   ```bash
   npm install
   npm start
   ```
4. Visit `http://localhost:5000`
5. Click "Start Bot"

## Need Help?

- Check `README.md` for full documentation
- Check `DEPLOYMENT.md` for detailed instructions
- Check `ENV_VARIABLES.txt` for environment variable formats
- View Render logs for real-time debugging

---

**You're all set! The bot will claim your 609.84 XLM automatically at unlock time.** 🚀
