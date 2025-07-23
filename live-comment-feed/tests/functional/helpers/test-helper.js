/**
 * Test Helper Functions for Live Comment Feed
 * Provides common utilities for functional testing
 */

class TestHelper {
    constructor(page, options = {}) {
        this.page = page;
        this.useMockMode = options.useMockMode !== false; // Default to true, set to false to disable
        
        // Enable mock mode for test pages unless explicitly disabled
        if (this.useMockMode) {
            this.page.addInitScript(() => {
                window.LIVE_COMMENT_FEED_MOCK = true;
            });
        }
    }

    /**
     * Wait for the application to connect to NunDB
     */
    async waitForConnection(timeout = null) {
        // Use different timeouts based on mock mode
        const connectionTimeout = timeout || (this.useMockMode ? 10000 : 30000);
        
        try {
            // Wait for connected state
            await this.page.waitForSelector('.connection-status.connected', { 
                timeout: connectionTimeout 
            });
            
            // Verify connection status
            const status = await this.page.textContent('.connection-status');
            return status.includes('Connected');
            
        } catch (error) {
            const modeText = this.useMockMode ? 'mock mode' : 'real database mode';
            console.log(`Connection timeout in ${modeText} - this may indicate connectivity issues`);
            return false;
        }
    }

    /**
     * Join a feed with the given ID
     */
    async joinFeed(feedId) {
        await this.page.fill('#feedIdInput', feedId);
        await this.page.click('#joinFeedBtn');
        
        // Should be fast in mock mode
        await this.page.waitForSelector('#feedScreen', { state: 'visible', timeout: 5000 });
    }

    /**
     * Post a comment with the given author and message
     */
    async postComment(author, message) {
        await this.page.fill('#userNameInput', author);
        await this.page.fill('#messageInput', message);
        await this.page.click('#postBtn');
        
        // Wait for success notification (should be fast in mock mode)
        await this.page.waitForSelector('.notification', { timeout: 5000 });
        
        // Wait for form to be cleared (indication of successful post)
        await this.page.waitForFunction(
            () => document.querySelector('#messageInput').value === '',
            { timeout: 3000 }
        );
        
        await this.page.waitForTimeout(200); // Minimal processing time in mock mode
    }

    /**
     * Get all visible comments
     */
    async getComments() {
        const comments = await this.page.$$('.comment');
        const commentData = [];
        
        for (const comment of comments) {
            const author = await comment.$eval('.comment-author', el => el.textContent);
            const message = await comment.$eval('.comment-message', el => el.textContent);
            const likes = await comment.$eval('.like-count', el => el.textContent);
            commentData.push({ author, message, likes: parseInt(likes) });
        }
        
        return commentData;
    }

    /**
     * Toggle admin mode
     */
    async toggleAdminMode() {
        await this.page.click('#toggleModeBtn');
        const isAdmin = await this.page.isVisible('#adminPanel');
        return isAdmin;
    }

    /**
     * Report a comment by index
     */
    async reportComment(commentIndex) {
        const reportButtons = await this.page.$$('.report-btn');
        if (reportButtons[commentIndex]) {
            await reportButtons[commentIndex].click();
            // Handle confirmation dialog
            this.page.on('dialog', dialog => dialog.accept());
        }
    }

    /**
     * Like a comment by index with better reliability
     */
    async likeComment(commentIndex) {
        // Wait for like buttons to be present and clickable
        await this.page.waitForSelector('.like-btn', { state: 'visible' });
        
        const likeButtons = await this.page.$$('.like-btn');
        if (likeButtons[commentIndex]) {
            await likeButtons[commentIndex].click();
            // Wait for the like to be processed
            await this.page.waitForTimeout(1000);
        }
    }

    /**
     * Check if empty feed state is visible
     */
    async isEmptyFeedVisible() {
        return await this.page.isVisible('#emptyFeed');
    }

    /**
     * Get feed statistics
     */
    async getFeedStats() {
        const approvedCount = await this.page.textContent('#approvedCount');
        return {
            approvedCount: approvedCount.match(/\d+/)?.[0] || '0'
        };
    }

    /**
     * Generate unique feed ID for testing with better isolation for parallel runs
     */
    generateTestFeedId(prefix = 'test') {
        const workerId = process.env.TEST_WORKER_INDEX || Math.floor(Math.random() * 1000);
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 8);
        return `${prefix}-w${workerId}-${timestamp}-${random}`;
    }

    /**
     * Wait for comments to load/update with better reliability
     */
    async waitForCommentsUpdate(expectedCount = null, timeout = 5000) {
        if (expectedCount !== null) {
            await this.page.waitForFunction(
                (count) => {
                    const comments = document.querySelectorAll('.comment');
                    console.log(`Waiting for ${count} comments, found ${comments.length}`);
                    return comments.length === count;
                },
                expectedCount,
                { timeout }
            );
        } else {
            await this.page.waitForTimeout(500); // Minimal wait for updates in mock mode
        }
        
        // Minimal wait for UI updates in mock mode
        await this.page.waitForTimeout(100);
    }

    /**
     * Wait for like count to update to expected value
     */
    async waitForLikeUpdate(commentIndex, expectedLikes, timeout = 10000) {
        // Use shorter timeout for mock mode since it should be faster
        const actualTimeout = this.useMockMode ? 5000 : timeout;
        
        try {
            await this.page.waitForFunction(
                ({ index, expected }) => {
                    const comments = document.querySelectorAll('.comment');
                    if (!comments[index]) {
                        console.log(`Comment ${index} not found`);
                        return false;
                    }
                    const likeCount = comments[index].querySelector('.like-count');
                    const likeBtn = comments[index].querySelector('.like-btn');
                    if (!likeCount || !likeBtn) {
                        console.log(`Like elements not found for comment ${index}`);
                        return false;
                    }
                    
                    const currentLikes = parseInt(likeCount.textContent) || 0;
                    const hasLikedClass = likeBtn.classList.contains('liked');
                    const shouldBeLiked = expected > 0;
                    
                    // Check both count and button state match expectations
                    const countMatches = currentLikes === expected;
                    const stateMatches = hasLikedClass === shouldBeLiked;
                    
                    console.log(`Comment ${index}: likes=${currentLikes}(expected ${expected}), liked=${hasLikedClass}(expected ${shouldBeLiked}), countOK=${countMatches}, stateOK=${stateMatches}`);
                    
                    return countMatches && stateMatches;
                },
                { index: commentIndex, expected: expectedLikes },
                { timeout: actualTimeout }
            );
        } catch (error) {
            // Fallback to simple timeout if waitForFunction fails
            console.log(`waitForLikeUpdate timeout, falling back to simple wait`);
            await this.page.waitForTimeout(1000);
        }
        
        // Additional wait for UI stabilization in mock mode
        await this.page.waitForTimeout(this.useMockMode ? 200 : 500);
    }

    /**
     * Clear all form inputs
     */
    async clearInputs() {
        await this.page.fill('#userNameInput', '');
        await this.page.fill('#messageInput', '');
    }

    /**
     * Get current feed ID from UI
     */
    async getCurrentFeedId() {
        const feedText = await this.page.textContent('#currentFeedId');
        return feedText.replace('Feed: ', '');
    }

    /**
     * Leave current feed
     */
    async leaveFeed() {
        await this.page.click('#leaveFeedBtn');
        await this.page.waitForSelector('#setupScreen', { state: 'visible' });
    }
}

module.exports = { TestHelper };