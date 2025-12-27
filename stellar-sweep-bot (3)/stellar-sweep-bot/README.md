# Stellar Sweep Bot - Pi Network Edition

Automated claimable balance sweep bot with millisecond-precision timing for Pi Network (Stellar-based).

## 🎯 Features

- **Precision Timing**: Executes 100ms before unlock time using spin-wait for microsecond accuracy
- **Fee-Bump Transactions**: Fee payer covers all costs, source account needs no XLM
- **Competitive Fees**: Automatically uses network P99 fees × 10 for priority
- **Web Dashboard**: Monitor status and control bot via web interface
- **REST API**: Full API for integration and automation
- **Automatic Retry**: Built-in retry logic with fee escalation

## 📊 Configuration

### Account Information
- **Source Account**: `GBWBVGZE5TIDKYJPOGT7STXQZNSPXGR5ZYC2PXGGV3CCOY6A5IPE5KQN`
- **Fee Payer Account**: `GBYREOB536LFKXSK6WZYOTKYXVARBKN7IF63Q5COOJ2TGRF4WPLN7EZZ`
- **Destination**: `MD5HGPHVL73EBDUD2Z4K2VDRLUBC4FFN7GOBLKPK6OPPXH6TED4TQAAAAGMU2T4A4QT5Y`

### Claimable Balance
- **Amount**: 609.8364137 XLM
- **Balance ID**: `00000000a0a575e408edf3e491c02b4dcde164716d6893ebd591b305330040cb9a9d0459`
- **Unlock Time**: 2025-12-27T09:18:54Z
- **Unix Timestamp**: 1766827134

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Check account and balances
npm run check

# Test bot (without executing)
node test-bot.js

# Start web server
npm start

# Run bot directly
npm run bot
```

### Environment Variables

Create a `.env` file with your configuration (see `.env.example`):

```bash
SOURCE_SECRET=your_source_secret_key
FEE_PAYER_SECRET=your_fee_payer_secret_key
DESTINATION_ACCOUNT=your_destination_account
UNLOCK_TIMESTAMP=1766827134
BALANCE_ID=your_balance_id
```

## 🌐 Deploy to Render

### Step 1: Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New +** → **Web Service**
3. Connect your Git repository or upload this code
4. Configure:
   - **Name**: stellar-sweep-bot
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free or Starter

### Step 2: Set Environment Variables

In Render dashboard, go to **Environment** and add:

```
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

### Step 3: Deploy

1. Click **Create Web Service**
2. Wait for deployment to complete
3. Access your bot at: `https://your-service-name.onrender.com`

### Step 4: Start Bot

Once deployed, you can:

1. **Via Web Dashboard**: Visit your Render URL and click "Start Bot"
2. **Via API**: 
   ```bash
   curl -X POST https://your-service-name.onrender.com/api/bot/start
   ```

## 📡 API Endpoints

### Health Check
```bash
GET /api/health
```

### Get Bot Status
```bash
GET /api/bot/status
```

### Start Bot
```bash
POST /api/bot/start
```

### Execute Immediately
```bash
POST /api/bot/execute
```

### Stop Bot
```bash
POST /api/bot/stop
```

### Get Account Info
```bash
GET /api/account/info
```

### Get Claimable Balances
```bash
GET /api/claimable-balances
```

## ⚙️ Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `TRIGGER_OFFSET_MS` | 100 | Execute N milliseconds before unlock time |
| `BASE_FEE` | 100 | Base fee in stroops |
| `FEE_MULTIPLIER` | 10 | Multiply network P99 fee by this amount |
| `PORT` | 5000 | Server port |

## 🔒 Security Notes

- **NEVER commit `.env` file** to version control
- Store secrets securely in Render environment variables
- Use separate fee payer account for safety
- Monitor fee payer balance to ensure sufficient funds

## 📊 Execution Flow

1. **Initialize**: Verify accounts and claimable balances
2. **Schedule**: Calculate exact trigger time (unlock - 100ms)
3. **Monitor**: Use cron for countdown, switch to precision timer at 60s
4. **Trigger**: Fire at exact time with spin-wait for final milliseconds
5. **Build**: Create claim transaction with competitive fees
6. **Wrap**: Build fee-bump transaction signed by fee payer
7. **Submit**: Send to network with retry logic
8. **Verify**: Confirm transaction success and log results

## 🐛 Troubleshooting

### Bot won't start
- Check all environment variables are set
- Verify accounts exist on Pi Network
- Ensure fee payer has sufficient XLM balance

### Transaction fails
- Check if unlock time has passed
- Verify claimable balance still exists
- Increase `FEE_MULTIPLIER` for higher priority

### Timing issues
- Render free tier may have cold starts (15-30s delay)
- Consider using paid tier for critical timing
- Test with `TRIGGER_OFFSET_MS=5000` (5 seconds) for safety margin

## 📝 License

MIT License - Use at your own risk

## ⚠️ Disclaimer

This bot interacts with real blockchain transactions. Test thoroughly before use. No warranty provided.
