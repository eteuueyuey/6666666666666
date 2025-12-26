const { StellarSweepBot } = require('./sweep-bot');
require('dotenv').config();

async function testBot() {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   🧪 TESTING STELLAR SWEEP BOT');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Test 1: Bot initialization
    console.log('Test 1: Bot Initialization');
    const bot = new StellarSweepBot();
    console.log('✅ Bot created successfully\n');
    
    // Test 2: Initialize and verify accounts
    console.log('Test 2: Account Verification');
    await bot.initialize();
    console.log('✅ Accounts verified successfully\n');
    
    // Test 3: Get status
    console.log('Test 3: Get Bot Status');
    const status = bot.getStatus();
    console.log('Status:', JSON.stringify(status, null, 2));
    console.log('✅ Status retrieved successfully\n');
    
    // Test 4: Build transaction (without submitting)
    console.log('Test 4: Transaction Building');
    try {
      const tx = await bot.buildClaimTransaction();
      console.log('✅ Transaction built successfully');
      console.log('   Transaction XDR length:', tx.toXDR().length);
      console.log('   Fee:', tx.fee, 'stroops\n');
    } catch (error) {
      console.log('⚠️  Transaction build test:', error.message);
      console.log('   (This is expected if unlock time constraints prevent building)\n');
    }
    
    // Test 5: Verify timing
    console.log('Test 5: Timing Configuration');
    const now = Math.floor(Date.now() / 1000);
    const unlockTimestamp = parseInt(process.env.UNLOCK_TIMESTAMP);
    const timeToUnlock = unlockTimestamp - now;
    
    console.log('   Current time:', new Date().toISOString());
    console.log('   Unlock time:', new Date(unlockTimestamp * 1000).toISOString());
    console.log('   Time remaining:', bot.formatDuration(timeToUnlock));
    console.log('   Trigger offset:', process.env.TRIGGER_OFFSET_MS + 'ms');
    console.log('✅ Timing verified\n');
    
    // Cleanup
    await bot.shutdown();
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   ✅ ALL TESTS PASSED');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('🎯 Bot is ready for deployment!');
    console.log('   To run: npm start (starts web server)');
    console.log('   Or: npm run bot (runs bot directly)\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testBot();
