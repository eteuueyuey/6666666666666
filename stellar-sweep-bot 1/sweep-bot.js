const StellarSdk = require('stellar-sdk');
const cron = require('node-cron');
require('dotenv').config();

// Configuration from environment variables
const SOURCE_SECRET = process.env.SOURCE_SECRET;
const FEE_PAYER_SECRET = process.env.FEE_PAYER_SECRET;
const DESTINATION_ACCOUNT = process.env.DESTINATION_ACCOUNT;
const UNLOCK_TIMESTAMP = parseInt(process.env.UNLOCK_TIMESTAMP);
const BALANCE_ID = process.env.BALANCE_ID;

// Pi Network configuration
const PI_HORIZON_URLS = [
  process.env.PI_HORIZON_URL || 'https://api.mainnet.minepi.com',
  'https://horizon.pi-blockchain.net',
  'https://api.pi-network.com'
];
const PI_NETWORK_PASSPHRASE = process.env.PI_NETWORK_PASSPHRASE || 'Pi Network';

// Timing configuration
const TRIGGER_OFFSET_MS = parseInt(process.env.TRIGGER_OFFSET_MS || '100'); // Execute 100ms before unlock
const BASE_FEE = parseInt(process.env.BASE_FEE || '100'); // Base fee in stroops
const FEE_MULTIPLIER = parseInt(process.env.FEE_MULTIPLIER || '10'); // Multiplier for competitive fee

// Bot state
let botState = {
  isRunning: false,
  phase: 'idle',
  unlockTimestamp: UNLOCK_TIMESTAMP,
  balanceId: BALANCE_ID,
  sourcePublicKey: null,
  feePayerPublicKey: null,
  claimableBalance: null,
  scheduledTask: null,
  precisionTimer: null,
  lastError: null,
  claimResult: null
};

class StellarSweepBot {
  constructor() {
    this.currentHorizonIndex = 0;
    this.server = new StellarSdk.Horizon.Server(PI_HORIZON_URLS[0]);
    this.sourceKeypair = StellarSdk.Keypair.fromSecret(SOURCE_SECRET);
    this.feePayerKeypair = StellarSdk.Keypair.fromSecret(FEE_PAYER_SECRET);
    
    botState.sourcePublicKey = this.sourceKeypair.publicKey();
    botState.feePayerPublicKey = this.feePayerKeypair.publicKey();
    
    console.log('🤖 Stellar Sweep Bot Initialized');
    console.log('   Source Account:', botState.sourcePublicKey);
    console.log('   Fee Payer:', botState.feePayerPublicKey);
    console.log('   Destination:', DESTINATION_ACCOUNT);
    console.log('   Unlock Time:', new Date(UNLOCK_TIMESTAMP * 1000).toISOString());
    console.log('   Unix Timestamp:', UNLOCK_TIMESTAMP);
  }

  async initialize() {
    try {
      botState.phase = 'preparing';
      console.log('\n🔍 Verifying accounts and claimable balance...');
      
      // Try multiple Horizon servers if one fails
      let sourceAccount = null;
      for (let i = 0; i < PI_HORIZON_URLS.length; i++) {
        try {
          this.currentHorizonIndex = i;
          this.server = new StellarSdk.Horizon.Server(PI_HORIZON_URLS[i]);
          console.log(`   Trying Horizon: ${PI_HORIZON_URLS[i]}...`);
          sourceAccount = await this.server.loadAccount(botState.sourcePublicKey);
          console.log(`   ✅ Connected to: ${PI_HORIZON_URLS[i]}`);
          break;
        } catch (err) {
          console.log(`   ❌ Failed to connect to ${PI_HORIZON_URLS[i]}: ${err.message}`);
        }
      }

      if (!sourceAccount) throw new Error('Could not connect to any Pi Network Horizon server');
      console.log('✅ Source account verified');
      
      // Verify fee payer account
      const feePayerAccount = await this.server.loadAccount(botState.feePayerPublicKey);
      console.log('✅ Fee payer account verified');
      
      const feePayerBalance = feePayerAccount.balances.find(b => b.asset_type === 'native');
      console.log(`   Fee payer balance: ${feePayerBalance.balance} XLM`);
      
      // Verify claimable balance
      if (BALANCE_ID) {
        try {
          const claimableBalance = await this.server.claimableBalances()
            .claimableBalance(BALANCE_ID)
            .call();
          
          botState.claimableBalance = claimableBalance;
          console.log('✅ Claimable balance verified');
          console.log(`   Amount: ${claimableBalance.amount} ${claimableBalance.asset === 'native' ? 'XLM' : claimableBalance.asset}`);
        } catch (err) {
          console.log('⚠️  Could not verify specific balance ID, will claim all available balances');
        }
      }
      
      botState.isRunning = true;
      console.log('✅ Initialization complete\n');
      
    } catch (error) {
      botState.phase = 'error';
      botState.lastError = error.message;
      console.error('❌ Initialization failed:', error.message);
      throw error;
    }
  }

