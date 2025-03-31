const economy = require('./economySystem');

async function runCleanup() {
    try {
        await economy.clearExpiredCooldowns();
        console.log('Cleaned up expired cooldowns');
    } catch (error) {
        console.error('Error in cleanup:', error);
    }
}

// Run cleanup every hour
setInterval(runCleanup, 3600000);

module.exports = runCleanup;