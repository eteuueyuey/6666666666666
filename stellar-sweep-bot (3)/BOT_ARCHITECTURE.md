# Stellar Sweep Bot - Complete Architecture & Implementation Details

## 🏗️ BOT ARCHITECTURE

### Core Components

#### 1. **sweep-bot.js** - Main Bot Logic
- **Purpose**: Core sweep bot with precision timing and transaction execution
- **Key Features**:
  - Millisecond-precision scheduling (100ms before unlock)
  - Fee-bump transaction builder
  - Automatic retry with fee escalation
  - Spin-wait for exact timing
  
**How It Works**:
1. Initializes with Stellar SDK for Pi Network
2. Verifies source account and fee payer account
3. Fetches claimable balance from Horizon API
4. Calculates optimal fees (network P99 × 10 multiplier)
5. Schedules execution based on unlock timestamp
6. Uses cron for countdown (>60s remaining)
7. Switches to precision timer (<60s remaining)
8. Spin-waits for final milliseconds
9. Builds inner transaction (ClaimClaimableBalance operation)
10. Wraps in fee-bump transaction signed by fee payer
11. Submits to Pi Network Horizon API
12. Retries with higher fees if needed

**Key Methods**:
- `initialize()` - Verifies accounts and balances
- `buildClaimTransaction()` - Builds fee-bump wrapped claim transaction
- `submitTransaction()` - Submits to network with timeout
- `executeClaim()` - Main execution flow
- `scheduleExecution()` - Sets up timing
- `schedulePrecisionTimer()` - Millisecond-accurate timer

#### 2. **server.js** - Express API Server
- **Purpose**: Web server with REST API and dashboard
- **Endpoints**:
  - `GET /api/health` - Health check
  - `GET /api/bot/status` - Get bot status (fixed circular reference bug)
  - `POST /api/bot/start` - Initialize and schedule bot
  - `POST /api/bot/execute` - Execute immediately
  - `POST /api/bot/stop` - Stop bot
  - `GET /api/account/info` - Get account details
  - `GET /api/claimable-balances` - List claimable balances
  - `GET /` - Web dashboard UI

**How It Works**:
1. Creates Express app on port 5000 (or $PORT)
2. Maintains singleton bot instance
3. Serves HTML dashboard with real-time status
4. Auto-refreshes status every 5 seconds
5. Handles graceful shutdown on SIGINT/SIGTERM

#### 3. **check-account.js** - Verification Utility
- **Purpose**: Verify accounts and find claimable balances
- **What It Does**:
  - Derives public keys from secret keys
  - Connects to Pi Network Horizon API
  - Fetches account balances
  - Lists all claimable balances
  - Parses unlock times from predicates
  - Calculates time remaining

#### 4. **test-bot.js** - Testing Script
- **Purpose**: Verify bot functionality without executing
- **Tests**:
  1. Bot initialization
  2. Account verification
  3. Status retrieval
  4. Transaction building (without submitting)
  5. Timing configuration

### Configuration

**Environment Variables**:
```
SOURCE_SECRET - Secret key of account with claimable balance
FEE_PAYER_SECRET - Secret key of account paying transaction fees
DESTINATION_ACCOUNT - Where claimed funds go (muxed account supported)
UNLOCK_TIMESTAMP - Unix timestamp when balance unlocks (1766827134)
BALANCE_ID - Specific balance ID to claim
PI_HORIZON_URL - Pi Network Horizon API (https://api.mainnet.minepi.com)
PI_NETWORK_PASSPHRASE - Network passphrase (Pi Network)
TRIGGER_OFFSET_MS - Execute N ms before unlock (default: 100)
BASE_FEE - Base fee in stroops (default: 100)
FEE_MULTIPLIER - Fee multiplier for priority (default: 10)
PORT - Server port (default: 5000)
```

### Timing Architecture

**Countdown System**:
```
Time > 60s: Cron scheduler (checks every 10 seconds)
Time ≤ 60s: Precision timer (setTimeout)
Time ≤ 10s: Countdown display (every second)
Time = 100ms before: Trigger execution
Time = 0-100ms: Spin-wait (busy loop for exact timing)
```

**Why This Design?**:
- Cron is efficient for long waits
- setTimeout is accurate for short waits
- Spin-wait ensures microsecond precision
- 100ms offset accounts for network latency

### Transaction Flow

**Fee-Bump Architecture**:
```
Inner Transaction (signed by source account):
  - Operation: ClaimClaimableBalance
  - Fee: P99 × 10 (competitive priority)
  - Source: GBWBVGZE5TIDKYJPOGT7STXQZNSPXGR5ZYC2PXGGV3CCOY6A5IPE5KQN
  
Fee-Bump Transaction (signed by fee payer):
  - Wraps inner transaction
  - Fee: 2× inner fee (minimum requirement)
  - Fee Payer: GBYREOB536LFKXSK6WZYOTKYXVARBKN7IF63Q5COOJ2TGRF4WPLN7EZZ
  - Total Fee: ~0.2 XLM
```

