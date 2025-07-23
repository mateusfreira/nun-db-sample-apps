/**
 * Functional Tests: Comment Posting
 * Tests the core comment posting functionality
 */

const { test, expect } = require('@playwright/test');
const { TestHelper } = require('./helpers/test-helper');

test.describe('Comment Posting Functionality', () => {
    let helper;
    let testFeedId;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
        testFeedId = helper.generateTestFeedId('comment-test');
        
        await page.goto('/');
        await helper.waitForConnection();
        await helper.joinFeed(testFeedId);
    });

    test('should post a comment and display it immediately', async ({ page }) => {
        const author = 'Test User';
        const message = 'This is a test comment';

        await helper.postComment(author, message);
        await helper.waitForCommentsUpdate(1);

        const comments = await helper.getComments();
        expect(comments).toHaveLength(1);
        expect(comments[0].author).toBe(author);
        expect(comments[0].message).toBe(message);
        expect(comments[0].likes).toBe(0);
    });

    test('should show success notification after posting', async ({ page }) => {
        await helper.postComment('Test User', 'Test message');
        
        const notification = page.locator('.notification');
        await expect(notification).toBeVisible();
        await expect(notification).toContainText('Comment posted successfully!');
    });

    test('should clear input fields after posting', async ({ page }) => {
        await helper.postComment('Test User', 'Test message');
        
        const nameInput = page.locator('#userNameInput');
        const messageInput = page.locator('#messageInput');
        
        expect(await nameInput.inputValue()).toBe('Test User'); // Name stays
        expect(await messageInput.inputValue()).toBe(''); // Message clears
    });

    test('should prevent posting with empty fields', async ({ page }) => {
        const postBtn = page.locator('#postBtn');
        
        // Empty name and message
        expect(await postBtn.isDisabled()).toBe(true);
        
        // Only name filled
        await page.fill('#userNameInput', 'Test User');
        expect(await postBtn.isDisabled()).toBe(true);
        
        // Only message filled
        await helper.clearInputs();
        await page.fill('#messageInput', 'Test message');
        expect(await postBtn.isDisabled()).toBe(true);
        
        // Both filled
        await page.fill('#userNameInput', 'Test User');
        expect(await postBtn.isDisabled()).toBe(false);
    });

    test('should handle character limit correctly', async ({ page }) => {
        const longMessage = 'a'.repeat(500);
        const tooLongMessage = 'a'.repeat(501);
        
        await page.fill('#userNameInput', 'Test User');
        
        // Test exact limit
        await page.fill('#messageInput', longMessage);
        const charCount = page.locator('#charCount');
        await expect(charCount).toHaveText('500');
        
        // Should prevent typing beyond limit
        await page.fill('#messageInput', tooLongMessage);
        expect((await page.inputValue('#messageInput')).length).toBeLessThanOrEqual(500);
    });

    test('should post multiple comments in sequence', async ({ page }) => {
        const comments = [
            { author: 'User 1', message: 'First comment' },
            { author: 'User 2', message: 'Second comment' },
            { author: 'User 3', message: 'Third comment' }
        ];

        // Post all comments
        for (let i = 0; i < comments.length; i++) {
            await helper.postComment(comments[i].author, comments[i].message);
            // Wait for the specific count instead of general wait
            await helper.waitForCommentsUpdate(i + 1);
        }

        const postedComments = await helper.getComments();
        expect(postedComments).toHaveLength(3);
        
        // Comments should be in reverse order (newest first)
        expect(postedComments[0].message).toBe('Third comment');
        expect(postedComments[1].message).toBe('Second comment');
        expect(postedComments[2].message).toBe('First comment');
    });
});