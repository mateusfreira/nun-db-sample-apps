/**
 * Personal Finance Manager - Client Application
 * Real-time personal finance management with NunDB
 */

class PersonalFinanceApp {
    constructor() {
        // Check for URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        this.userId = urlParams.get('userId') || this.generateUserId();
        this.mockMode = urlParams.get('mock') === 'true' || window.FINANCE_MOCK_MODE;
        this.baseUrl = window.location.origin;
        this.accounts = new Map();
        this.transactions = new Map();
        this.isConnected = false;
        
        this.init();
    }

    generateUserId() {
        // Check if user ID exists in localStorage
        let userId = localStorage.getItem('finance_user_id');
        if (!userId) {
            userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
            localStorage.setItem('finance_user_id', userId);
        }
        return userId;
    }

    buildApiUrl(endpoint) {
        const params = new URLSearchParams();
        params.set('userId', this.userId);
        if (this.mockMode) {
            params.set('mock', 'true');
        }
        return `${this.baseUrl}${endpoint}?${params.toString()}`;
    }

    async init() {
        this.setupEventListeners();
        await this.checkConnection();
        await this.loadInitialData();
        this.showDashboard();
    }

    setupEventListeners() {
        // Create Account
        document.getElementById('createAccountBtn').addEventListener('click', () => {
            this.showCreateAccountModal();
        });

        document.getElementById('createAccountForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateAccount();
        });

        // Create Transaction
        document.getElementById('createTransactionBtn').addEventListener('click', () => {
            this.showCreateTransactionModal();
        });

