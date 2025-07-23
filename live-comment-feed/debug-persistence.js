// Debug script to test comment persistence
const { chromium } = require('playwright');

async function debugPersistence() {
    console.log('🔍 Starting persistence debug...');
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    // Listen for all console messages
    page.on('console', msg => {
        console.log(`BROWSER [${msg.type()}]:`, msg.text());
    });
    
    const testFeedId = `debug-persist-${Date.now()}`;
    
    try {
        console.log('📄 Loading page...');
        await page.goto('http://localhost:8081/');
        
        console.log('⏳ Waiting for connection...');
        await page.waitForSelector('.connection-status.connected', { timeout: 15000 });
        
        console.log('🔑 Joining feed:', testFeedId);
        await page.fill('#feedIdInput', testFeedId);
        await page.click('#joinFeedBtn');
        await page.waitForSelector('#feedScreen', { state: 'visible' });
        
        console.log('📝 Posting multiple comments...');
        
        // Post first comment
        await page.fill('#userNameInput', 'Debug User 1');
        await page.fill('#messageInput', 'First comment');
        await page.click('#postBtn');
        await page.waitForTimeout(1000);
        
        // Post second comment
        await page.fill('#userNameInput', 'Debug User 2');
        await page.fill('#messageInput', 'Second comment');
        await page.click('#postBtn');
        await page.waitForTimeout(1000);
        
        // Post third comment
        await page.fill('#userNameInput', 'Debug User 3');
        await page.fill('#messageInput', 'Third comment');
        await page.click('#postBtn');
        
        console.log('⏳ Waiting for comments to appear...');
        await page.waitForTimeout(3000);
        
        let comments = await page.$$('.comment');
        console.log('📊 Comments before refresh:', comments.length);
        
        if (comments.length > 0) {
            const commentTexts = await page.$$eval('.comment .comment-message', els => els.map(el => el.textContent));
            console.log('💬 Comment texts:', commentTexts);
        }
        
        console.log('🔄 Refreshing page...');
        await page.reload();
        
        console.log('⏳ Waiting for connection after refresh...');
        await page.waitForSelector('.connection-status.connected', { timeout: 15000 });
        
        console.log('🔑 Rejoining feed:', testFeedId);
        await page.fill('#feedIdInput', testFeedId);
        await page.click('#joinFeedBtn');
        await page.waitForSelector('#feedScreen', { state: 'visible' });
        
        console.log('⏳ Waiting for comments to load after refresh...');
        await page.waitForTimeout(5000);
        
        comments = await page.$$('.comment');
        console.log('📊 Comments after refresh:', comments.length);
        
        if (comments.length > 0) {
            const commentTexts = await page.$$eval('.comment .comment-message', els => els.map(el => el.textContent));
            console.log('💬 Comment texts after refresh:', commentTexts);
            console.log('✅ SUCCESS: Comments persisted!');
        } else {
            console.log('❌ FAIL: Comments did not persist');
            
            // Check if empty feed is showing
            const isEmptyVisible = await page.isVisible('#emptyFeed');
            console.log('🔍 Empty feed visible:', isEmptyVisible);
        }
        
        console.log('⏸️  Pausing for manual inspection...');
        await new Promise(resolve => {
            process.stdin.once('data', resolve);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
}

debugPersistence().catch(console.error);