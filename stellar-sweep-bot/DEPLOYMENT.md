# Deployment Guide for Render

## 📦 Pre-Deployment Checklist

✅ All tests passed locally  
✅ Claimable balance verified: 609.8364137 XLM  
✅ Unlock timestamp: 1766827134 (2025-12-27T09:18:54Z)  
✅ Fee payer has sufficient balance: 0.99 XLM  

## 🚀 Deploy to Render (Step-by-Step)

### Option 1: Deploy from ZIP (Recommended for Quick Start)

1. **Upload ZIP to Render**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click **New +** → **Web Service**
   - Choose **Public Git repository** or **Upload ZIP**
   - If uploading ZIP, drag and drop `stellar-sweep-bot.zip`

2. **Configure Service**
   - **Name**: `stellar-sweep-bot` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose closest to you (or `Oregon (US West)` for low latency)
   - **Branch**: `main` (if using Git)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (or `Starter` for better performance)

3. **Add Environment Variables**
   
   Click **Advanced** → **Add Environment Variable** and add each of these:

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

   **Important**: Mark `SOURCE_SECRET` and `FEE_PAYER_SECRET` as **secret** (click the lock icon)

4. **Deploy**
   - Click **Create Web Service**
   - Wait 2-3 minutes for deployment
   - You'll see build logs in real-time
   - Once deployed, you'll get a URL like: `https://stellar-sweep-bot-xxxx.onrender.com`

5. **Verify Deployment**
   - Visit your Render URL
   - You should see the bot dashboard
   - Check status shows "idle" or "preparing"

6. **Start the Bot**
   - Click **"Start Bot"** button on dashboard
   - Or use API: `curl -X POST https://your-url.onrender.com/api/bot/start`
   - Bot will schedule execution for unlock time

### Option 2: Deploy from GitHub

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/stellar-sweep-bot.git
   git push -u origin main
   ```

2. **Connect to Render**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click **New +** → **Web Service**
   - Connect your GitHub account
   - Select your repository
   - Follow steps 2-6 from Option 1

## ⚙️ Configuration for Your Controlled PC

If you want to paste environment variables on your controlled PC, use this exact format:

### For Windows (PowerShell)
```powershell
$env:SOURCE_SECRET="SBPKN6UH7QQLC37MIIYHFP2K4OAQAYFNSZC4ZQFJVA5RQ4VABV22O4FD"
$env:FEE_PAYER_SECRET="SD644ZM7YLXZE3HZZUKGSJC3R45PMM6LPP5CCO2UIIUW6STRJCVJ4XJR"
$env:DESTINATION_ACCOUNT="MD5HGPHVL73EBDUD2Z4K2VDRLUBC4FFN7GOBLKPK6OPPXH6TED4TQAAAAGMU2T4A4QT5Y"
$env:UNLOCK_TIMESTAMP="1766827134"
$env:BALANCE_ID="00000000a0a575e408edf3e491c02b4dcde164716d6893ebd591b305330040cb9a9d0459"
$env:PI_HORIZON_URL="https://api.mainnet.minepi.com"
$env:PI_NETWORK_PASSPHRASE="Pi Network"
$env:TRIGGER_OFFSET_MS="100"
$env:BASE_FEE="100"
$env:FEE_MULTIPLIER="10"
$env:PORT="5000"
```

### For Linux/Mac (Bash)
```bash
export SOURCE_SECRET="SBPKN6UH7QQLC37MIIYHFP2K4OAQAYFNSZC4ZQFJVA5RQ4VABV22O4FD"
export FEE_PAYER_SECRET="SD644ZM7YLXZE3HZZUKGSJC3R45PMM6LPP5CCO2UIIUW6STRJCVJ4XJR"
export DESTINATION_ACCOUNT="MD5HGPHVL73EBDUD2Z4K2VDRLUBC4FFN7GOBLKPK6OPPXH6TED4TQAAAAGMU2T4A4QT5Y"
export UNLOCK_TIMESTAMP="1766827134"
export BALANCE_ID="00000000a0a575e408edf3e491c02b4dcde164716d6893ebd591b305330040cb9a9d0459"
export PI_HORIZON_URL="https://api.mainnet.minepi.com"
export PI_NETWORK_PASSPHRASE="Pi Network"
export TRIGGER_OFFSET_MS="100"
export BASE_FEE="100"
export FEE_MULTIPLIER="10"
export PORT="5000"
```

### Or Create .env File
```bash
SOURCE_SECRET=SBPKN6UH7QQLC37MIIYHFP2K4OAQAYFNSZC4ZQFJVA5RQ4VABV22O4FD
FEE_PAYER_SECRET=SD644ZM7YLXZE3HZZUKGSJC3R45PMM6LPP5CCO2UIIUW6STRJCVJ4XJR
DESTINATION_ACCOUNT=MD5HGPHVL73EBDUD2Z4K2VDRLUBC4FFN7GOBLKPK6OPPXH6TED4TQAAAAGMU2T4A4QT5Y
UNLOCK_TIMESTAMP=1766827134
BALANCE_ID=00000000a0a575e408edf3e491c02b4dcde164716d6893ebd591b305330040cb9a9d0459
PI_HORIZON_URL=https://api.mainnet.minepi.com
PI_NETWORK_PASSPHRASE=Pi Network
TRIGGER_OFFSET_MS=100
BASE_FEE=100
FEE_MULTIPLIER=10
PORT=5000
```

Then run:
```bash
npm install
npm start
```

## 🎯 Execution Timeline

- **Current Time**: 2025-12-26T18:34:50Z
- **Unlock Time**: 2025-12-27T09:18:54Z
- **Time Remaining**: ~14 hours 44 minutes
- **Trigger Time**: 2025-12-27T09:18:53.900Z (100ms before unlock)

## 🔍 Monitoring

### Check Bot Status
```bash
curl https://your-url.onrender.com/api/bot/status
```

### View Logs in Render
1. Go to your service in Render dashboard
2. Click **Logs** tab
3. Watch real-time execution logs

### Expected Log Output
```
🤖 Stellar Sweep Bot Initialized
   Source Account: GBWBVGZE5TIDKYJPOGT7STXQZNSPXGR5ZYC2PXGGV3CCOY6A5IPE5KQN
   Fee Payer: GBYREOB536LFKXSK6WZYOTKYXVARBKN7IF63Q5COOJ2TGRF4WPLN7EZZ
   Destination: MD5HGPHVL73EBDUD2Z4K2VDRLUBC4FFN7GOBLKPK6OPPXH6TED4TQAAAAGMU2T4A4QT5Y
   Unlock Time: 2025-12-27T09:18:54.000Z

