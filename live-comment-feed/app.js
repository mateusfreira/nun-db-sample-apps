class LiveCommentFeed {
    constructor() {
        this.nundb = null;
        this.currentFeedId = null;
        this.isAdmin = false;
        this.userId = this.generateUserId();
        this.comments = new Map();
        this.userLikes = new Set();
        this.currentSort = 'newest';
        
        this.init();
    }

    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    async init() {
        // Set up UI event listeners first (before connection)
        this.setupEventListeners();
        
        // Check for mock mode first
        const urlParams = new URLSearchParams(window.location.search);
        const useMock = urlParams.get('mock') === 'true' || window.LIVE_COMMENT_FEED_MOCK;
        
        if (useMock) {
            console.log('Mock mode detected, initializing mock connection immediately');
            this.initMockConnection();
            return;
        }
        
        // Try to connect with retry logic
        await this.connectWithRetry();
    }

    async connectWithRetry(maxRetries = 3, retryDelay = 2000) {
        // Check if we should use mock mode for testing
        const urlParams = new URLSearchParams(window.location.search);
        const useMock = urlParams.get('mock') === 'true' || window.LIVE_COMMENT_FEED_MOCK;
        
        if (useMock) {
            console.log('Using mock mode for testing');
            this.initMockConnection();
            return;
        }
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.updateConnectionStatus('connecting', `Connecting... (Attempt ${attempt}/${maxRetries})`);
                
                this.nundb = new NunDb({
                    url: 'wss://ws-staging.nundb.org/',
                    db: 'live-comment-feed-demo',
                    token: 'demo-token'
                });

                this.nundb._logger = console;

                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Connection timeout'));
                    }, 15000); // Increased timeout

                    this.nundb._connectionPromise.then(() => {
                        clearTimeout(timeout);
                        this.updateConnectionStatus('connected', 'Connected');
                        resolve();
                    }).catch((error) => {
                        clearTimeout(timeout);
                        console.error(`NunDB Connection Error (attempt ${attempt}):`, error);
                        reject(error);
                    });
                });
                
                // If we get here, connection succeeded
                return;
                
            } catch (error) {
                console.error(`Connection attempt ${attempt} failed:`, error);
                
                if (attempt < maxRetries) {
                    this.updateConnectionStatus('connecting', `Retrying in ${retryDelay/1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                } else {
                    this.updateConnectionStatus('disconnected', 'Connection failed - please refresh');
                }
            }
        }
    }

    updateConnectionStatus(status, message) {
        const statusEl = document.getElementById('connectionStatus');
        statusEl.className = `connection-status ${status}`;
        
        if (status === 'connecting') {
            statusEl.innerHTML = `<span class="loading"></span> ${message}`;
        } else {
            const icon = status === 'connected' ? '🟢' : '🔴';
            statusEl.innerHTML = `${icon} ${message}`;
        }
    }

    initMockConnection() {
        console.log('Initializing mock connection for testing');
        
        // Create mock NunDB object
        this.nundb = {
            _mockStorage: new Map(),
            _mockWatchers: new Map(),
            
            async get(key, subKey = null) {
                const fullKey = subKey ? `${key}:${subKey}` : key;
                const value = this._mockStorage.get(fullKey);
                return value ? { value } : null;
            },
            
            async set(key, subKeyOrValue, valueOrUndefined = undefined) {
                let fullKey, value;
                if (valueOrUndefined === undefined) {
                    // Called as set(key, value)
                    fullKey = key;
                    value = subKeyOrValue;
                } else {
                    // Called as set(key, subKey, value)
                    fullKey = `${key}:${subKeyOrValue}`;
                    value = valueOrUndefined;
                }
                
                this._mockStorage.set(fullKey, value);
                
                // Trigger watchers
                const watchers = this._mockWatchers.get(key) || [];
                for (const callback of watchers) {
                    setTimeout(() => callback({ value }), 0);
                }
            },
            
            async watch(key, callback) {
                if (!this._mockWatchers.has(key)) {
                    this._mockWatchers.set(key, []);
                }
                this._mockWatchers.get(key).push(callback);
            }
        };
        
        // Mark as connected
        this.updateConnectionStatus('connected', 'Connected (Mock Mode)');
    }

    setupEventListeners() {
        // Feed ID input
        const feedInput = document.getElementById('feedIdInput');
        const joinBtn = document.getElementById('joinFeedBtn');
        
        feedInput.addEventListener('input', () => {
            const isValid = feedInput.value.trim().length > 0 && feedInput.checkValidity();
            joinBtn.disabled = !isValid;
        });

        feedInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !joinBtn.disabled) {
                this.joinFeed(feedInput.value.trim());
            }
        });

        joinBtn.addEventListener('click', () => {
            this.joinFeed(feedInput.value.trim());
        });

        // Quick feed buttons
        document.querySelectorAll('.quick-feed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.joinFeed(btn.dataset.feed);
            });
        });

        // Feed actions
        document.getElementById('toggleModeBtn').addEventListener('click', () => {
            this.toggleAdminMode();
        });

        document.getElementById('leaveFeedBtn').addEventListener('click', () => {
            this.leaveFeed();
        });

        document.getElementById('shareBtn').addEventListener('click', () => {
            this.shareFeed();
        });

        // Comment input
        const userNameInput = document.getElementById('userNameInput');
        const messageInput = document.getElementById('messageInput');
        const postBtn = document.getElementById('postBtn');
        const charCount = document.getElementById('charCount');

        const updatePostButton = () => {
            const nameValid = userNameInput.value.trim().length > 0;
            const messageValid = messageInput.value.trim().length > 0;
            postBtn.disabled = !nameValid || !messageValid;
        };

        userNameInput.addEventListener('input', updatePostButton);
        messageInput.addEventListener('input', (e) => {
            const count = e.target.value.length;
            charCount.textContent = count;
            charCount.parentElement.className = count > 400 ? 'char-counter warning' : 'char-counter';
            updatePostButton();
        });

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey && !postBtn.disabled) {
                this.postComment();
            }
        });

        postBtn.addEventListener('click', () => {
            this.postComment();
        });

        // Sort controls
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentSort = btn.dataset.sort;
                this.renderComments();
            });
        });
    }

    async joinFeed(feedId) {
        if (!feedId) return;

        try {
            this.currentFeedId = feedId;
            
            // Clear previous state
            this.comments.clear();
            this.userLikes.clear();
            
            // Subscribe to comment events
            await this.subscribeToFeed();
            
            // Load existing approved comments
            await this.loadComments();
            
            // Load user's likes for this feed
            await this.loadUserLikes();
            
            // Clear loading state and ensure proper initial display
            const feedContent = document.getElementById('commentsFeed');
            const emptyFeed = document.getElementById('emptyFeed');
            const loadingDiv = feedContent.querySelector('.feed-loading');
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
            
            // Ensure empty state shows if no comments exist
            if (this.comments.size === 0) {
                feedContent.style.display = 'none';
                emptyFeed.style.display = 'block';
            }
            
            // Show feed screen
            document.getElementById('setupScreen').style.display = 'none';
            document.getElementById('feedScreen').style.display = 'block';
            document.getElementById('currentFeedId').textContent = `Feed: ${feedId}`;
            
            // Reset input
            document.getElementById('messageInput').value = '';
            document.getElementById('charCount').textContent = '0';
            
        } catch (error) {
            console.error("Failed to join feed:", error);
            alert("Failed to join feed. Please try again.");
        }
    }

    async subscribeToFeed() {
        const commentListKey = `feed:${this.currentFeedId}:comment_list`;
        const likeKey = `feed:${this.currentFeedId}:likes`;
        const approvalKey = `feed:${this.currentFeedId}:approvals`;
        
        // Subscribe to new comments (all comments for admins, approved for users)
        await this.nundb.watch(commentListKey, (data) => {
            this.handleNewComment(data);
        });

        // Subscribe to like updates (immediate)
        await this.nundb.watch(likeKey, (data) => {
            this.handleLikeUpdate(data);
        });

        // Subscribe to approval updates
        await this.nundb.watch(approvalKey, (data) => {
            this.handleApprovalUpdate(data);
        });
    }

    async loadComments() {
        try {
            // Clear existing comments
            this.comments.clear();
            
            const feedCommentsListKey = `feed:${this.currentFeedId}:comment_list`;
            
            // Get the list of comment IDs for this feed
            try {
                const result = await this.nundb.get(feedCommentsListKey);
                console.log("Load comments list result:", result);
                
                if (result && result.value) {
                    let commentIds = [];
                    
                    // Handle both array and single value cases
                    if (Array.isArray(result.value)) {
                        commentIds = result.value;
                    } else {
                        commentIds = [result.value];
                    }
                    
                    console.log("Processing comment IDs:", commentIds);
                    
                    // Load each comment individually
                    for (const commentId of commentIds) {
                        try {
                            const individualCommentKey = `comment:${commentId}`;
                            const commentResult = await this.nundb.get(individualCommentKey);
                            console.log("Individual comment result for", commentId, ":", commentResult);
                            
                            if (commentResult && commentResult.value) {
                                const comment = commentResult.value;
                                if (comment && comment.id) {
                                    if (this.isAdmin || comment.status === 'approved') {
                                        // Load like count for this comment
                                        const likeKey = `feed:${this.currentFeedId}:comment:${comment.id}:likes`;
                                        try {
                                            const likeResult = await this.nundb.get(likeKey, comment.id);
                                            const likeData = (likeResult && likeResult.value) ? likeResult.value : { count: 0, users: [] };
                                            comment.likes = likeData.count || 0;
                                        } catch (e) {
                                            comment.likes = comment.likes || 0;
                                        }
                                        
                                        this.comments.set(comment.id, comment);
                                        console.log("Loaded comment with likes:", comment);
                                    }
                                }
                            }
                        } catch (subError) {
                            console.log("Failed to get individual comment:", subError);
                        }
                    }
                }
            } catch (getError) {
                console.log("No existing comments found:", getError.message);
            }

            // Load user's likes
            await this.loadUserLikes();
            
            this.renderComments();
            this.updateStats();
            
        } catch (error) {
            console.error("Failed to load comments:", error);
        }
    }


    async handleNewComment(data) {
        console.log("HandleNewComment received:", data);
        
        // The data.value should now be an array of comment IDs
        if (data.value) {
            let commentIds = [];
            
            if (Array.isArray(data.value)) {
                commentIds = data.value;
            } else {
                commentIds = [data.value];
            }
            
            console.log("Received comment IDs:", commentIds);
            
            // Find new comment IDs that we don't have yet
            for (const commentId of commentIds) {
                if (!this.comments.has(commentId)) {
                    console.log("Loading new comment:", commentId);
                    
                    try {
                        const individualCommentKey = `comment:${commentId}`;
                        const commentResult = await this.nundb.get(individualCommentKey);
                        
                        if (commentResult && commentResult.value) {
                            const comment = commentResult.value;
                            if (comment && comment.id) {
                                // Show all comments to admins, only approved comments to users
                                if (this.isAdmin || comment.status === 'approved') {
                                    this.comments.set(comment.id, comment);
                                    console.log("Added new comment:", comment);
                                }
                            }
                        }
                    } catch (error) {
                        console.log("Failed to load comment:", commentId, error);
                    }
                }
            }
            
            this.renderComments();
            
            if (this.isAdmin) {
                this.updatePendingQueue();
            }
            
            this.updateStats();
        }
    }

    handleLikeUpdate(data) {
        const { commentId, count } = data.value;
        const comment = this.comments.get(commentId);
        
        if (comment) {
            comment.likes = count;
            this.updateCommentLikes(commentId, count);
        }
    }

    handleApprovalUpdate(data) {
        const { commentId, status } = data.value;
        const comment = this.comments.get(commentId);
        
        if (comment) {
            comment.status = status;
            
            // Remove from public view if rejected/reported/pending
            if (!this.isAdmin && status !== 'approved') {
                this.comments.delete(commentId);
            }
            
            this.renderComments();
            
            if (this.isAdmin) {
                this.updatePendingQueue();
            }
        }
        
        this.updateStats();
    }

    async postComment() {
        // Prevent rapid posting
        if (this._postPending) {
            console.log('Post operation already in progress');
            return;
        }
        this._postPending = true;
        
        const userName = document.getElementById('userNameInput').value.trim();
        const message = document.getElementById('messageInput').value.trim();
        
        if (!userName || !message) {
            this._postPending = false;
            return;
        }

        try {
            const comment = {
                id: this.generateCommentId(),
                author: userName,
                message: message,
                timestamp: Date.now(),
                status: 'approved', // Show immediately - approve by default
                likes: 0,
                feedId: this.currentFeedId,
                userId: this.userId
            };

            // Use completely separate key for each comment
            const individualCommentKey = `comment:${comment.id}`;
            
            // Debug: Log what we're trying to store
            console.log("Storing comment:", comment);
            console.log("Individual comment key:", individualCommentKey);
            
            // Store the full comment object with no sub-key
            await this.nundb.set(individualCommentKey, comment);
            
            // Store comment ID in a feed-specific list
            const feedCommentsListKey = `feed:${this.currentFeedId}:comment_list`;
            
            // Retry logic to handle concurrent updates
            let retries = 3;
            while (retries > 0) {
                try {
                    const existingList = await this.nundb.get(feedCommentsListKey);
                    let commentIds = [];
                    
                    if (existingList && existingList.value) {
                        commentIds = Array.isArray(existingList.value) ? existingList.value : [existingList.value];
                    }
                    
                    // Add new comment ID if not already present
                    if (!commentIds.includes(comment.id)) {
                        commentIds.push(comment.id);
                    }
                    
                    await this.nundb.set(feedCommentsListKey, commentIds);
                    console.log("Updated comment list:", commentIds);
                    break; // Success
                    
                } catch (error) {
                    console.log("Failed to update comment list (attempt", 4 - retries, "):", error);
                    retries--;
                    
                    if (retries === 0) {
                        // Fallback: store just this comment ID
                        try {
                            await this.nundb.set(feedCommentsListKey, [comment.id]);
                        } catch (fallbackError) {
                            console.log("Fallback storage also failed:", fallbackError);
                        }
                    } else {
                        // Wait a bit before retrying
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                }
            }

            // Add comment locally for immediate display
            this.comments.set(comment.id, comment);
            this.renderComments();
            this.updateStats();

            // Clear input
            document.getElementById('messageInput').value = '';
            document.getElementById('charCount').textContent = '0';
            
            // Show success message
            this.showNotification('Comment posted successfully!', 'success');
            
        } catch (error) {
            console.error("Failed to post comment:", error);
            this.showNotification('Failed to post comment. Please try again.', 'error');
        } finally {
            // Clear the pending flag immediately in mock mode, or with delay in real mode
            const urlParams = new URLSearchParams(window.location.search);
            const useMock = urlParams.get('mock') === 'true' || window.LIVE_COMMENT_FEED_MOCK;
            
            if (useMock) {
                this._postPending = false;
            } else {
                setTimeout(() => {
                    this._postPending = false;
                }, 1000);
            }
        }
    }

    generateCommentId() {
        return 'comment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }

    async toggleLike(commentId) {
        // Prevent rapid clicking
        if (this._likePending && this._likePending[commentId]) {
            console.log('Like operation already in progress for comment:', commentId);
            return;
        }
        
        if (!this._likePending) this._likePending = {};
        this._likePending[commentId] = true;
        
        try {
            const comment = this.comments.get(commentId);
            if (!comment) {
                delete this._likePending[commentId];
                return;
            }

            const isLiked = this.userLikes.has(commentId);
            const likeKey = `feed:${this.currentFeedId}:comment:${commentId}:likes`;
            const userLikeKey = `feed:${this.currentFeedId}:user:${this.userId}:likes`;

            // Get current like data
            const likeResult = await this.nundb.get(likeKey, commentId);
            const currentLikeData = (likeResult && likeResult.value) ? likeResult.value : { count: 0, users: [] };
            
            // Ensure users array always exists
            if (!currentLikeData.users) {
                currentLikeData.users = [];
            }
            
            if (isLiked) {
                // Unlike
                this.userLikes.delete(commentId);
                currentLikeData.count = Math.max(0, currentLikeData.count - 1);
                currentLikeData.users = currentLikeData.users.filter(u => u !== this.userId);
                
                // Update database
                await this.nundb.set(likeKey, commentId, currentLikeData);
                
                // Remove from user's likes
                const userLikesResult = await this.nundb.get(userLikeKey, 'likes');
                const userLikes = (userLikesResult && userLikesResult.value) ? userLikesResult.value : [];
                const updatedUserLikes = userLikes.filter(id => id !== commentId);
                await this.nundb.set(userLikeKey, 'likes', updatedUserLikes);
                
            } else {
                // Like
                this.userLikes.add(commentId);
                currentLikeData.count = currentLikeData.count + 1;
                if (!currentLikeData.users.includes(this.userId)) {
                    currentLikeData.users.push(this.userId);
                }
                
                // Update database
                await this.nundb.set(likeKey, commentId, currentLikeData);
                
                // Add to user's likes
                const userLikesResult = await this.nundb.get(userLikeKey, 'likes');
                const userLikes = (userLikesResult && userLikesResult.value) ? userLikesResult.value : [];
                if (!userLikes.includes(commentId)) {
                    userLikes.push(commentId);
                }
                await this.nundb.set(userLikeKey, 'likes', userLikes);
            }

            // Update UI immediately with the new count
            comment.likes = currentLikeData.count;
            this.updateCommentLikes(commentId, comment.likes);

            // Broadcast like update to other users
            this.broadcastLikeUpdate(commentId, currentLikeData.count);

        } catch (error) {
            console.error("Failed to toggle like:", error);
            this.showNotification('Failed to update like. Please try again.', 'error');
        } finally {
            // Clear the pending flag immediately in mock mode, or with delay in real mode
            const urlParams = new URLSearchParams(window.location.search);
            const useMock = urlParams.get('mock') === 'true' || window.LIVE_COMMENT_FEED_MOCK;
            
            if (useMock) {
                delete this._likePending[commentId];
            } else {
                setTimeout(() => {
                    delete this._likePending[commentId];
                }, 500);
            }
        }
    }

    async broadcastLikeUpdate(commentId, newCount) {
        // Broadcast the like update to ensure real-time sync
        const updateKey = `feed:${this.currentFeedId}:updates`;
        await this.nundb.set(updateKey, Date.now(), {
            type: 'like_update',
            commentId: commentId,
            likes: newCount,
            timestamp: Date.now()
        });
    }

    async loadUserLikes() {
        try {
            const userLikeKey = `feed:${this.currentFeedId}:user:${this.userId}:likes`;
            const userLikesResult = await this.nundb.get(userLikeKey, 'likes');
            const userLikes = (userLikesResult && userLikesResult.value) ? userLikesResult.value : [];
            
            // Populate the userLikes set
            this.userLikes.clear();
            userLikes.forEach(commentId => this.userLikes.add(commentId));
            
            console.log(`Loaded ${userLikes.length} likes for user ${this.userId}`);
        } catch (error) {
            console.error("Failed to load user likes:", error);
        }
    }

    async approveComment(commentId) {
        await this.updateCommentStatus(commentId, 'approved');
    }

    async rejectComment(commentId) {
        await this.updateCommentStatus(commentId, 'rejected');
    }

    async reportComment(commentId) {
        const comment = this.comments.get(commentId);
        if (!comment) return;

        const confirmReport = confirm(`Report this comment from ${comment.author}?\n\n"${comment.message}"\n\nThis will hide the comment pending review.`);
        
        if (!confirmReport) return;

        try {
            // Mark as reported (which will hide it from normal users)
            await this.updateCommentStatus(commentId, 'reported');
            this.showNotification('Comment reported and hidden. Thank you for keeping the community safe.', 'success');
        } catch (error) {
            console.error("Failed to report comment:", error);
            this.showNotification('Failed to report comment. Please try again.', 'error');
        }
    }

    async updateCommentStatus(commentId, status) {
        try {
            const approvalKey = `feed:${this.currentFeedId}:approvals`;
            await this.nundb.set(approvalKey, commentId, { commentId, status });
            
            const commentKey = `feed:${this.currentFeedId}:comments`;
            const comment = this.comments.get(commentId);
            if (comment) {
                comment.status = status;
                await this.nundb.set(commentKey, commentId, comment);
            }
            
        } catch (error) {
            console.error("Failed to update comment status:", error);
            this.showNotification('Failed to update comment status.', 'error');
        }
    }

    renderComments() {
        const feedContent = document.getElementById('commentsFeed');
        const emptyFeed = document.getElementById('emptyFeed');
        
        // Filter and sort comments
        const commentsArray = Array.from(this.comments.values())
            .filter(comment => this.isAdmin || comment.status === 'approved')
            .sort((a, b) => {
                switch (this.currentSort) {
                    case 'oldest':
                        return a.timestamp - b.timestamp;
                    case 'likes':
                        return b.likes - a.likes;
                    case 'newest':
                    default:
                        return b.timestamp - a.timestamp;
                }
            });

        if (commentsArray.length === 0) {
            // Hide loading state and feed content
            feedContent.style.display = 'none';
            const loadingDiv = feedContent.querySelector('.feed-loading');
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
            emptyFeed.style.display = 'block';
            return;
        }

        feedContent.style.display = 'block';
        emptyFeed.style.display = 'none';
        
        // Hide loading state when showing comments
        const loadingDiv = feedContent.querySelector('.feed-loading');
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }

        feedContent.innerHTML = commentsArray.map(comment => {
            const isLiked = this.userLikes.has(comment.id);
            const timeAgo = this.formatTimeAgo(comment.timestamp);
            const statusBadge = this.isAdmin ? this.getStatusBadge(comment.status) : '';
            
            return `
                <div class="comment" data-comment-id="${comment.id}">
                    <div class="comment-header">
                        <div class="comment-meta">
                            <span class="comment-author">${this.escapeHtml(comment.author)}</span>
                            <span class="comment-time">${timeAgo}</span>
                            ${statusBadge}
                        </div>
                        ${this.isAdmin ? this.getAdminActions(comment) : ''}
                    </div>
                    <div class="comment-message">${this.escapeHtml(comment.message)}</div>
                    <div class="comment-actions">
                        <button class="like-btn ${isLiked ? 'liked' : ''}" data-comment-id="${comment.id}">
                            <span class="heart">${isLiked ? '❤️' : '🤍'}</span>
                            <span class="like-count">${comment.likes}</span>
                        </button>
                        <button class="report-btn" data-comment-id="${comment.id}" title="Report inappropriate content">
                            🚨 Report
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add like button listeners
        feedContent.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const commentId = btn.dataset.commentId;
                this.toggleLike(commentId);
            });
        });

        // Add report button listeners
        feedContent.querySelectorAll('.report-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const commentId = btn.dataset.commentId;
                this.reportComment(commentId);
            });
        });

        // Add admin action listeners
        if (this.isAdmin) {
            feedContent.querySelectorAll('.approve-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.approveComment(btn.dataset.commentId);
                });
            });

            feedContent.querySelectorAll('.reject-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.rejectComment(btn.dataset.commentId);
                });
            });
        }
    }

    getStatusBadge(status) {
        const badges = {
            pending: '<span class="status-badge pending">Pending</span>',
            approved: '<span class="status-badge approved">Approved</span>',
            rejected: '<span class="status-badge rejected">Rejected</span>',
            reported: '<span class="status-badge reported">Reported</span>'
        };
        return badges[status] || '';
    }

    getAdminActions(comment) {
        if (comment.status === 'pending' || comment.status === 'reported') {
            return `
                <div class="admin-actions">
                    <button class="btn-small approve-btn" data-comment-id="${comment.id}">✓ Approve</button>
                    <button class="btn-small reject-btn" data-comment-id="${comment.id}">✗ Reject</button>
                </div>
            `;
        }
        return '';
    }

    updateCommentLikes(commentId, count) {
        const commentEl = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (commentEl) {
            const likeBtn = commentEl.querySelector('.like-btn');
            const likeCount = likeBtn.querySelector('.like-count');
            const heart = likeBtn.querySelector('.heart');
            
            likeCount.textContent = count;
            
            const isLiked = this.userLikes.has(commentId);
            likeBtn.classList.toggle('liked', isLiked);
            heart.textContent = isLiked ? '❤️' : '🤍';
        }
    }

    toggleAdminMode() {
        this.isAdmin = !this.isAdmin;
        const modeBtn = document.getElementById('toggleModeBtn');
        const adminPanel = document.getElementById('adminPanel');
        
        modeBtn.textContent = this.isAdmin ? '🛡️ Admin Mode' : '👤 User Mode';
        adminPanel.style.display = this.isAdmin ? 'block' : 'none';
        
        this.renderComments();
        this.updateStats();
        
        if (this.isAdmin) {
            this.updatePendingQueue();
        }
    }

    async updatePendingQueue() {
        if (!this.isAdmin) return;

        const pendingQueue = document.getElementById('pendingQueue');
        const pendingComments = Array.from(this.comments.values())
            .filter(comment => comment.status === 'pending' || comment.status === 'reported')
            .sort((a, b) => a.timestamp - b.timestamp);

        if (pendingComments.length === 0) {
            pendingQueue.innerHTML = '<div class="empty-queue">No pending comments</div>';
            return;
        }

        pendingQueue.innerHTML = pendingComments.map(comment => {
            const timeAgo = this.formatTimeAgo(comment.timestamp);
            return `
                <div class="pending-comment">
                    <div class="pending-header">
                        <span class="pending-author">${this.escapeHtml(comment.author)}</span>
                        <span class="pending-time">${timeAgo}</span>
                    </div>
                    <div class="pending-message">${this.escapeHtml(comment.message)}</div>
                    <div class="pending-actions">
                        <button class="btn btn-success approve-btn" data-comment-id="${comment.id}">✓ Approve</button>
                        <button class="btn btn-danger reject-btn" data-comment-id="${comment.id}">✗ Reject</button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners
        pendingQueue.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.approveComment(btn.dataset.commentId);
            });
        });

        pendingQueue.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.rejectComment(btn.dataset.commentId);
            });
        });
    }

    updateStats() {
        const approvedComments = Array.from(this.comments.values()).filter(c => c.status === 'approved');
        const pendingComments = Array.from(this.comments.values()).filter(c => c.status === 'pending' || c.status === 'reported');
        
        document.getElementById('approvedCount').textContent = `${approvedComments.length} comments`;
        
        if (this.isAdmin) {
            document.getElementById('pendingCount').textContent = pendingComments.length;
            document.getElementById('totalCount').textContent = this.comments.size;
        }
    }

    leaveFeed() {
        this.currentFeedId = null;
        this.comments.clear();
        this.userLikes.clear();
        this.isAdmin = false;
        
        document.getElementById('feedScreen').style.display = 'none';
        document.getElementById('setupScreen').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('toggleModeBtn').textContent = '👤 User Mode';
        document.getElementById('feedIdInput').value = '';
        document.getElementById('joinFeedBtn').disabled = true;
    }

    shareFeed() {
        if (!this.currentFeedId) return;
        
        const url = `${window.location.origin}${window.location.pathname}?feed=${this.currentFeedId}`;
        navigator.clipboard.writeText(url).then(() => {
            this.showNotification('Feed link copied to clipboard!', 'success');
        }).catch(() => {
            this.showNotification('Failed to copy link', 'error');
        });
    }

    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new LiveCommentFeed();
    
    // Handle URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const feedParam = urlParams.get('feed');
    if (feedParam) {
        document.getElementById('feedIdInput').value = feedParam;
        document.getElementById('joinFeedBtn').disabled = false;
    }
});