const express = require('express');
const { StellarSweepBot, botState } = require('./sweep-bot');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

let bot = null;

// Health check endpoint
app.get('/api/health', (req, res) => {
  const now = new Date().toISOString();
  console.log(`[${now}] 💓 Health check received - Keeping service warm`);
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    iso: now,
    uptime: process.uptime(),
    botPhase: botState.phase
  });
});

// Get bot status
app.get('/api/bot/status', (req, res) => {
  if (!bot) {
    return res.json({
      isRunning: false,
      phase: 'idle',
      message: 'Bot not initialized'
    });
  }
  
  const status = bot.getStatus();
  // Remove circular references (timers) before sending
  const safeStatus = {
    ...status,
    scheduledTask: status.scheduledTask ? 'active' : null,
    precisionTimer: status.precisionTimer ? 'active' : null,
    claimableBalance: status.claimableBalance ? {
      id: status.claimableBalance.id,
      amount: status.claimableBalance.amount,
      asset: status.claimableBalance.asset
    } : null
  };
  res.json(safeStatus);
});

// Initialize and start bot
app.post('/api/bot/start', async (req, res) => {
  try {
    if (bot && botState.isRunning) {
      return res.json({
        success: false,
        message: 'Bot is already running',
        status: bot.getStatus()
      });
    }
    
    bot = new StellarSweepBot();
    await bot.initialize();
    
    // Schedule execution
    const now = Math.floor(Date.now() / 1000);
    const unlockTimestamp = parseInt(process.env.UNLOCK_TIMESTAMP);
    const timeToUnlock = unlockTimestamp - now;
    
    if (timeToUnlock <= 0) {
      // Execute immediately
      const result = await bot.executeClaim();
      return res.json({
        success: true,
        message: 'Claim executed immediately',
        result: result,
        status: bot.getStatus()
      });
    } else {
      // Schedule for later
      await bot.scheduleExecution();
      return res.json({
        success: true,
        message: 'Bot started and scheduled',
        status: bot.getStatus()
      });
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Execute claim immediately (Supports both POST and GET for dashboard compatibility)
const handleExecute = async (req, res) => {
  try {
    console.log('⚡ Manual execution triggered via API');
    if (!bot) {
      bot = new StellarSweepBot();
      await bot.initialize();
    }
    
    const result = await bot.executeClaim();
    
    res.json({
      success: true,
      result: result,
      status: bot.getStatus()
    });
    
  } catch (error) {
    console.error('❌ Manual execution failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      status: bot ? bot.getStatus() : null
    });
  }
};

app.post('/api/bot/execute', handleExecute);
app.get('/api/bot/execute', handleExecute);

// Stop bot
app.post('/api/bot/stop', async (req, res) => {
  try {
    if (!bot) {
      return res.json({
        success: false,
        message: 'Bot is not running'
      });
    }
    
    await bot.shutdown();
    bot = null;
    
    res.json({
      success: true,
      message: 'Bot stopped successfully'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get account info
app.get('/api/account/info', async (req, res) => {
  try {
    const StellarSdk = require('stellar-sdk');
    const server = new StellarSdk.Horizon.Server(
      process.env.PI_HORIZON_URL || 'https://api.mainnet.minepi.com'
    );
    
    const sourceKeypair = StellarSdk.Keypair.fromSecret(process.env.SOURCE_SECRET);
    const feePayerKeypair = StellarSdk.Keypair.fromSecret(process.env.FEE_PAYER_SECRET);
    
    const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());
    const feePayerAccount = await server.loadAccount(feePayerKeypair.publicKey());
    
    res.json({
      source: {
        publicKey: sourceKeypair.publicKey(),
        balances: sourceAccount.balances
      },
      feePayer: {
        publicKey: feePayerKeypair.publicKey(),
        balances: feePayerAccount.balances
      },
      destination: process.env.DESTINATION_ACCOUNT
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get claimable balances
app.get('/api/claimable-balances', async (req, res) => {
  try {
    const StellarSdk = require('stellar-sdk');
    const server = new StellarSdk.Horizon.Server(
      process.env.PI_HORIZON_URL || 'https://api.mainnet.minepi.com'
    );
    
    const sourceKeypair = StellarSdk.Keypair.fromSecret(process.env.SOURCE_SECRET);
    
    const claimableBalances = await server.claimableBalances()
      .claimant(sourceKeypair.publicKey())
      .limit(200)
      .call();
    
    res.json({
      count: claimableBalances.records.length,
      balances: claimableBalances.records.map(cb => ({
        id: cb.id,
        asset: cb.asset,
        amount: cb.amount,
        claimants: cb.claimants.length
      }))
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Serve simple dashboard
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Stellar Sweep Bot</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        .container {
          background: white;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        h1 {
          color: #667eea;
          margin-top: 0;
        }
        .status-card {
          background: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 15px;
          margin: 15px 0;
          border-radius: 5px;
        }
        .btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          margin: 5px;
          font-size: 14px;
        }
        .btn:hover {
          background: #5568d3;
        }
        .btn-danger {
          background: #dc3545;
        }
        .btn-danger:hover {
          background: #c82333;
        }
        .btn-success {
          background: #28a745;
        }
        .btn-success:hover {
          background: #218838;
        }
        pre {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          overflow-x: auto;
        }
        .endpoint {
          background: #e9ecef;
          padding: 10px;
          margin: 10px 0;
          border-radius: 5px;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🌟 Stellar Sweep Bot - Pi Network Edition</h1>
        
        <div class="status-card">
          <h3>Bot Status</h3>
          <div id="status">Loading...</div>
        </div>
        
        <div>
          <button class="btn btn-success" onclick="startBot()">Start Bot</button>
          <button class="btn" onclick="executeNow()">Execute Now</button>
          <button class="btn btn-danger" onclick="stopBot()">Stop Bot</button>
          <button class="btn" onclick="refreshStatus()">Refresh Status</button>
        </div>
        
        <h2>API Endpoints</h2>
        
        <div class="endpoint">
          <strong>GET</strong> /api/health - Health check
        </div>
        
        <div class="endpoint">
          <strong>GET</strong> /api/bot/status - Get bot status
        </div>
        
        <div class="endpoint">
          <strong>POST</strong> /api/bot/start - Start bot and schedule execution
        </div>
        
        <div class="endpoint">
          <strong>POST</strong> /api/bot/execute - Execute claim immediately
        </div>
        
        <div class="endpoint">
          <strong>POST</strong> /api/bot/stop - Stop bot
        </div>
        
        <div class="endpoint">
          <strong>GET</strong> /api/account/info - Get account information
        </div>
        
        <div class="endpoint">
          <strong>GET</strong> /api/claimable-balances - Get claimable balances
        </div>
      </div>
      
      <script>
        async function refreshStatus() {
          try {
            const response = await fetch('/api/bot/status');
            const data = await response.json();
            document.getElementById('status').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
          } catch (error) {
            document.getElementById('status').innerHTML = '<span style="color: red;">Error: ' + error.message + '</span>';
          }
        }
        
        async function startBot() {
          try {
            const response = await fetch('/api/bot/start', { method: 'POST' });
            const data = await response.json();
            alert(JSON.stringify(data, null, 2));
            refreshStatus();
          } catch (error) {
            alert('Error: ' + error.message);
          }
        }
        
        async function executeNow() {
          if (!confirm('Execute claim immediately?')) return;
          const statusDiv = document.getElementById('status');
          statusDiv.innerHTML = '🚀 <strong>Executing claim... Please wait...</strong>';
          try {
            const response = await fetch('/api/bot/execute', { 
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            alert(data.success ? '✅ Success: ' + (data.result.hash || 'Claimed') : '❌ Failed: ' + data.error);
            refreshStatus();
          } catch (error) {
            console.error('Execute error:', error);
            // Fallback to GET if POST fails
            try {
              const response = await fetch('/api/bot/execute');
              const data = await response.json();
              alert(data.success ? '✅ Success (via GET): ' + (data.result.hash || 'Claimed') : '❌ Failed: ' + data.error);
            } catch (err) {
              alert('Fatal Error: ' + err.message);
            }
            refreshStatus();
          }
        }
        
        async function stopBot() {
          if (!confirm('Stop the bot?')) return;
          try {
            const response = await fetch('/api/bot/stop', { method: 'POST' });
            const data = await response.json();
            alert(JSON.stringify(data, null, 2));
            refreshStatus();
          } catch (error) {
            alert('Error: ' + error.message);
          }
        }
        
        // Auto-refresh every 5 seconds
        setInterval(refreshStatus, 5000);
        refreshStatus();
      </script>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Stellar Sweep Bot Server running on port ${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/*\n`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Received SIGINT signal');
  if (bot) {
    await bot.shutdown();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n⚠️  Received SIGTERM signal');
  if (bot) {
    await bot.shutdown();
  }
  process.exit(0);
});