  async buildClaimTransaction() {
    try {
      console.log('🔨 Building claim transaction...');
      
      // Load source account for sequence number
      const sourceAccount = await this.server.loadAccount(botState.sourcePublicKey);
      
      // Get current fee stats for competitive fee
      let feeStats;
      try {
        feeStats = await this.server.feeStats();
        console.log('   Fee stats:', {
          min: feeStats.min_accepted_fee,
          mode: feeStats.mode_accepted_fee,
          p50: feeStats.fee_charged.p50,
          p95: feeStats.fee_charged.p95,
          p99: feeStats.fee_charged.p99
        });
      } catch (err) {
        console.log('   Could not fetch fee stats, using default');
      }
      
      // Calculate competitive fee (use p99 * multiplier or base fee * multiplier)
      const baseFee = feeStats ? Math.max(parseInt(feeStats.fee_charged.p99), BASE_FEE) : BASE_FEE;
      const innerTxFee = Math.max(baseFee * FEE_MULTIPLIER, 1000); // Minimum 1000 stroops
      
      console.log(`   Inner TX fee: ${innerTxFee} stroops (${innerTxFee / 10000000} XLM)`);
      
      // Build inner transaction (claim operation)
      const innerTxBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: innerTxFee.toString(),
        networkPassphrase: PI_NETWORK_PASSPHRASE
      });
      
      // Add claim claimable balance operation
      if (BALANCE_ID) {
        innerTxBuilder.addOperation(
          StellarSdk.Operation.claimClaimableBalance({
            balanceId: BALANCE_ID,
            source: botState.sourcePublicKey
          })
        );
      } else {
        // If no specific balance ID, we'll need to fetch all and claim them
        const claimableBalances = await this.server.claimableBalances()
          .claimant(botState.sourcePublicKey)
          .limit(200)
          .call();
        
        claimableBalances.records.forEach(cb => {
          innerTxBuilder.addOperation(
            StellarSdk.Operation.claimClaimableBalance({
              balanceId: cb.id,
              source: botState.sourcePublicKey
            })
          );
        });
        
        console.log(`   Added ${claimableBalances.records.length} claim operations`);
      }
      
      // Add payment to destination
      innerTxBuilder.addOperation(
        StellarSdk.Operation.payment({
          destination: DESTINATION_ACCOUNT,
          asset: StellarSdk.Asset.native(),
          amount: '0.0000001', // Placeholder, will send max available
          source: botState.sourcePublicKey
        })
      );
      
      // Set timeout to unlock time + 60 seconds
      const unlockTime = UNLOCK_TIMESTAMP;
      innerTxBuilder.setTimeout(60);
      
      const innerTx = innerTxBuilder.build();
      innerTx.sign(this.sourceKeypair);
      
      console.log('✅ Inner transaction built and signed');
      
      // Build fee-bump transaction
      const feePayerAccount = await this.server.loadAccount(botState.feePayerPublicKey);
      const feeBumpFee = Math.max(innerTxFee * 2, 2000); // Fee bump must be at least 2x inner fee
      
      console.log(`   Fee-bump fee: ${feeBumpFee} stroops (${feeBumpFee / 10000000} XLM)`);
      
