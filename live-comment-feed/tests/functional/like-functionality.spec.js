/**
 * Comprehensive Tests: Like Functionality
 * Tests all aspects of the like feature including persistence
 */

const { test, expect } = require('@playwright/test');
const { TestHelper } = require('./helpers/test-helper');

test.describe('Like Functionality', () => {
    let helper;
    let testFeedId;

    test.beforeEach(async ({ page }) => {
        helper = new TestHelper(page);
        testFeedId = helper.generateTestFeedId('like-test');
        
        await page.goto('/');
        await helper.waitForConnection();
        await helper.joinFeed(testFeedId);
    });

    test.describe('Basic Like Operations', () => {
        test('should like a comment and update count immediately', async ({ page }) => {
            // Post a comment
            await helper.postComment('Like Tester', 'Please like this comment');
            await helper.waitForCommentsUpdate(1);

            // Verify initial state
            let comments = await helper.getComments();
            expect(comments).toHaveLength(1);
            expect(comments[0].likes).toBe(0);

            // Like the comment
            await helper.likeComment(0);
            await helper.waitForLikeUpdate(0, 1);

            // Verify like count increased
            comments = await helper.getComments();
            expect(comments[0].likes).toBe(1);
        });

        test('should unlike a comment and update count', async ({ page }) => {
            // Post a comment and like it
            await helper.postComment('Unlike Tester', 'Like and unlike this comment');
            await helper.waitForCommentsUpdate(1);
            
            await helper.likeComment(0);
            await helper.waitForLikeUpdate(0, 1);

            // Verify it's liked
            let comments = await helper.getComments();
            expect(comments[0].likes).toBe(1);

            // Unlike the comment - use more robust waiting for Chromium
            const likeBtn = page.locator('.like-btn').first();
            await likeBtn.click();
            
            // More robust waiting for unlike operation
            let unlikeSuccess = false;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await page.waitForFunction(
                        () => {
                            const btn = document.querySelector('.like-btn');
                            const count = document.querySelector('.like-count');
                            return !btn.classList.contains('liked') && count.textContent === '0';
                        },
                        { timeout: 3000 }
                    );
                    unlikeSuccess = true;
                    break;
                } catch (error) {
                    if (attempt < 2) {
                        console.log(`Unlike attempt ${attempt + 1} failed, retrying...`);
                        await page.waitForTimeout(500);
                        await likeBtn.click(); // Try clicking again
                    }
                }
            }
            
            expect(unlikeSuccess).toBe(true);

            // Verify like count decreased
            comments = await helper.getComments();
            expect(comments[0].likes).toBe(0);
        });

        test('should show correct like button state', async ({ page }) => {
            await helper.postComment('State Tester', 'Check button state');
            await helper.waitForCommentsUpdate(1);

            // Check initial state - should show empty heart
            const likeBtn = page.locator('.like-btn').first();
            await expect(likeBtn).not.toHaveClass(/liked/);
            await expect(likeBtn.locator('.heart')).toContainText('🤍');

            // Like the comment
            await helper.likeComment(0);
            await helper.waitForLikeUpdate(0, 1);

            // Check liked state - should show filled heart
            await expect(likeBtn).toHaveClass(/liked/);
            await expect(likeBtn.locator('.heart')).toContainText('❤️');

            // Unlike the comment with retry logic
            await likeBtn.click();
            
            // Wait for unlike with retry
            let unlikeComplete = false;
            for (let attempt = 0; attempt < 3 && !unlikeComplete; attempt++) {
                try {
                    await expect(likeBtn).not.toHaveClass(/liked/, { timeout: 3000 });
                    await expect(likeBtn.locator('.heart')).toContainText('🤍', { timeout: 1000 });
                    unlikeComplete = true;
                } catch (error) {
                    if (attempt < 2) {
                        await page.waitForTimeout(500);
                        await likeBtn.click(); // Retry click
                    }
                }
            }
            
            expect(unlikeComplete).toBe(true);
        });
    });

    test.describe('Multiple Comments Like Handling', () => {
        test('should handle likes on multiple comments independently', async ({ page }) => {
            // Post multiple comments
            await helper.postComment('User 1', 'First comment');
            await helper.waitForCommentsUpdate(1);
            
            await helper.postComment('User 2', 'Second comment');
            await helper.waitForCommentsUpdate(2);
            
            await helper.postComment('User 3', 'Third comment');
            await helper.waitForCommentsUpdate(3);

            // Like first and third comments
            await helper.likeComment(0); // Third comment (newest first)
            await helper.waitForLikeUpdate(0, 1);
            
            await helper.likeComment(2); // First comment
            await helper.waitForLikeUpdate(2, 1);

            // Verify like counts
            const comments = await helper.getComments();
            expect(comments[0].likes).toBe(1); // Third comment
            expect(comments[1].likes).toBe(0); // Second comment (not liked)
            expect(comments[2].likes).toBe(1); // First comment
        });

        test('should prevent rapid clicking on like buttons', async ({ page }) => {
            await helper.postComment('Rapid Clicker', 'Try rapid clicking');
            await helper.waitForCommentsUpdate(1);

            const likeBtn = page.locator('.like-btn').first();
            
            // Click multiple times rapidly
            await likeBtn.click();
            await likeBtn.click();
            await likeBtn.click();
            
            // Wait for any processing
            await helper.waitForLikeUpdate(0, 1);

            // Should only have 1 like, not 3
            const comments = await helper.getComments();
            expect(comments[0].likes).toBe(1);
        });
    });

    test.describe('Like Sorting', () => {
        test('should sort comments by likes when sort option is selected', async ({ page }) => {
            // Post comments
            await helper.postComment('User A', 'No likes comment');
            await helper.waitForCommentsUpdate(1);
            
            await helper.postComment('User B', 'One like comment');
            await helper.waitForCommentsUpdate(2);
            
            await helper.postComment('User C', 'Two likes comment');
            await helper.waitForCommentsUpdate(3);

            // Add likes (remember newest first order)
            await helper.likeComment(1); // One like comment
            await helper.waitForLikeUpdate(1, 1);
            
            await helper.likeComment(0); // Two likes comment
            await helper.waitForLikeUpdate(0, 1);
            await helper.likeComment(0); // Add second like
            await helper.waitForLikeUpdate(0, 2);

            // Switch to likes sorting
            await page.click('[data-sort="likes"]');
            await page.waitForTimeout(500);

            // Verify sorting by likes (highest first)
            const comments = await helper.getComments();
            expect(comments[0].message).toBe('Two likes comment'); // 2 likes
            expect(comments[0].likes).toBe(2);
            expect(comments[1].message).toBe('One like comment'); // 1 like  
            expect(comments[1].likes).toBe(1);
            expect(comments[2].message).toBe('No likes comment'); // 0 likes
            expect(comments[2].likes).toBe(0);
        });
    });
});