📅 Scheduling execution for 2025-12-27T09:18:54.000Z
   Time remaining: 14h 44m 4s
   Will trigger 100ms before unlock time

⏳ Using cron scheduler for countdown...
   ⏳ 14h 44m remaining...
   ⏳ 13h 44m remaining...
   ...
⏰ Switching to precision timer...
🎯 Precision timer set: 60000ms until trigger
   ⏱️  10.000s until execution...
   ⏱️  9.000s until execution...
   ...
🎯 Precision trigger fired (drift: 2ms)
   Spin-waiting final 98ms...

🚀 EXECUTING CLAIM...
🔨 Building claim transaction...
   Fee stats: { p99: '100000' }
   Inner TX fee: 1000000 stroops (0.1 XLM)
✅ Inner transaction built and signed
   Fee-bump fee: 2000000 stroops (0.2 XLM)
✅ Fee-bump transaction built and signed

📤 Submitting transaction to network...
✅ Transaction submitted successfully in 234ms
   Hash: abc123...
   Ledger: 7435200

✅ CLAIM COMPLETED SUCCESSFULLY
```

## ⚠️ Important Notes

### Render Free Tier Limitations
- **Cold Start**: Service sleeps after 15 min of inactivity
- **Startup Time**: Can take 15-30 seconds to wake up
- **Recommendation**: Use **Starter plan ($7/mo)** for critical timing
- **Or**: Keep service warm by pinging `/api/health` every 10 minutes

### Keep Service Warm (Free Tier)
Use a service like [UptimeRobot](https://uptimerobot.com/) or [Cron-Job.org](https://cron-job.org/):
- Monitor URL: `https://your-url.onrender.com/api/health`
- Interval: Every 10 minutes
- Start monitoring 1 hour before unlock time

### Timing Safety
- Default `TRIGGER_OFFSET_MS=100` (100ms before unlock)
- For Render free tier, consider `TRIGGER_OFFSET_MS=5000` (5 seconds before)
- This accounts for potential cold start delays

## 🐛 Troubleshooting

### Service Won't Start
- Check Render logs for errors
- Verify all environment variables are set
- Ensure `PORT` is set to `5000` or use Render's `$PORT`

### Bot Shows "Error" Phase
- Check if accounts exist: `GET /api/account/info`
- Verify claimable balance: `GET /api/claimable-balances`
- Check fee payer has sufficient XLM

### Transaction Fails
- Increase `FEE_MULTIPLIER` to 20 or 50
- Check if unlock time has actually passed
- Verify balance hasn't been claimed by someone else

### Cold Start Issues (Free Tier)
1. **Solution 1**: Upgrade to Starter plan
2. **Solution 2**: Use UptimeRobot to keep warm
3. **Solution 3**: Increase `TRIGGER_OFFSET_MS` to 10000 (10 seconds)

## 📞 Support

If you encounter issues:
1. Check Render logs first
2. Test locally with `npm run check`
3. Verify accounts on Pi Network explorer
4. Check transaction on Stellar explorer after execution

## ✅ Post-Execution

After successful execution:
1. Check transaction hash on Pi Network explorer
2. Verify funds arrived at destination account
3. Review logs for performance metrics
4. Consider stopping service if no longer needed

---

**Ready to deploy? Follow the steps above and your bot will be live in minutes!** 🚀
