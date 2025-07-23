/**
 * Global Test Setup
 * Runs before all functional tests
 */

async function globalSetup() {
    console.log('🚀 Starting functional test suite setup...');
    
    // Kill any existing HTTP servers that might conflict
    try {
        const { execSync } = require('child_process');
        execSync('pkill -f "http-server" || true', { stdio: 'ignore' });
        execSync('pkill -f "python3 -m http.server" || true', { stdio: 'ignore' });
        console.log('✅ Cleaned up existing HTTP servers');
    } catch (error) {
        // Ignore errors if no servers were running
    }

    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Global setup completed');
}

module.exports = globalSetup;