**Why Fee-Bump?**:
- Source account doesn't need XLM for fees
- Fee payer covers all costs
- Allows competitive fee without touching source balance
- Can claim entire balance minus base reserve

### Error Handling

**Retry Logic**:
1. First attempt with calculated fee
2. If `tx_insufficient_fee`: Rebuild with 2× fee
3. If network error: Wait 500ms × attempt number
4. Maximum 3 attempts
5. Log failure and return error

**Circular Reference Fix**:
- Node.js Timeout objects can't be JSON serialized
- Server now filters out `scheduledTask` and `precisionTimer`
- Replaces with string 'active' or null
- Prevents "Converting circular structure to JSON" error

## 📊 CURRENT CONFIGURATION

**Accounts**:
- Source: GBWBVGZE5TIDKYJPOGT7STXQZNSPXGR5ZYC2PXGGV3CCOY6A5IPE5KQN (1.0 XLM)
- Fee Payer: GBYREOB536LFKXSK6WZYOTKYXVARBKN7IF63Q5COOJ2TGRF4WPLN7EZZ (0.99 XLM)
- Destination: MD5HGPHVL73EBDUD2Z4K2VDRLUBC4FFN7GOBLKPK6OPPXH6TED4TQAAAAGMU2T4A4QT5Y

**Claimable Balance**:
- Amount: 609.8364137 XLM
- Balance ID: 00000000a0a575e408edf3e491c02b4dcde164716d6893ebd591b305330040cb9a9d0459
- Unlock Time: 2025-12-27 09:18:54 UTC
- Unix Timestamp: 1766827134

**Timing**:
- Trigger: 2025-12-27 09:18:53.900 UTC (100ms before unlock)
- Time Remaining: ~14 hours (as of 2025-12-26 19:00 UTC)

## 🚨 CURRENT ISSUES & FIXES

### Issue 1: Circular JSON Error ✅ FIXED
**Problem**: `TypeError: Converting circular structure to JSON`
**Cause**: `scheduledTask` and `precisionTimer` are Node.js Timeout objects
**Fix**: Filter these objects in `/api/bot/status` endpoint
**Status**: Fixed in latest server.js

### Issue 2: Render Deployment
**Problem**: Need to deploy updated code to Render
**Solution**: Re-upload zip file or push to GitHub

## 🔧 RENDER DEPLOYMENT CONSIDERATIONS

### Free Tier Limitations
1. **Cold Start**: Service sleeps after 15 minutes of inactivity
2. **Startup Time**: 15-30 seconds to wake up from sleep
3. **Impact**: Could miss exact timing if service is asleep

### Solutions for Free Tier

**Option 1: Keep Service Warm**
- Use UptimeRobot (free service)
- Ping `/api/health` every 10 minutes
- Start monitoring 2 hours before unlock time
- URL: https://uptimerobot.com/

**Option 2: Increase Safety Margin**
- Change `TRIGGER_OFFSET_MS` from 100 to 5000 (5 seconds)
- Gives time for cold start if service is asleep
- Trade-off: Less competitive timing

**Option 3: Upgrade to Starter Plan**
- Cost: $7/month
- No cold starts
- Guaranteed uptime
- Recommended for critical timing

### Render Configuration

**Build Command**: `npm install`
**Start Command**: `npm start`
**Health Check Path**: `/api/health`
**Port**: Use `$PORT` (Render provides this)

**Environment Variables** (must be set in Render dashboard):
```
SOURCE_SECRET = SBPKN6UH7QQLC37MIIYHFP2K4OAQAYFNSZC4ZQFJVA5RQ4VABV22O4FD
FEE_PAYER_SECRET = SD644ZM7YLXZE3HZZUKGSJC3R45PMM6LPP5CCO2UIIUW6STRJCVJ4XJR
DESTINATION_ACCOUNT = MD5HGPHVL73EBDUD2Z4K2VDRLUBC4FFN7GOBLKPK6OPPXH6TED4TQAAAAGMU2T4A4QT5Y
UNLOCK_TIMESTAMP = 1766827134
BALANCE_ID = 00000000a0a575e408edf3e491c02b4dcde164716d6893ebd591b305330040cb9a9d0459
PI_HORIZON_URL = https://api.mainnet.minepi.com
PI_NETWORK_PASSPHRASE = Pi Network
TRIGGER_OFFSET_MS = 100 (or 5000 for free tier safety)
BASE_FEE = 100
FEE_MULTIPLIER = 10
PORT = 5000
```

