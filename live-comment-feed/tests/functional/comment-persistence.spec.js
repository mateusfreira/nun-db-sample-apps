/**
 * Functional Tests: Comment Persistence
 * Tests that comments persist after page refresh and reload
 */

const { test, expect } = require('@playwright/test');
const { TestHelper } = require('./helpers/test-helper');

test.describe('Comment Persistence', () => {
    let helper;
    let testFeedId;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
        testFeedId = helper.generateTestFeedId('persistence-test');
        
        await page.goto('/');
        await helper.waitForConnection();
    });

    test('should persist comments after page refresh', async ({ page }) => {
        // Join feed and post a comment
        await helper.joinFeed(testFeedId);
        await helper.postComment('Persistent User', 'This comment should persist');
        await helper.waitForCommentsUpdate(1);

        // Verify comment exists
        let comments = await helper.getComments();
        expect(comments).toHaveLength(1);
        expect(comments[0].message).toBe('This comment should persist');

        // Refresh the page
        await page.reload();
        await helper.waitForConnection();
        
        // Rejoin the same feed
        await helper.joinFeed(testFeedId);
        await helper.waitForCommentsUpdate();

        // Verify comment still exists after refresh
        comments = await helper.getComments();
        expect(comments).toHaveLength(1);
        expect(comments[0].author).toBe('Persistent User');
        expect(comments[0].message).toBe('This comment should persist');
    });

    test('should persist multiple comments after refresh', async ({ page }) => {
        // Join feed and post multiple comments
        await helper.joinFeed(testFeedId);
        
        const testComments = [
            { author: 'User A', message: 'First persistent comment' },
            { author: 'User B', message: 'Second persistent comment' },
            { author: 'User C', message: 'Third persistent comment' }
        ];

        for (const comment of testComments) {
            await helper.postComment(comment.author, comment.message);
            await helper.waitForCommentsUpdate();
        }

        // Verify all comments exist
        let comments = await helper.getComments();
        expect(comments).toHaveLength(3);

        // Refresh the page
        await page.reload();
        await helper.waitForConnection();
        await helper.joinFeed(testFeedId);
        await helper.waitForCommentsUpdate();

        // Verify all comments still exist after refresh
        comments = await helper.getComments();
        expect(comments).toHaveLength(3);
        
        // Verify order and content (newest first)
        expect(comments[0].message).toBe('Third persistent comment');
        expect(comments[1].message).toBe('Second persistent comment');
        expect(comments[2].message).toBe('First persistent comment');
    });

    test('should persist comments across different browser sessions', async ({ browser }) => {
        // First session - post comments
        const page1 = await browser.newPage();
        const helper1 = new TestHelper(page1);
        
        await page1.goto('/');
        await helper1.waitForConnection();
        await helper1.joinFeed(testFeedId);
        await helper1.postComment('Session User 1', 'Comment from first session');
        await helper1.waitForCommentsUpdate(1);

        await page1.close();

        // Second session - verify comments persist
        const page2 = await browser.newPage();
        const helper2 = new TestHelper(page2);
        
        await page2.goto('/');
        await helper2.waitForConnection();
        await helper2.joinFeed(testFeedId);
        await helper2.waitForCommentsUpdate();

        const comments = await helper2.getComments();
        expect(comments).toHaveLength(1);
        expect(comments[0].author).toBe('Session User 1');
        expect(comments[0].message).toBe('Comment from first session');

        await page2.close();
    });

    test('should show empty state when no comments exist after refresh', async ({ page }) => {
        const emptyFeedId = helper.generateTestFeedId('empty-test');
        
        // Join empty feed
        await helper.joinFeed(emptyFeedId);
        
        // Verify empty state
        expect(await helper.isEmptyFeedVisible()).toBe(true);

        // Refresh page
        await page.reload();
        await helper.waitForConnection();
        await helper.joinFeed(emptyFeedId);
        await helper.waitForCommentsUpdate();

        // Verify empty state persists
        expect(await helper.isEmptyFeedVisible()).toBe(true);
    });

    test('should maintain comment order after refresh', async ({ page }) => {
        await helper.joinFeed(testFeedId);
        
        // Post comments with delays to ensure different timestamps
        await helper.postComment('User 1', 'First comment');
        await page.waitForTimeout(100);
        
        await helper.postComment('User 2', 'Second comment');
        await page.waitForTimeout(100);
        
        await helper.postComment('User 3', 'Third comment');
        await helper.waitForCommentsUpdate(3);

        // Get original order
        const originalComments = await helper.getComments();
        
        // Refresh and rejoin
        await page.reload();
        await helper.waitForConnection();
        await helper.joinFeed(testFeedId);
        await helper.waitForCommentsUpdate();

        // Verify order is maintained (newest first)
        const persistedComments = await helper.getComments();
        expect(persistedComments).toHaveLength(3);
        
        for (let i = 0; i < originalComments.length; i++) {
            expect(persistedComments[i].message).toBe(originalComments[i].message);
            expect(persistedComments[i].author).toBe(originalComments[i].author);
        }
    });
});