      const feeBumpTx = StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
        this.feePayerKeypair,
        feeBumpFee.toString(),
        innerTx,
        PI_NETWORK_PASSPHRASE
      );
      
      feeBumpTx.sign(this.feePayerKeypair);
      
      console.log('✅ Fee-bump transaction built and signed');
      console.log(`   Total fee: ${feeBumpFee} stroops (${feeBumpFee / 10000000} XLM)`);
      
      return feeBumpTx;
      
    } catch (error) {
      console.error('❌ Error building transaction:', error.message);
      throw error;
    }
  }

  async submitTransaction(transaction) {
    let lastError = null;
    
    // Try submitting to all available Horizon servers
    for (let i = 0; i < PI_HORIZON_URLS.length; i++) {
      const horizonUrl = PI_HORIZON_URLS[i];
      try {
        console.log(`📤 Submitting to ${horizonUrl}...`);
        const submissionServer = new StellarSdk.Horizon.Server(horizonUrl);
        const startTime = Date.now();
        
        const result = await submissionServer.submitTransaction(transaction);
        
        const duration = Date.now() - startTime;
        console.log(`✅ Transaction submitted successfully to ${horizonUrl} in ${duration}ms`);
        console.log(`   Hash: ${result.hash}`);
        
        botState.claimResult = {
          success: true,
          hash: result.hash,
          ledger: result.ledger,
          duration: duration,
          timestamp: Date.now(),
          horizon: horizonUrl
        };
        
        return result;
      } catch (error) {
        lastError = error;
        console.error(`   ❌ Submission to ${horizonUrl} failed: ${error.message}`);
        if (error.response && error.response.data && error.response.data.extras) {
          console.error('   Result codes:', JSON.stringify(error.response.data.extras.result_codes));
        }
      }
    }
    
    botState.claimResult = {
      success: false,
      error: lastError.message,
      timestamp: Date.now()
    };
    
    throw lastError;
  }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Transaction submitted successfully in ${duration}ms`);
      console.log(`   Hash: ${result.hash}`);
      console.log(`   Ledger: ${result.ledger}`);
      
      botState.claimResult = {
        success: true,
        hash: result.hash,
        ledger: result.ledger,
        duration: duration,
        timestamp: Date.now()
      };
      
      return result;
      
    } catch (error) {
      console.error('❌ Transaction submission failed:', error.message);
      
      if (error.response && error.response.data) {
        console.error('   Error details:', JSON.stringify(error.response.data, null, 2));
      }
      
      botState.claimResult = {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
      
      throw error;
    }
  }

  async executeClaim() {
    try {
      botState.phase = 'executing';
      console.log('\n🚀 EXECUTING CLAIM...\n');
      
      const transaction = await this.buildClaimTransaction();
      const result = await this.submitTransaction(transaction);
      
      botState.phase = 'completed';
      console.log('\n✅ CLAIM COMPLETED SUCCESSFULLY\n');
      
      return result;
      
    } catch (error) {
      botState.phase = 'error';
      botState.lastError = error.message;
      console.error('\n❌ CLAIM FAILED:', error.message, '\n');
      throw error;
    }
  }

  async scheduleExecution() {
    const now = Math.floor(Date.now() / 1000);
    const timeToUnlock = UNLOCK_TIMESTAMP - now;
    
    if (timeToUnlock <= 0) {
      console.log('⚠️  Unlock time has already passed, executing immediately...');
      return await this.executeClaim();
    }
    
    botState.phase = 'waiting';
    console.log(`⏰ Scheduling execution for ${new Date(UNLOCK_TIMESTAMP * 1000).toISOString()}`);
    console.log(`   Time remaining: ${this.formatDuration(timeToUnlock)}`);
    console.log(`   Will trigger ${TRIGGER_OFFSET_MS}ms before unlock time\n`);
    
    if (timeToUnlock <= 60) {
      // Use precision timer for last 60 seconds
      this.schedulePrecisionTimer();
    } else {
      // Use cron for monitoring, switch to precision timer at 60s mark
      this.scheduleWithCron();
    }
  }

  scheduleWithCron() {
    console.log('📅 Using cron scheduler for countdown...\n');
    
    botState.scheduledTask = cron.schedule('*/10 * * * * *', () => {
      const now = Math.floor(Date.now() / 1000);
      const timeRemaining = UNLOCK_TIMESTAMP - now;
      
      if (timeRemaining <= 60) {
        console.log('⏰ Switching to precision timer...\n');
        botState.scheduledTask.stop();
        botState.scheduledTask = null;
        this.schedulePrecisionTimer();
      } else if (timeRemaining % 60 === 0) {
        console.log(`   ⏳ ${this.formatDuration(timeRemaining)} remaining...`);
      }
    });
  }

  schedulePrecisionTimer() {
    const unlockTimeMs = UNLOCK_TIMESTAMP * 1000;
    const triggerTime = unlockTimeMs - TRIGGER_OFFSET_MS;
    const now = Date.now();
    const delay = Math.max(0, triggerTime - now);
    
    console.log(`🎯 Precision timer set: ${delay}ms until trigger`);
    console.log(`   Trigger time: ${new Date(triggerTime).toISOString()}`);
    console.log(`   Unlock time: ${new Date(unlockTimeMs).toISOString()}\n`);
    
    // Countdown in last 10 seconds
    const countdownInterval = setInterval(() => {
      const timeLeft = triggerTime - Date.now();
      if (timeLeft <= 10000 && timeLeft > 0) {
        console.log(`   ⏱️  ${(timeLeft / 1000).toFixed(3)}s until execution...`);
      }
    }, 1000);
    
    botState.precisionTimer = setTimeout(async () => {
      clearInterval(countdownInterval);
      
      const actualTriggerTime = Date.now();
      const drift = actualTriggerTime - triggerTime;
      console.log(`\n🎯 Precision trigger fired (drift: ${drift}ms)`);
      
      // Spin-wait for exact unlock time if needed
      if (TRIGGER_OFFSET_MS > 0) {
        const finalWait = Math.max(0, unlockTimeMs - Date.now());
        if (finalWait > 0 && finalWait < 5000) { // Allow up to 5s spin-wait for extreme precision
          console.log(`   🔥 Spin-waiting final ${finalWait}ms for microsecond precision...`);
          while (Date.now() < unlockTimeMs) {
            // High-intensity busy wait
          }
          console.log(`   🎯 Target reached at ${new Date().toISOString()}`);
        }
      }
      
      await this.executeClaim();
    }, delay);
  }

  formatDuration(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
  }

  getStatus() {
    const now = Math.floor(Date.now() / 1000);
    return {
      ...botState,
      timeToUnlock: Math.max(0, UNLOCK_TIMESTAMP - now),
      currentTime: now,
      currentTimeISO: new Date().toISOString()
    };
  }

  async shutdown() {
    console.log('\n🛑 Shutting down bot...');
    
    if (botState.scheduledTask) {
      botState.scheduledTask.stop();
      botState.scheduledTask = null;
    }
    
    if (botState.precisionTimer) {
      clearTimeout(botState.precisionTimer);
      botState.precisionTimer = null;
    }
    
    botState.isRunning = false;
    botState.phase = 'idle';
    
    console.log('✅ Bot shutdown complete\n');
  }
}

// Main execution
async function main() {
  try {
    // Validate required environment variables
    if (!SOURCE_SECRET || !FEE_PAYER_SECRET || !DESTINATION_ACCOUNT || !UNLOCK_TIMESTAMP) {
      console.error('❌ Missing required environment variables');
      console.error('   Required: SOURCE_SECRET, FEE_PAYER_SECRET, DESTINATION_ACCOUNT, UNLOCK_TIMESTAMP');
      process.exit(1);
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   🌟 STELLAR SWEEP BOT - Pi Network Edition 🌟');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const bot = new StellarSweepBot();
    await bot.initialize();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n⚠️  Received SIGINT signal');
      await bot.shutdown();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n\n⚠️  Received SIGTERM signal');
      await bot.shutdown();
      process.exit(0);
    });
    
    // Check if we should execute immediately or schedule
    const now = Math.floor(Date.now() / 1000);
    const timeToUnlock = UNLOCK_TIMESTAMP - now;
    
    if (timeToUnlock <= 0) {
      console.log('⚡ Unlock time has passed, executing immediately...\n');
      await bot.executeClaim();
    } else {
      await bot.scheduleExecution();
    }
    
    // Keep process alive
    setInterval(() => {
      const status = bot.getStatus();
      if (status.phase === 'completed' || status.phase === 'error') {
        console.log('\n📊 Final Status:', JSON.stringify(status, null, 2));
        process.exit(status.phase === 'completed' ? 0 : 1);
      }
    }, 5000);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { StellarSweepBot, botState };

// Run if executed directly
if (require.main === module) {
  main();
}
