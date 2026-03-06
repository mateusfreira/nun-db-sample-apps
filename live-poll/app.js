/**
 * Live Poll Application using NunDB
 * Real-time voting with instant results
 */

class LivePollApp {
    constructor() {
        this.nundb = null;
        this.currentPoll = null;
        this.hasVoted = false;
        this.pollId = null;
        this.isCreator = false;
        
        // Initialize the app
        this.init();
    }

    async init() {
        // Check if we're loading a specific poll
        const urlParams = new URLSearchParams(window.location.search);
        const pollId = urlParams.get('p');
        
        if (pollId) {
            this.pollId = pollId;
            this.showVotePage();
            await this.connectToNunDB();
            await this.loadPoll();
        } else {
            this.setupCreateForm();
        }
        
        this.setupEventListeners();
    }

    async connectToNunDB() {
        try {
            this.nundb = new NunDb({
                url: 'wss://ws-staging.nundb.org/',
                db: 'live-poll-demo',
                token: 'demo-token',
                //user: `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
            });

            await this.nundb._connectionPromise;
            console.log('Connected to NunDB');
        } catch (error) {
            console.error('Failed to connect to NunDB:', error);
            this.showToast('Failed to connect. Please refresh.', 'error');
        }
    }

    setupEventListeners() {
        // Create form submission
        const createForm = document.getElementById('createPollForm');
        if (createForm) {
            createForm.addEventListener('submit', (e) => this.handleCreatePoll(e));
        }

        // Add option button
        const addOptionBtn = document.getElementById('addOption');
        if (addOptionBtn) {
            addOptionBtn.addEventListener('click', () => this.addOptionInput());
        }

        // Character counter
        const questionInput = document.getElementById('pollQuestion');
        if (questionInput) {
            questionInput.addEventListener('input', (e) => {
                const charCount = e.target.value.length;
                document.querySelector('.char-count').textContent = `${charCount}/200`;
            });
        }

        // Vote form submission
        const voteForm = document.getElementById('voteForm');
        if (voteForm) {
            voteForm.addEventListener('submit', (e) => this.handleVote(e));
        }

        // Share button
        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.sharePoll());
        }

        // New poll button
        const newPollBtn = document.getElementById('newPollBtn');
        if (newPollBtn) {
            newPollBtn.addEventListener('click', () => {
                window.location.href = window.location.pathname;
            });
        }
    }

    setupCreateForm() {
        // Setup remove buttons for initial options
        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => this.removeOption(e));
        });

        // Update remove button states
        this.updateRemoveButtons();
    }

    addOptionInput() {
        const optionsList = document.getElementById('optionsList');
        const optionCount = optionsList.children.length;
        
        if (optionCount >= 10) {
            this.showToast('Maximum 10 options allowed', 'error');
            return;
        }

        const optionGroup = document.createElement('div');
        optionGroup.className = 'option-input-group';
        optionGroup.innerHTML = `
            <input type="text" class="option-input" placeholder="Option ${optionCount + 1}" required>
            <button type="button" class="btn-remove">×</button>
        `;

        optionsList.appendChild(optionGroup);

        // Add event listener to new remove button
        const removeBtn = optionGroup.querySelector('.btn-remove');
        removeBtn.addEventListener('click', (e) => this.removeOption(e));

        // Update remove button states
        this.updateRemoveButtons();

        // Focus on new input
        optionGroup.querySelector('.option-input').focus();
    }

    removeOption(e) {
        e.target.closest('.option-input-group').remove();
        this.updateRemoveButtons();
    }

    updateRemoveButtons() {
        const optionGroups = document.querySelectorAll('.option-input-group');
        const removeButtons = document.querySelectorAll('.btn-remove');
        
        // Enable/disable remove buttons based on count
        removeButtons.forEach(btn => {
            btn.disabled = optionGroups.length <= 2;
        });
    }

    generateShortId() {
        // Generate a short, memorable ID (6 characters)
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars[Math.floor(Math.random() * chars.length)];
        }
        return id;
    }

    async handleCreatePoll(e) {
        e.preventDefault();
        
        // Show loading
        this.showLoading(true);
        
        // Connect to NunDB if not connected
        if (!this.nundb) {
            await this.connectToNunDB();
        }

        // Gather form data
        const question = document.getElementById('pollQuestion').value.trim();
        const optionInputs = document.querySelectorAll('.option-input');
        const options = Array.from(optionInputs)
            .map(input => input.value.trim())
            .filter(opt => opt.length > 0);

        const allowMultiple = document.getElementById('allowMultiple').checked;
        const showResults = document.getElementById('showResults').checked;

        // Validate
        if (options.length < 2) {
            this.showToast('Please provide at least 2 options', 'error');
            this.showLoading(false);
            return;
        }

        // Create poll object
        this.pollId = this.generateShortId();
        const poll = {
            id: this.pollId,
            question,
            options: options.map((text, index) => ({
                id: index,
                text,
                votes: 0
            })),
            settings: {
                allowMultiple,
                showResults
            },
            totalVotes: 0,
            createdAt: Date.now(),
            voters: []
        };

        try {
            // Save poll to NunDB
            await this.nundb.set(`poll:${this.pollId}`, poll);
            
            this.isCreator = true;
            this.currentPoll = poll;
            
            // Navigate to poll page
            window.history.pushState({}, '', `?p=${this.pollId}`);
            this.showVotePage();
            this.displayPoll();
            
            // Watch for updates
            this.watchPollUpdates();
            
            this.showToast('Poll created successfully!', 'success');
        } catch (error) {
            console.error('Failed to create poll:', error);
            this.showToast('Failed to create poll. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadPoll() {
        this.showLoading(true);
        
        try {
            const result = await this.nundb.get(`poll:${this.pollId}`);
            
            if (!result || !result.value) {
                this.showToast('Poll not found', 'error');
                setTimeout(() => {
                    window.location.href = window.location.pathname;
                }, 2000);
                return;
            }

            this.currentPoll = result.value;
            this.displayPoll();
            
            // Check if user has already voted
            const userId = this.getUserId();
            this.hasVoted = this.currentPoll.voters.includes(userId);
            
            if (this.hasVoted || this.currentPoll.settings.showResults) {
                this.showResults();
            }
            
            // Watch for updates
            this.watchPollUpdates();
            
        } catch (error) {
            console.error('Failed to load poll:', error);
            this.showToast('Failed to load poll', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    watchPollUpdates() {
        this.nundb.watch(`poll:${this.pollId}`, (data) => {
            if (data && data.value) {
                this.currentPoll = data.value;
                this.updatePollDisplay();
                
                if (this.hasVoted || this.currentPoll.settings.showResults) {
                    this.updateResults();
                }
            }
        });
    }

    displayPoll() {
        // Update poll ID display
        document.getElementById('pollId').textContent = this.pollId;
        
        // Update question
        document.getElementById('pollQuestionDisplay').textContent = this.currentPoll.question;
        
        // Update total votes
        this.updateVoteCount();
        
        // Display options
        const container = document.getElementById('optionsContainer');
        const inputType = this.currentPoll.settings.allowMultiple ? 'checkbox' : 'radio';
        
        container.innerHTML = this.currentPoll.options.map(option => `
            <div class="vote-option">
                <input 
                    type="${inputType}" 
                    name="pollOption" 
                    id="option-${option.id}" 
                    value="${option.id}"
                >
                <label for="option-${option.id}" class="vote-option-label">
                    ${this.escapeHtml(option.text)}
                </label>
            </div>
        `).join('');
    }

    updatePollDisplay() {
        this.updateVoteCount();
    }

    updateVoteCount() {
        const totalVotes = this.currentPoll.totalVotes;
        const votesText = totalVotes === 1 ? '1 vote' : `${totalVotes} votes`;
        document.getElementById('totalVotes').textContent = votesText;
    }

    async handleVote(e) {
        e.preventDefault();
        
        if (this.hasVoted) {
            this.showToast('You have already voted', 'error');
            return;
        }

        const formData = new FormData(e.target);
        const selectedOptions = [];
        
        if (this.currentPoll.settings.allowMultiple) {
            const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
            checkboxes.forEach(cb => selectedOptions.push(parseInt(cb.value)));
        } else {
            const selected = formData.get('pollOption');
            if (selected !== null) {
                selectedOptions.push(parseInt(selected));
            }
        }

        if (selectedOptions.length === 0) {
            this.showToast('Please select an option', 'error');
            return;
        }

        // Disable form
        document.getElementById('submitVote').disabled = true;

        try {
            // Update poll data
            const userId = this.getUserId();
            
            // Update vote counts
            selectedOptions.forEach(optionId => {
                this.currentPoll.options[optionId].votes++;
            });
            
            // Add user to voters list
            this.currentPoll.voters.push(userId);
            
            // Update total votes
            this.currentPoll.totalVotes++;
            
            // Save to NunDB
            await this.nundb.set(`poll:${this.pollId}`, this.currentPoll);
            
            this.hasVoted = true;
            this.showToast('Vote submitted!', 'success');
            
            // Show results
            this.showResults();
            
        } catch (error) {
            console.error('Failed to submit vote:', error);
            this.showToast('Failed to submit vote', 'error');
            document.getElementById('submitVote').disabled = false;
        }
    }

    showResults() {
        document.getElementById('votingSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'block';
        this.updateResults();
    }

    updateResults() {
        const container = document.getElementById('resultsContainer');
        const totalVotes = this.currentPoll.totalVotes || 1; // Prevent division by zero
        
        // Find highest vote count
        const maxVotes = Math.max(...this.currentPoll.options.map(opt => opt.votes));
        
        container.innerHTML = this.currentPoll.options.map(option => {
            const percentage = totalVotes > 0 ? (option.votes / totalVotes * 100).toFixed(1) : 0;
            const isWinner = option.votes === maxVotes && option.votes > 0;
            
            return `
                <div class="result-item">
                    <div class="result-header">
                        <span class="result-label">${this.escapeHtml(option.text)}</span>
                        <div class="result-stats">
                            <span class="result-votes">${option.votes} vote${option.votes !== 1 ? 's' : ''}</span>
                            <span class="result-percentage">${percentage}%</span>
                        </div>
                    </div>
                    <div class="result-bar-container">
                        <div class="result-bar ${isWinner ? 'winner' : ''}" style="width: ${percentage}%">
                            ${percentage > 15 ? percentage + '%' : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    sharePoll() {
        const url = window.location.href;
        
        if (navigator.share) {
            navigator.share({
                title: 'Vote on my poll!',
                text: this.currentPoll.question,
                url: url
            }).catch(err => {
                // User cancelled share
                if (err.name !== 'AbortError') {
                    this.copyToClipboard(url);
                }
            });
        } else {
            this.copyToClipboard(url);
        }
    }

    copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        this.showToast('Link copied to clipboard!', 'success');
    }

    getUserId() {
        let userId = localStorage.getItem('livepoll_user_id');
        if (!userId) {
            userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('livepoll_user_id', userId);
        }
        return userId;
    }

    showVotePage() {
        document.getElementById('createPage').classList.remove('active');
        document.getElementById('votePage').classList.add('active');
    }

    showLoading(show) {
        const loadingState = document.getElementById('loadingState');
        if (show) {
            loadingState.classList.add('active');
        } else {
            loadingState.classList.remove('active');
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new LivePollApp();
});
