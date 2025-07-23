/**
 * Functional Tests: Multi-User Real-Time Features
 * Tests real-time synchronization between multiple users
 */

const { test, expect } = require('@playwright/test');
const { TestHelper } = require('./helpers/test-helper');

test.describe('Multi-User Real-Time Features', () => {
    let testFeedId;

    test.beforeEach(async () => {
        // Generate unique feed ID for each test with worker isolation
        const workerId = process.env.TEST_WORKER_INDEX || Math.floor(Math.random() * 1000);
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 8);
        testFeedId = `multi-test-w${workerId}-${timestamp}-${random}`;
    });

    test('should sync comments in real-time between multiple users', async ({ browser }) => {
        // Create two browser contexts (different users)
        const user1Context = await browser.newContext();
        const user2Context = await browser.newContext();
        
        const user1Page = await user1Context.newPage();
        const user2Page = await user2Context.newPage();
        
        const helper1 = new TestHelper(user1Page);
        const helper2 = new TestHelper(user2Page);

        try {
            // Both users join the same feed
            await user1Page.goto('/');
            await user2Page.goto('/');
            
            await helper1.waitForConnection();
            await helper2.waitForConnection();
            
            await helper1.joinFeed(testFeedId);
            await helper2.joinFeed(testFeedId);

            // User 1 posts a comment
            await helper1.postComment('User One', 'Hello from User 1');
            await helper1.waitForCommentsUpdate(1);

            // User 2 should see the comment in real-time
            await helper2.waitForCommentsUpdate(1);
            const user2Comments = await helper2.getComments();
            expect(user2Comments).toHaveLength(1);
            expect(user2Comments[0].author).toBe('User One');
            expect(user2Comments[0].message).toBe('Hello from User 1');

            // User 2 posts a comment
            await helper2.postComment('User Two', 'Hello from User 2');
            await helper2.waitForCommentsUpdate(2);

            // User 1 should see both comments
            await helper1.waitForCommentsUpdate(2);
            const user1Comments = await helper1.getComments();
            expect(user1Comments).toHaveLength(2);
            
            // Comments should be in newest-first order
            expect(user1Comments[0].author).toBe('User Two');
            expect(user1Comments[1].author).toBe('User One');

        } finally {
            await user1Context.close();
            await user2Context.close();
        }
    });

    test('should sync like updates between users', async ({ browser }) => {
        const user1Context = await browser.newContext();
        const user2Context = await browser.newContext();
        
        const user1Page = await user1Context.newPage();
        const user2Page = await user2Context.newPage();
        
        const helper1 = new TestHelper(user1Page);
        const helper2 = new TestHelper(user2Page);

        try {
            // Setup both users
            await user1Page.goto('/');
            await user2Page.goto('/');
            
            await helper1.waitForConnection();
            await helper2.waitForConnection();
            
            await helper1.joinFeed(testFeedId);
            await helper2.joinFeed(testFeedId);

            // User 1 posts two comments
            await helper1.postComment('Poster', 'First comment to like!');
            await helper1.postComment('Poster', 'Second comment to like!');
            await helper1.waitForCommentsUpdate(2);
            await helper2.waitForCommentsUpdate(2);

            // User 2 likes the first comment
            await helper2.likeComment(0);
            await helper2.waitForCommentsUpdate();

            // User 1 should see the like update
            await helper1.waitForCommentsUpdate();
            const user1Comments = await helper1.getComments();
            expect(user1Comments[0].likes).toBe(1);

            // User 1 likes the second comment
            await helper1.likeComment(1);
            await helper1.waitForCommentsUpdate();

            // User 2 should see the updated like count on second comment
            await helper2.waitForCommentsUpdate();
            const user2Comments = await helper2.getComments();
            expect(user2Comments[1].likes).toBe(1);

        } finally {
            await user1Context.close();
            await user2Context.close();
        }
    });

    test('should handle admin approval workflow with multiple users', async ({ browser }) => {
        const adminContext = await browser.newContext();
        const userContext = await browser.newContext();
        
        const adminPage = await adminContext.newPage();
        const userPage = await userContext.newPage();
        
        const adminHelper = new TestHelper(adminPage);
        const userHelper = new TestHelper(userPage);

        try {
            // Setup both users
            await adminPage.goto('/');
            await userPage.goto('/');
            
            await adminHelper.waitForConnection();
            await userHelper.waitForConnection();
            
            await adminHelper.joinFeed(testFeedId);
            await userHelper.joinFeed(testFeedId);

            // User posts a comment and reports it
            await userHelper.postComment('Regular User', 'This might be inappropriate');
            await userHelper.waitForCommentsUpdate(1);

            // Report the comment
            userPage.on('dialog', dialog => dialog.accept());
            await userHelper.reportComment(0);
            await userHelper.waitForCommentsUpdate();

            // Regular user should not see the comment
            const userComments = await userHelper.getComments();
            expect(userComments).toHaveLength(0);

            // Admin switches to admin mode and should see the reported comment
            await adminHelper.toggleAdminMode();
            await adminHelper.waitForCommentsUpdate();
            
            const adminComments = await adminHelper.getComments();
            expect(adminComments).toHaveLength(1);
            expect(adminComments[0].message).toBe('This might be inappropriate');

            // Admin approves the comment
            await adminPage.click('.approve-btn');
            await adminHelper.waitForCommentsUpdate();

            // Regular user should now see the approved comment
            await userHelper.waitForCommentsUpdate();
            const approvedComments = await userHelper.getComments();
            expect(approvedComments).toHaveLength(1);
            expect(approvedComments[0].message).toBe('This might be inappropriate');

        } finally {
            await adminContext.close();
            await userContext.close();
        }
    });

    test('should maintain separate user sessions', async ({ browser }) => {
        const user1Context = await browser.newContext();
        const user2Context = await browser.newContext();
        
        const user1Page = await user1Context.newPage();
        const user2Page = await user2Context.newPage();
        
        const helper1 = new TestHelper(user1Page);
        const helper2 = new TestHelper(user2Page);

        try {
            // Setup users in different feeds
            await user1Page.goto('/');
            await user2Page.goto('/');
            
            await helper1.waitForConnection();
            await helper2.waitForConnection();
            
            const feed1Id = testFeedId + '-feed1';
            const feed2Id = testFeedId + '-feed2';
            
            await helper1.joinFeed(feed1Id);
            await helper2.joinFeed(feed2Id);

            // User 1 posts in feed 1
            await helper1.postComment('User 1', 'Message in feed 1');
            await helper1.waitForCommentsUpdate(1);

            // User 2 posts in feed 2
            await helper2.postComment('User 2', 'Message in feed 2');
            await helper2.waitForCommentsUpdate(1);

            // Verify isolation - users should only see their own feed's comments
            const user1Comments = await helper1.getComments();
            const user2Comments = await helper2.getComments();

            expect(user1Comments).toHaveLength(1);
            expect(user1Comments[0].message).toBe('Message in feed 1');

            expect(user2Comments).toHaveLength(1);
            expect(user2Comments[0].message).toBe('Message in feed 2');

        } finally {
            await user1Context.close();
            await user2Context.close();
        }
    });

    test('should handle simultaneous operations', async ({ browser }) => {
        const user1Context = await browser.newContext();
        const user2Context = await browser.newContext();
        
        const user1Page = await user1Context.newPage();
        const user2Page = await user2Context.newPage();
        
        const helper1 = new TestHelper(user1Page);
        const helper2 = new TestHelper(user2Page);

        try {
            // Setup both users
            await user1Page.goto('/');
            await user2Page.goto('/');
            
            await helper1.waitForConnection();
            await helper2.waitForConnection();
            
            await helper1.joinFeed(testFeedId);
            await helper2.joinFeed(testFeedId);

            // Both users post comments simultaneously
            const [, ] = await Promise.all([
                helper1.postComment('User 1', 'Simultaneous comment 1'),
                helper2.postComment('User 2', 'Simultaneous comment 2')
            ]);

            // Wait for both comments to appear
            await helper1.waitForCommentsUpdate(2);
            await helper2.waitForCommentsUpdate(2);

            // Both users should see both comments
            const user1Comments = await helper1.getComments();
            const user2Comments = await helper2.getComments();

            expect(user1Comments).toHaveLength(2);
            expect(user2Comments).toHaveLength(2);

            // Verify both comments are present (order may vary due to timing)
            const allMessages1 = user1Comments.map(c => c.message);
            const allMessages2 = user2Comments.map(c => c.message);

            expect(allMessages1).toContain('Simultaneous comment 1');
            expect(allMessages1).toContain('Simultaneous comment 2');
            expect(allMessages2).toContain('Simultaneous comment 1');
            expect(allMessages2).toContain('Simultaneous comment 2');

        } finally {
            await user1Context.close();
            await user2Context.close();
        }
    });

    test('should sync statistics across users', async ({ browser }) => {
        const user1Context = await browser.newContext();
        const user2Context = await browser.newContext();
        
        const user1Page = await user1Context.newPage();
        const user2Page = await user2Context.newPage();
        
        const helper1 = new TestHelper(user1Page);
        const helper2 = new TestHelper(user2Page);

        try {
            // Setup both users
            await user1Page.goto('/');
            await user2Page.goto('/');
            
            await helper1.waitForConnection();
            await helper2.waitForConnection();
            
            await helper1.joinFeed(testFeedId);
            await helper2.joinFeed(testFeedId);

            // Initially both should show 0 comments
            let stats1 = await helper1.getFeedStats();
            let stats2 = await helper2.getFeedStats();
            expect(stats1.approvedCount).toBe('0');
            expect(stats2.approvedCount).toBe('0');

            // User 1 posts a comment
            await helper1.postComment('Stats User', 'Testing statistics sync');
            await helper1.waitForCommentsUpdate(1);
            await helper2.waitForCommentsUpdate(1);

            // Both should show 1 comment
            stats1 = await helper1.getFeedStats();
            stats2 = await helper2.getFeedStats();
            expect(stats1.approvedCount).toBe('1');
            expect(stats2.approvedCount).toBe('1');

        } finally {
            await user1Context.close();
            await user2Context.close();
        }
    });
});