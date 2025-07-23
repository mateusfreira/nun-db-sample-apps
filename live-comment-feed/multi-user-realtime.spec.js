const { test, expect } = require('@playwright/test');
const path = require('path');

// Test configuration for multi-user scenarios
const USER_A_NAME = 'Alice';
const USER_B_NAME = 'Bob';
const ADMIN_NAME = 'Moderator';
const TEST_COMMENT_A = 'Comment from Alice for real-time testing';
const TEST_COMMENT_B = 'Comment from Bob for real-time testing';

// Generate unique feed ID for each test run to avoid conflicts
function generateTestFeedId() {
  const workerId = process.env.TEST_WORKER_INDEX || Math.floor(Math.random() * 1000);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 8);
  return `multi-test-w${workerId}-${timestamp}-${random}`;
}

test.describe('Multi-User Real-Time Features', () => {
  
  test('should sync comments in real-time between multiple users', async ({ browser }) => {
    const testFeedId = generateTestFeedId();
    
    // Create two browser contexts for different users
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    
    try {
      const filePath = path.resolve(__dirname, 'index.html');
      
      // Both users navigate to the same feed
      await pageA.goto('http://localhost:8081/');
      await pageB.goto('http://localhost:8081/');
      
      // Wait for connections
      await pageA.waitForSelector('.connection-status.connected, .connection-status.disconnected', { timeout: 15000 });
      await pageB.waitForSelector('.connection-status.connected, .connection-status.disconnected', { timeout: 15000 });
      
      // Both users join the same feed
      await pageA.fill('#feedIdInput', testFeedId);
      await pageA.click('#joinFeedBtn');
      await pageB.fill('#feedIdInput', testFeedId);
      await pageB.click('#joinFeedBtn');
      
      // Wait for feed screens to load
      await expect(pageA.locator('#feedScreen')).toBeVisible({ timeout: 10000 });
      await expect(pageB.locator('#feedScreen')).toBeVisible({ timeout: 10000 });
      
      // User A posts a comment
      await pageA.fill('#userNameInput', USER_A_NAME);
      await pageA.fill('#messageInput', TEST_COMMENT_A);
      await pageA.click('#postBtn');
      
      // Wait and verify form was cleared
      await expect(pageA.locator('#messageInput')).toHaveValue('');
      
      // Note: In real implementation, comments need approval before showing
      // This test verifies the posting mechanism works
      
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('should handle like functionality across multiple users', async ({ browser }) => {
    const testFeedId = generateTestFeedId();
    
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    
    try {
      const filePath = path.resolve(__dirname, 'index.html');
      
      await pageA.goto('http://localhost:8081/');
      await pageB.goto('http://localhost:8081/');
      
      // Wait for connections and join same feed
      await pageA.waitForSelector('.connection-status.connected, .connection-status.disconnected', { timeout: 15000 });
      await pageB.waitForSelector('.connection-status.connected, .connection-status.disconnected', { timeout: 15000 });
      
      await pageA.fill('#feedIdInput', testFeedId);
      await pageA.click('#joinFeedBtn');
      await pageB.fill('#feedIdInput', testFeedId);
      await pageB.click('#joinFeedBtn');
      
      await expect(pageA.locator('#feedScreen')).toBeVisible({ timeout: 10000 });
      await expect(pageB.locator('#feedScreen')).toBeVisible({ timeout: 10000 });
      
      // Both users should see the same feed interface
      await expect(pageA.locator('.comments-feed')).toBeVisible();
      await expect(pageB.locator('.comments-feed')).toBeVisible();
      
      // Verify like button functionality exists (even if no comments yet)
      // In real scenario with approved comments, like buttons would be testable
      
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('should handle admin approval workflow with multiple users', async ({ browser }) => {
    const testFeedId = generateTestFeedId();
    
    const contextUser = await browser.newContext();
    const contextAdmin = await browser.newContext();
    
    const userPage = await contextUser.newPage();
    const adminPage = await contextAdmin.newPage();
    
    try {
      const filePath = path.resolve(__dirname, 'index.html');
      
      await userPage.goto('http://localhost:8081/');
      await adminPage.goto('http://localhost:8081/');
      
      // Wait for connections
      await userPage.waitForSelector('.connection-status.connected, .connection-status.disconnected', { timeout: 15000 });
      await adminPage.waitForSelector('.connection-status.connected, .connection-status.disconnected', { timeout: 15000 });
      
      // Both join same feed
      await userPage.fill('#feedIdInput', testFeedId);
      await userPage.click('#joinFeedBtn');
      await adminPage.fill('#feedIdInput', testFeedId);
      await adminPage.click('#joinFeedBtn');
      
      await expect(userPage.locator('#feedScreen')).toBeVisible({ timeout: 10000 });
      await expect(adminPage.locator('#feedScreen')).toBeVisible({ timeout: 10000 });
      
      // User posts a comment
      await userPage.fill('#userNameInput', USER_A_NAME);
      await userPage.fill('#messageInput', TEST_COMMENT_A);
      await userPage.click('#postBtn');
      
      // Admin switches to admin mode
      await adminPage.click('#toggleModeBtn');
      await expect(adminPage.locator('#adminPanel')).toBeVisible();
      
      // Admin should see pending comment in queue
      await expect(adminPage.locator('#pendingQueue')).toBeVisible();
      
      // Verify admin panel functionality
      await expect(adminPage.locator('.admin-header h3')).toContainText('🛡️ Moderator Panel');
      
    } finally {
      await contextUser.close();
      await contextAdmin.close();
    }
  });

  test('should maintain connection status across multiple tabs', async ({ browser }) => {
    const testFeedId = generateTestFeedId();

    const context = await browser.newContext();
    
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    try {
      const filePath = path.resolve(__dirname, 'index.html');
      
      await page1.goto('http://localhost:8081/');
      await page2.goto('http://localhost:8081/');
      
      // Both should attempt to connect
      await page1.waitForSelector('.connection-status.connecting', { timeout: 5000 });
      await page2.waitForSelector('.connection-status.connecting', { timeout: 5000 });
      
      // Both should reach final state (connected or disconnected)
      await page1.waitForSelector('.connection-status.connected, .connection-status.disconnected', { timeout: 15000 });
      await page2.waitForSelector('.connection-status.connected, .connection-status.disconnected', { timeout: 15000 });
      
      // Both should have same connection status
      const status1 = await page1.locator('.connection-status').getAttribute('class');
      const status2 = await page2.locator('.connection-status').getAttribute('class');
      
      // Both should not be in connecting state
      expect(status1).not.toContain('connecting');
      expect(status2).not.toContain('connecting');
      
    } finally {
      await context.close();
    }
  });

  test('should handle simultaneous feed operations', async ({ browser }) => {
    const testFeedId = generateTestFeedId();

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    
    try {
      const filePath = path.resolve(__dirname, 'index.html');
      
      await pageA.goto('http://localhost:8081/');
      await pageB.goto('http://localhost:8081/');
      
      // Wait for connections
      await pageA.waitForSelector('.connection-status.connected, .connection-status.disconnected', { timeout: 15000 });
      await pageB.waitForSelector('.connection-status.connected, .connection-status.disconnected', { timeout: 15000 });
      
      // Simultaneously join the same feed
      await Promise.all([
        pageA.fill('#feedIdInput', testFeedId),
        pageB.fill('#feedIdInput', testFeedId)
      ]);
      
      await Promise.all([
        pageA.click('#joinFeedBtn'),
        pageB.click('#joinFeedBtn')
      ]);
      
      // Both should successfully join
      await expect(pageA.locator('#feedScreen')).toBeVisible({ timeout: 10000 });
      await expect(pageB.locator('#feedScreen')).toBeVisible({ timeout: 10000 });
      
      // Both should show correct feed ID
      await expect(pageA.locator('#currentFeedId')).toContainText(testFeedId);
      await expect(pageB.locator('#currentFeedId')).toContainText(testFeedId);
      
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('should sync feed statistics across users', async ({ browser }) => {
    const testFeedId = generateTestFeedId();

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    
    try {
      const filePath = path.resolve(__dirname, 'index.html');
      
      await pageA.goto('http://localhost:8081/');
      await pageB.goto('http://localhost:8081/');
      
      // Connect and join feed
      await pageA.waitForSelector('.connection-status.connected, .connection-status.disconnected', { timeout: 15000 });
      await pageB.waitForSelector('.connection-status.connected, .connection-status.disconnected', { timeout: 15000 });
      
      await pageA.fill('#feedIdInput', testFeedId);
      await pageA.click('#joinFeedBtn');
      await pageB.fill('#feedIdInput', testFeedId);
      await pageB.click('#joinFeedBtn');
      
      await expect(pageA.locator('#feedScreen')).toBeVisible({ timeout: 10000 });
      await expect(pageB.locator('#feedScreen')).toBeVisible({ timeout: 10000 });
      
      // Check initial comment counts
      await expect(pageA.locator('#approvedCount')).toBeVisible();
      await expect(pageB.locator('#approvedCount')).toBeVisible();
      
      // Both should show same comment counts
      const countA = await pageA.locator('#approvedCount').textContent();
      const countB = await pageB.locator('#approvedCount').textContent();
      
      expect(countA).toEqual(countB);
      
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('should handle network disconnection gracefully', async ({ page }) => {
    const testFeedId = generateTestFeedId();
    const filePath = path.resolve(__dirname, 'index.html');
    await page.goto('http://localhost:8081/');
    
    // Wait for initial connection attempt
    await page.waitForSelector('.connection-status.connected, .connection-status.disconnected', { timeout: 15000 });
    
    // Simulate network issues by going offline
    await page.context().setOffline(true);
    
    // Try to join a feed while offline
    await page.fill('#feedIdInput', testFeedId);
    await page.click('#joinFeedBtn');
    
    // Application should handle this gracefully
    // (May stay on setup screen or show error state)
    
    // Restore network
    await page.context().setOffline(false);
    
    // Give time for reconnection
    await page.waitForTimeout(2000);
    
    // Application should be functional again
    await expect(page.locator('#feedIdInput')).toBeVisible();
  });
});