## 🎯 OPTIMIZATION OPPORTUNITIES

### 1. Timing Precision
**Current**: 100ms offset with spin-wait
**Improvement**: Could use `process.hrtime()` for nanosecond precision
**Trade-off**: More CPU usage during spin-wait

### 2. Fee Strategy
**Current**: P99 × 10 (very competitive)
**Alternatives**:
- P99 × 5 (moderate priority, lower cost)
- P99 × 20 (maximum priority, higher cost)
**Recommendation**: Keep at 10× for balance of cost and priority

### 3. Network Resilience
**Current**: Single Horizon endpoint
**Improvement**: Fallback to multiple Horizon servers
**Implementation**: Array of Horizon URLs, try next on failure

### 4. Pre-Signing
**Current**: Builds transaction at execution time
**Alternative**: Pre-sign transaction, submit at exact time
**Trade-off**: Sequence number must be exact, less flexible

### 5. Monitoring
**Current**: Logs to console
**Improvement**: Send status to external monitoring service
**Options**: Sentry, LogDNA, custom webhook

## 📈 PERFORMANCE METRICS

**Expected Execution Time**:
- Transaction Build: 50-100ms
- Network Submission: 100-300ms
- Total: 150-400ms

**Success Criteria**:
- Transaction submitted within 500ms of unlock time
- Transaction confirmed in ledger
- Funds transferred to destination account

## 🔐 SECURITY CONSIDERATIONS

1. **Secret Keys**: Never commit to Git, use environment variables
2. **Fee Payer Separation**: Limits exposure if source key is compromised
3. **Muxed Destination**: Supports exchange deposits with memo
4. **HTTPS Only**: All API calls use TLS encryption
5. **No Key Logging**: Secret keys never logged to console

## 📝 TESTING CHECKLIST

✅ Account verification (both accounts exist)
✅ Claimable balance detection (609.84 XLM found)
✅ Transaction building (inner + fee-bump)
✅ Timing calculation (correct Unix timestamp)
✅ Fee calculation (P99 × 10)
✅ JSON serialization (circular reference fixed)
❓ Render deployment (needs re-deploy with fix)
❓ Cold start handling (needs UptimeRobot or upgrade)
❓ Actual execution (will happen at unlock time)

## 🚀 DEPLOYMENT STEPS

1. Fix circular JSON error ✅ DONE
2. Update zip file ✅ DONE
3. Upload to Render (manual or GitHub)
4. Set environment variables in Render
5. Deploy service
6. Test `/api/health` endpoint
7. Test `/api/bot/status` endpoint (should work now)
8. Call `/api/bot/start` to schedule execution
9. Set up UptimeRobot monitoring (if free tier)
10. Monitor logs as unlock time approaches

## 📞 TROUBLESHOOTING GUIDE

**Service Won't Start**:
- Check Render logs for errors
- Verify all environment variables are set
- Ensure `PORT` is set to 5000 or use `$PORT`

**Status Endpoint Errors**:
- Should be fixed with circular reference patch
- If still errors, check bot initialization

**Bot Won't Schedule**:
- Verify `UNLOCK_TIMESTAMP` is in the future
- Check if accounts have sufficient balance
- Ensure claimable balance exists

**Transaction Fails**:
- Increase `FEE_MULTIPLIER` to 20 or 50
- Check if unlock time has actually passed
- Verify balance hasn't been claimed by someone else

**Cold Start Issues**:
- Set up UptimeRobot to ping every 10 minutes
- Or increase `TRIGGER_OFFSET_MS` to 5000-10000
- Or upgrade to Starter plan

## 🎉 SUCCESS INDICATORS

When everything works correctly, you'll see:

```
🚀 Stellar Sweep Bot Server running on port 5000
🤖 Stellar Sweep Bot Initialized
📅 Scheduling execution for 2025-12-27T09:18:54.000Z
⏳ Using cron scheduler for countdown...
⏰ Switching to precision timer...
🎯 Precision timer set: 60000ms until trigger
   ⏱️  10.000s until execution...
   ⏱️  9.000s until execution...
   ...
🎯 Precision trigger fired (drift: 2ms)
🚀 EXECUTING CLAIM...
🔨 Building claim transaction...
✅ Inner transaction built and signed
✅ Fee-bump transaction built and signed
📤 Submitting transaction to network...
✅ Transaction submitted successfully in 234ms
   Hash: [transaction_hash]
   Ledger: [ledger_number]
✅ CLAIM COMPLETED SUCCESSFULLY
```

And 609.8364137 XLM will be in your destination account!
