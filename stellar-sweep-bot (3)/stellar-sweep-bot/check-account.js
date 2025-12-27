const StellarSdk = require('stellar-sdk');

// Account details
const SOURCE_SECRET = 'SBPKN6UH7QQLC37MIIYHFP2K4OAQAYFNSZC4ZQFJVA5RQ4VABV22O4FD';
const FEE_PAYER_SECRET = 'SD644ZM7YLXZE3HZZUKGSJC3R45PMM6LPP5CCO2UIIUW6STRJCVJ4XJR';
const DESTINATION = 'MD5HGPHVL73EBDUD2Z4K2VDRLUBC4FFN7GOBLKPK6OPPXH6TED4TQAAAAGMU2T4A4QT5Y';

// Pi Network configuration
const PI_HORIZON_URL = 'https://api.mainnet.minepi.com';
const PI_NETWORK_PASSPHRASE = 'Pi Network';

async function checkAccount() {
  try {
    console.log('🔍 Checking Stellar account...\n');
    
    // Derive public keys
    const sourceKeypair = StellarSdk.Keypair.fromSecret(SOURCE_SECRET);
    const feePayerKeypair = StellarSdk.Keypair.fromSecret(FEE_PAYER_SECRET);
    
    const sourcePublicKey = sourceKeypair.publicKey();
    const feePayerPublicKey = feePayerKeypair.publicKey();
    
    console.log('📋 Account Information:');
    console.log('   Source Account:', sourcePublicKey);
    console.log('   Fee Payer Account:', feePayerPublicKey);
    console.log('   Destination:', DESTINATION);
    console.log('');
    
    // Connect to Pi Network Horizon
    const server = new StellarSdk.Horizon.Server(PI_HORIZON_URL);
    
    // Check source account
    console.log('🔎 Fetching source account details...');
    try {
      const sourceAccount = await server.loadAccount(sourcePublicKey);
      console.log('✅ Source account exists');
      console.log('   Balances:');
      sourceAccount.balances.forEach(balance => {
        if (balance.asset_type === 'native') {
          console.log(`   - XLM: ${balance.balance}`);
        } else {
          console.log(`   - ${balance.asset_code}: ${balance.balance}`);
        }
      });
      console.log('');
    } catch (err) {
      console.log('❌ Source account not found or error:', err.message);
      console.log('');
    }
    
    // Check fee payer account
    console.log('🔎 Fetching fee payer account details...');
    try {
      const feePayerAccount = await server.loadAccount(feePayerPublicKey);
      console.log('✅ Fee payer account exists');
      console.log('   Balances:');
      feePayerAccount.balances.forEach(balance => {
        if (balance.asset_type === 'native') {
          console.log(`   - XLM: ${balance.balance}`);
        } else {
          console.log(`   - ${balance.asset_code}: ${balance.balance}`);
        }
      });
      console.log('');
    } catch (err) {
      console.log('❌ Fee payer account not found or error:', err.message);
      console.log('');
    }
    
    // Fetch claimable balances for source account
    console.log('🔍 Fetching claimable balances...');
    try {
      const claimableBalances = await server.claimableBalances()
        .claimant(sourcePublicKey)
        .limit(200)
        .call();
      
      if (claimableBalances.records.length === 0) {
        console.log('⚠️  No claimable balances found for this account');
        console.log('');
      } else {
        console.log(`✅ Found ${claimableBalances.records.length} claimable balance(s):\n`);
        
        claimableBalances.records.forEach((cb, index) => {
          console.log(`Balance #${index + 1}:`);
          console.log(`   ID: ${cb.id}`);
          console.log(`   Asset: ${cb.asset === 'native' ? 'XLM' : cb.asset}`);
          console.log(`   Amount: ${cb.amount}`);
          console.log(`   Claimants: ${cb.claimants.length}`);
          
          // Parse predicates to find unlock time
          cb.claimants.forEach((claimant, i) => {
            if (claimant.destination === sourcePublicKey) {
              console.log(`   Claimant #${i + 1} (YOU):`);
              console.log(`      Predicate:`, JSON.stringify(claimant.predicate, null, 6));
              
              // Extract unlock time from predicate
              const unlockTime = extractUnlockTime(claimant.predicate);
              if (unlockTime) {
                const unlockDate = new Date(unlockTime * 1000);
                const now = Math.floor(Date.now() / 1000);
                const timeRemaining = unlockTime - now;
                
                console.log(`      🕐 Unlock Time: ${unlockDate.toISOString()}`);
                console.log(`      🕐 Unix Timestamp: ${unlockTime}`);
                console.log(`      ⏱️  Time Remaining: ${timeRemaining > 0 ? formatDuration(timeRemaining) : 'ALREADY UNLOCKED'}`);
              }
            }
          });
          console.log('');
        });
      }
    } catch (err) {
      console.log('❌ Error fetching claimable balances:', err.message);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function extractUnlockTime(predicate) {
  if (!predicate) return null;
  
  // Handle not_predicate with abs_before_epoch
  if (predicate.not && predicate.not.abs_before_epoch) {
    return parseInt(predicate.not.abs_before_epoch);
  }
  
  // Handle not_predicate with abs_before (ISO string)
  if (predicate.not && predicate.not.abs_before) {
    return Math.floor(new Date(predicate.not.abs_before).getTime() / 1000);
  }
  
  // Handle abs_before directly
  if (predicate.abs_before) {
    return parseInt(predicate.abs_before);
  }
  
  // Handle and/or predicates recursively
  if (predicate.and) {
    for (const subPred of predicate.and) {
      const time = extractUnlockTime(subPred);
      if (time) return time;
    }
  }
  
  if (predicate.or) {
    for (const subPred of predicate.or) {
      const time = extractUnlockTime(subPred);
      if (time) return time;
    }
  }
  
  return null;
}

function formatDuration(seconds) {
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

checkAccount();
