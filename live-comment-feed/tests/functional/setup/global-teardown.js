/**
 * Global Test Teardown
 * Runs after all functional tests
 */

async function globalTeardown() {
    console.log('🧹 Starting functional test suite teardown...');
    
    // Clean up any remaining processes
    try {
        const { execSync } = require('child_process');
        execSync('pkill -f "http-server" || true', { stdio: 'ignore' });
        execSync('pkill -f "python3 -m http.server" || true', { stdio: 'ignore' });
        console.log('✅ Cleaned up HTTP servers');
    } catch (error) {
        // Ignore errors
    }
    
    console.log('✅ Global teardown completed');
}

module.exports = globalTeardown;