test.describe('Like Functionality with Real Database', () => {
    let helper;
    let testFeedId;

    test.beforeEach(async ({ page }) => {
        // Create helper WITHOUT mock mode for these tests
        helper = new TestHelper(page);
        
        // Disable mock mode for persistence tests
        await page.addInitScript(() => {
            delete window.LIVE_COMMENT_FEED_MOCK;
        });
        
        testFeedId = helper.generateTestFeedId('persist-like-test');
        
        await page.goto('/');
        await helper.waitForConnection();
        await helper.joinFeed(testFeedId);
    });

    test('should persist likes after page reload', async ({ page }) => {
        // Post a comment
        await helper.postComment('Persistence Tester', 'This like should persist');
        await helper.waitForCommentsUpdate(1);

        // Like the comment
        await helper.likeComment(0);
        await helper.waitForLikeUpdate(0, 1);

        // Verify like count
        let comments = await helper.getComments();
        expect(comments[0].likes).toBe(1);

        // Reload the page
        await page.reload();
        await helper.waitForConnection();
        await helper.joinFeed(testFeedId);
        await helper.waitForCommentsUpdate(1);

        // Verify like persisted after reload
        comments = await helper.getComments();
        expect(comments).toHaveLength(1);
        expect(comments[0].likes).toBe(1);
        expect(comments[0].message).toBe('This like should persist');

        // Verify like button state is correct after reload
        const likeBtn = page.locator('.like-btn').first();
        await expect(likeBtn).toHaveClass(/liked/);
        await expect(likeBtn.locator('.heart')).toContainText('❤️');
    });

    test('should persist multiple likes from different sessions', async ({ page, context }) => {
        // Post a comment
        await helper.postComment('Multi-Session Tester', 'Like me from multiple sessions');
        await helper.waitForCommentsUpdate(1);

        // Like from first session
        await helper.likeComment(0);
        await helper.waitForLikeUpdate(0, 1);

        // Open second browser session
        const secondPage = await context.newPage();
        const secondHelper = new TestHelper(secondPage);
        
        // Disable mock mode for second page too
        await secondPage.addInitScript(() => {
            delete window.LIVE_COMMENT_FEED_MOCK;
        });
        
        await secondPage.goto('/');
        await secondHelper.waitForConnection();
        await secondHelper.joinFeed(testFeedId);
        await secondHelper.waitForCommentsUpdate(1);

        // Like from second session
        await secondHelper.likeComment(0);
        await secondHelper.waitForLikeUpdate(0, 2);

        // Verify count in second session
        let comments = await secondHelper.getComments();
        expect(comments[0].likes).toBe(2);

        // Reload first session and verify
        await page.reload();
        await helper.waitForConnection();
        await helper.joinFeed(testFeedId);
        await helper.waitForCommentsUpdate(1);

        // Should show 2 likes from both sessions
        comments = await helper.getComments();
        expect(comments[0].likes).toBe(2);

        // Clean up
        await secondPage.close();
    });

    test('should handle unlike after page reload', async ({ page }) => {
        // Post and like a comment
        await helper.postComment('Unlike After Reload', 'Like me, then reload and unlike');
        await helper.waitForCommentsUpdate(1);
        
        await helper.likeComment(0);
        await helper.waitForLikeUpdate(0, 1);

        // Reload page
        await page.reload();
        await helper.waitForConnection();
        await helper.joinFeed(testFeedId);
        await helper.waitForCommentsUpdate(1);

        // Verify like persisted and button state
        let comments = await helper.getComments();
        expect(comments[0].likes).toBe(1);
        
        const likeBtn = page.locator('.like-btn').first();
        await expect(likeBtn).toHaveClass(/liked/);

        // Unlike the comment
        await helper.likeComment(0);
        await helper.waitForLikeUpdate(0, 0);

        // Verify unlike worked
        comments = await helper.getComments();
        expect(comments[0].likes).toBe(0);
        await expect(likeBtn).not.toHaveClass(/liked/);
    });
});