        document.getElementById('createTransactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateTransaction();
        });

        // Reset Data
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.handleResetData();
        });

        // Transaction Filter
        document.getElementById('transactionFilter').addEventListener('change', (e) => {
            this.filterTransactions(e.target.value);
        });

        // Modal close events
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModals();
            });
        });

        // Close modals on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModals();
                }
            });
        });

        // Auto-update every 30 seconds
        setInterval(() => {
            this.loadInitialData();
        }, 30000);
    }

    async checkConnection() {
        try {
            const response = await fetch(this.buildApiUrl('/api/status'));
            if (response.ok) {
                const status = await response.json();
                this.isConnected = status.isConnected;
                this.updateConnectionStatus('connected', 'Connected');
                document.getElementById('userId').textContent = `User: ${this.userId}`;
            } else {
                throw new Error('Connection failed');
            }
        } catch (error) {
            console.error('Connection check failed:', error);
            this.updateConnectionStatus('error', 'Connection Error');
        }
    }

    updateConnectionStatus(status, message) {
        const statusEl = document.getElementById('connectionStatus');
        const indicator = statusEl.querySelector('.status-indicator');
        const text = statusEl.querySelector('.status-text');
        
        indicator.className = `status-indicator ${status}`;
        text.textContent = message;
    }

    async loadInitialData() {
        if (!this.isConnected) return;

        try {
            await Promise.all([
                this.loadFinancialSummary(),
                this.loadAccounts(),
                this.loadTransactions()
            ]);
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showNotification('Failed to load data', 'error');
        }
    }

    async loadFinancialSummary() {
        try {
            const response = await fetch(this.buildApiUrl('/api/analysis/summary'));
            if (!response.ok) throw new Error('Failed to load summary');
            
            const summary = await response.json();
            this.updateFinancialSummary(summary);
        } catch (error) {
            console.error('Failed to load financial summary:', error);
        }
    }

    updateFinancialSummary(summary) {
        document.getElementById('netWorth').textContent = this.formatCurrency(summary.netWorth);
        document.getElementById('totalAssets').textContent = this.formatCurrency(summary.totalAssets);
        document.getElementById('totalLiabilities').textContent = this.formatCurrency(summary.totalLiabilities);
        document.getElementById('monthlyIncome').textContent = this.formatCurrency(summary.monthlyIncome);
        document.getElementById('monthlyExpenses').textContent = this.formatCurrency(summary.monthlyExpenses);
        document.getElementById('monthlySavings').textContent = this.formatCurrency(summary.monthlySavings);

        // Add color classes
        this.setValueColor('netWorth', summary.netWorth);
        this.setValueColor('monthlySavings', summary.monthlySavings);
    }

    setValueColor(elementId, value) {
        const element = document.getElementById(elementId);
        element.classList.remove('positive', 'negative');
        if (value > 0) {
            element.classList.add('positive');
        } else if (value < 0) {
            element.classList.add('negative');
        }
    }

    async loadAccounts() {
        try {
            const response = await fetch(this.buildApiUrl('/api/accounts/hierarchy?userId=${this.userId}`);
            if (!response.ok) throw new Error('Failed to load accounts');
            
            const accounts = await response.json();
            this.renderAccountsHierarchy(accounts);
            this.updateAccountSelects(accounts);
        } catch (error) {
            console.error('Failed to load accounts:', error);
        }
    }

    renderAccountsHierarchy(accounts) {
        const container = document.getElementById('accountsHierarchy');
        
        if (accounts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No accounts created yet. Create your first account to get started!</p>
                </div>
            `;
            return;
        }

        const renderAccount = (account, level = 0) => {
            const levelClass = level === 0 ? '' : level === 1 ? 'child' : 'grandchild';
            
            let html = `
                <div class="account-item ${levelClass}" data-account-id="${account.id}">
                    <div class="account-info">
                        <div class="account-name">${this.escapeHtml(account.name)}</div>
                        <div class="account-details">
                            <span>Type: ${account.type}</span>
                            <span>Currency: ${account.currency}</span>
                        </div>
                    </div>
                    <div class="account-balance">${this.formatCurrency(account.balance)}</div>
                    <div class="account-actions">
                        <button class="btn btn-icon btn-small" onclick="app.editAccount('${account.id}')" title="Edit">
                            ✏️
                        </button>
                        <button class="btn btn-icon btn-small" onclick="app.deleteAccount('${account.id}')" title="Delete">
                            🗑️
                        </button>
                    </div>
                </div>
            `;

            if (account.children && account.children.length > 0) {
                account.children.forEach(child => {
                    html += renderAccount(child, level + 1);
                });
            }

            return html;
        };

        container.innerHTML = accounts.map(account => renderAccount(account)).join('');
    }

    updateAccountSelects(accounts) {
        const flatAccounts = this.flattenAccounts(accounts);
        
        // Update parent account select
        const parentSelect = document.getElementById('parentAccount');
        parentSelect.innerHTML = '<option value="">None (Root Account)</option>';
        flatAccounts.forEach(account => {
            parentSelect.innerHTML += `<option value="${account.id}">${account.name}</option>`;
        });

        // Update transaction account selects
        const fromAccountSelect = document.getElementById('fromAccount');
        const toAccountSelect = document.getElementById('toAccount');
        const transactionFilter = document.getElementById('transactionFilter');
        
        fromAccountSelect.innerHTML = '<option value="">Select Account</option>';
        toAccountSelect.innerHTML = '<option value="">None (External)</option>';
        transactionFilter.innerHTML = '<option value="">All Accounts</option>';
        
        flatAccounts.forEach(account => {
            const option = `<option value="${account.id}">${account.name}</option>`;
            fromAccountSelect.innerHTML += option;
            toAccountSelect.innerHTML += option;
            transactionFilter.innerHTML += option;
        });
    }

    flattenAccounts(accounts) {
        let flat = [];
        accounts.forEach(account => {
            flat.push(account);
            if (account.children) {
                flat = flat.concat(this.flattenAccounts(account.children));
            }
        });
        return flat;
    }

    async loadTransactions() {
        try {
            const response = await fetch(this.buildApiUrl('/api/transactions?userId=${this.userId}&limit=50`);
            if (!response.ok) throw new Error('Failed to load transactions');
            
            const transactions = await response.json();
            this.renderTransactions(transactions);
        } catch (error) {
            console.error('Failed to load transactions:', error);
        }
    }

    renderTransactions(transactions) {
        const container = document.getElementById('transactionsList');
        
        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No transactions yet. Create your first transaction!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = transactions.map(transaction => `
            <div class="transaction-item" data-transaction-id="${transaction.id}">
                <div class="transaction-info">
                    <div class="transaction-description">${this.escapeHtml(transaction.description)}</div>
                    <div class="transaction-details">
                        <span>Category: ${transaction.category}</span>
                        <span>Date: ${this.formatDate(transaction.date)}</span>
                        <span>From: ${transaction.fromAccountId}</span>
                        ${transaction.toAccountId ? `<span>To: ${transaction.toAccountId}</span>` : ''}
                    </div>
                </div>
                <div class="transaction-amount ${transaction.amount >= 0 ? 'positive' : 'negative'}">
                    ${this.formatCurrency(transaction.amount)}
                </div>
                <div class="transaction-actions">
                    <button class="btn btn-icon btn-small" onclick="app.editTransaction('${transaction.id}')" title="Edit">
                        ✏️
                    </button>
                    <button class="btn btn-icon btn-small" onclick="app.deleteTransaction('${transaction.id}')" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    showDashboard() {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
    }

    showCreateAccountModal() {
        const modal = document.getElementById('createAccountModal');
        modal.classList.add('show');
        document.getElementById('accountName').focus();
    }

    async handleCreateAccount() {
        const form = document.getElementById('createAccountForm');
        const formData = new FormData(form);
        
        const accountData = {
            name: formData.get('name'),
            type: formData.get('type'),
            parentId: formData.get('parentId') || null,
            balance: parseFloat(formData.get('balance')) || 0,
            currency: formData.get('currency')
        };

        try {
            const response = await fetch(this.buildApiUrl('/api/accounts?userId=${this.userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(accountData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create account');
            }

            const account = await response.json();
            this.showNotification(`Account "${account.name}" created successfully!`, 'success');
            this.closeModals();
            form.reset();
            await this.loadInitialData();
        } catch (error) {
            console.error('Failed to create account:', error);
            this.showNotification(error.message, 'error');
        }
    }

    showCreateTransactionModal() {
        const modal = document.getElementById('createTransactionModal');
        modal.classList.add('show');
        
        // Set today's date as default
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('transactionDate').value = today;
        
        document.getElementById('transactionDescription').focus();
    }

    async handleCreateTransaction() {
        const form = document.getElementById('createTransactionForm');
        const formData = new FormData(form);
        
        const transactionData = {
            description: formData.get('description'),
            amount: parseFloat(formData.get('amount')),
            fromAccountId: formData.get('fromAccountId'),
            toAccountId: formData.get('toAccountId') || null,
            category: formData.get('category'),
            date: formData.get('date') ? new Date(formData.get('date')).getTime() : Date.now()
        };

        try {
            const response = await fetch(this.buildApiUrl('/api/transactions?userId=${this.userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transactionData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create transaction');
            }

            const transaction = await response.json();
            this.showNotification(`Transaction "${transaction.description}" created successfully!`, 'success');
            this.closeModals();
            form.reset();
            await this.loadInitialData();
        } catch (error) {
            console.error('Failed to create transaction:', error);
            this.showNotification(error.message, 'error');
        }
    }

    async handleResetData() {
        if (!confirm('Are you sure you want to reset all your financial data? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(this.buildApiUrl('/api/reset?userId=${this.userId}`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Failed to reset data');
            }

            this.showNotification('All data has been reset successfully!', 'success');
            await this.loadInitialData();
        } catch (error) {
            console.error('Failed to reset data:', error);
            this.showNotification('Failed to reset data', 'error');
        }
    }

    async deleteAccount(accountId) {
        if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(this.buildApiUrl('/api/accounts/${accountId}?userId=${this.userId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete account');
            }

            this.showNotification('Account deleted successfully!', 'success');
            await this.loadInitialData();
        } catch (error) {
            console.error('Failed to delete account:', error);
            this.showNotification(error.message, 'error');
        }
    }

    async deleteTransaction(transactionId) {
        if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(this.buildApiUrl('/api/transactions/${transactionId}?userId=${this.userId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete transaction');
            }

            this.showNotification('Transaction deleted successfully!', 'success');
            await this.loadInitialData();
        } catch (error) {
            console.error('Failed to delete transaction:', error);
            this.showNotification(error.message, 'error');
        }
    }

    async filterTransactions(accountId) {
        try {
            let url = this.buildApiUrl('/api/transactions?userId=${this.userId}&limit=50`;
            if (accountId) {
                url += `&accountId=${accountId}`;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to filter transactions');
            
            const transactions = await response.json();
            this.renderTransactions(transactions);
        } catch (error) {
            console.error('Failed to filter transactions:', error);
            this.showNotification('Failed to filter transactions', 'error');
        }
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications');
        const notification = document.createElement('div');
        
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="notification-message">${this.escapeHtml(message)}</div>
        `;

        container.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Remove after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Placeholder methods for edit functionality
    editAccount(accountId) {
        this.showNotification('Edit account functionality coming soon!', 'info');
    }

    editTransaction(transactionId) {
        this.showNotification('Edit transaction functionality coming soon!', 'info');
    }
}

// Initialize the application
window.app = new PersonalFinanceApp();