/**
 * Core Stable Tests - Essential functionality only
 * These tests focus on the most basic, reliable features
 */

const { test, expect } = require('@playwright/test');
const { TestHelper } = require('./helpers/test-helper');

test.describe('Core Stable Functionality', () => {
    let helper;
    let testFeedId;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
        testFeedId = helper.generateTestFeedId('stable-test');
        
        await page.goto('/');
        await helper.waitForConnection();
        await helper.joinFeed(testFeedId);
    });

    test('should post a single comment successfully', async ({ page }) => {
        await helper.postComment('Test User', 'Hello World!');
        await helper.waitForCommentsUpdate(1);

        const comments = await helper.getComments();
        expect(comments).toHaveLength(1);
        expect(comments[0].author).toBe('Test User');
        expect(comments[0].message).toBe('Hello World!');
    });

    test('should show success notification after posting', async ({ page }) => {
        await helper.postComment('User', 'Test message');
        
        // Check notification appeared
        const notification = page.locator('.notification');
        await expect(notification).toBeVisible({ timeout: 15000 });
    });

    test('should clear input fields after posting', async ({ page }) => {
        await helper.postComment('Test User', 'Test message');

        // Message should be cleared but user name should be preserved
        expect(await page.inputValue('#userNameInput')).toBe('Test User'); // Name stays for convenience
        expect(await page.inputValue('#messageInput')).toBe(''); // Message clears
    });

    test('should like a comment', async ({ page }) => {
        await helper.postComment('Test User', 'Likeable comment');
        await helper.waitForCommentsUpdate(1);

        // Initially no likes
        let comments = await helper.getComments();
        expect(comments[0].likes).toBe(0);

        // Like the comment
        await helper.likeComment(0);
        await helper.waitForCommentsUpdate();

        comments = await helper.getComments();
        expect(comments[0].likes).toBe(1);
    });

    // Skip persistence test in mock mode - mock storage is in-memory only
    test.skip('should persist comments after page refresh', async ({ page }) => {
        // This test is skipped for mock mode as it requires real database persistence
    });

    test('should post two comments in sequence', async ({ page }) => {
        await helper.postComment('User 1', 'First comment');
        await helper.waitForCommentsUpdate(1);
        
        await helper.postComment('User 2', 'Second comment');
        await helper.waitForCommentsUpdate(2);

        const comments = await helper.getComments();
        expect(comments).toHaveLength(2);
        
        // Comments should be in reverse order (newest first)
        expect(comments[0].message).toBe('Second comment');
        expect(comments[1].message).toBe('First comment');
    });

    test('should show feed statistics', async ({ page }) => {
        await helper.postComment('Stats User', 'Statistics test');
        await helper.waitForCommentsUpdate(1);

        const stats = await helper.getFeedStats();
        expect(stats.approvedCount).toBe('1');
    });

    test('should toggle admin mode UI', async ({ page }) => {
        const toggleBtn = page.locator('#toggleModeBtn');
        const adminPanel = page.locator('#adminPanel');

        // Initially in user mode
        await expect(toggleBtn).toContainText('👤 User Mode');
        await expect(adminPanel).not.toBeVisible();

        // Switch to admin mode
        await helper.toggleAdminMode();
        await expect(toggleBtn).toContainText('🛡️ Admin Mode');
        await expect(adminPanel).toBeVisible();
    });

    test('should show empty state for new feeds', async ({ page }) => {
        const newFeedId = helper.generateTestFeedId('empty-feed');
        await helper.leaveFeed();
        await helper.joinFeed(newFeedId);

        // Should show empty feed message
        expect(await helper.isEmptyFeedVisible()).toBe(true);
    });
});