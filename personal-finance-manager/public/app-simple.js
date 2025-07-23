/**
 * Personal Finance Manager - Simple Client Application for Testing
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
        this.flatAccountsList = [];
        this.isConnected = false;
        
        console.log('Initializing with userId:', this.userId, 'mockMode:', this.mockMode);
        this.init();
    }

    generateUserId() {
        // Try to get existing user ID from localStorage first
        const existingUserId = localStorage.getItem('finance_user_id');
        if (existingUserId) {
            return existingUserId;
        }
        
        // Generate new user ID and save it
        const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
        localStorage.setItem('finance_user_id', newUserId);
        return newUserId;
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
        const createAccountBtn = document.getElementById('createAccountBtn');
        if (createAccountBtn) {
            createAccountBtn.addEventListener('click', () => {
                this.showCreateAccountModal();
            });
        }

        const createAccountForm = document.getElementById('createAccountForm');
        if (createAccountForm) {
            createAccountForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateAccount();
            });
        }

        // Create Transaction
        const createTransactionBtn = document.getElementById('createTransactionBtn');
        if (createTransactionBtn) {
            createTransactionBtn.addEventListener('click', () => {
                this.showCreateTransactionModal();
            });
        }

        const createTransactionForm = document.getElementById('createTransactionForm');
        if (createTransactionForm) {
            createTransactionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateTransaction();
            });
        }

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
    }

    async checkConnection() {
        try {
            const response = await fetch(this.buildApiUrl('/api/status'));
            if (response.ok) {
                const status = await response.json();
                this.isConnected = status.isConnected;
                this.updateConnectionStatus('connected', 'Connected');
                const userIdEl = document.getElementById('userId');
                if (userIdEl) {
                    userIdEl.textContent = `User: ${this.userId}`;
                }
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
        if (!statusEl) return;
        
        const indicator = statusEl.querySelector('.status-indicator');
        const text = statusEl.querySelector('.status-text');
        
        if (indicator) indicator.className = `status-indicator ${status}`;
        if (text) text.textContent = message;
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
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = this.formatCurrency(value);
        };

        setValue('netWorth', summary.netWorth);
        setValue('totalAssets', summary.totalAssets);
        setValue('totalLiabilities', summary.totalLiabilities);
        setValue('monthlyIncome', summary.monthlyIncome);
        setValue('monthlyExpenses', summary.monthlyExpenses);
        setValue('monthlySavings', summary.monthlySavings);
    }

    async loadAccounts() {
        try {
            const response = await fetch(this.buildApiUrl('/api/accounts/hierarchy'));
            if (!response.ok) throw new Error('Failed to load accounts');
            
            const accounts = await response.json();
            this.renderAccountsHierarchy(accounts);
            
            // Also store flat account list for dropdowns
            this.flatAccountsList = this.flattenAccountsHierarchy(accounts);
            console.log(`Loaded ${this.flatAccountsList.length} accounts for dropdowns`);
        } catch (error) {
            console.error('Failed to load accounts:', error);
        }
    }

    renderAccountsHierarchy(accounts) {
        const container = document.getElementById('accountsHierarchy');
        if (!container) return;
        
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

    flattenAccountsHierarchy(accounts) {
        const flatAccounts = [];
        
        const addAccountAndChildren = (account) => {
            // Add the account without children property to avoid circular references
            const flatAccount = {
                id: account.id,
                name: account.name,
                type: account.type,
                parentId: account.parentId,
                balance: account.balance,
                currency: account.currency
            };
            flatAccounts.push(flatAccount);
            
            // Recursively add children
            if (account.children && account.children.length > 0) {
                account.children.forEach(child => addAccountAndChildren(child));
            }
        };
        
        accounts.forEach(account => addAccountAndChildren(account));
        return flatAccounts;
    }

    populateParentAccountDropdown() {
        const parentAccountSelect = document.getElementById('parentAccount');
        if (!parentAccountSelect) {
            console.warn('Parent account select element not found');
            return;
        }

        // Clear existing options except the default one
        parentAccountSelect.innerHTML = '<option value="">None (Root Account)</option>';

        // Check if we have accounts to populate
        if (!this.flatAccountsList || this.flatAccountsList.length === 0) {
            console.log('No accounts available for parent account dropdown');
            return;
        }

        // Add all accounts as potential parents
        this.flatAccountsList.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = account.name;
            parentAccountSelect.appendChild(option);
        });
        
        console.log(`Populated parent account dropdown with ${this.flatAccountsList.length} accounts`);
    }

    populateTransactionAccountDropdowns() {
        // Check if we have accounts to populate
        if (!this.flatAccountsList || this.flatAccountsList.length === 0) {
            console.log('No accounts available for transaction account dropdowns');
            return;
        }

        // Populate 'From Account' dropdown
        const fromAccountSelect = document.getElementById('fromAccount');
        if (fromAccountSelect) {
            fromAccountSelect.innerHTML = '<option value="">Select Account</option>';
            
            this.flatAccountsList.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.name} (${this.formatCurrency(account.balance)})`;
                fromAccountSelect.appendChild(option);
            });
        } else {
            console.warn('From account select element not found');
        }

        // Populate 'To Account' dropdown
        const toAccountSelect = document.getElementById('toAccount');
        if (toAccountSelect) {
            toAccountSelect.innerHTML = '<option value="">None (External)</option>';
            
            this.flatAccountsList.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.name} (${this.formatCurrency(account.balance)})`;
                toAccountSelect.appendChild(option);
            });
        } else {
            console.warn('To account select element not found');
        }

        // Also populate transaction filter dropdown
        const transactionFilterSelect = document.getElementById('transactionFilter');
        if (transactionFilterSelect) {
            transactionFilterSelect.innerHTML = '<option value="">All Accounts</option>';
            
            this.flatAccountsList.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = account.name;
                transactionFilterSelect.appendChild(option);
            });
        } else {
            console.warn('Transaction filter select element not found');
        }
        
        console.log(`Populated transaction account dropdowns with ${this.flatAccountsList.length} accounts`);
    }

    async loadTransactions() {
        try {
            const response = await fetch(this.buildApiUrl('/api/transactions'));
            if (!response.ok) throw new Error('Failed to load transactions');
            
            const transactions = await response.json();
            this.renderTransactions(transactions);
        } catch (error) {
            console.error('Failed to load transactions:', error);
        }
    }

    renderTransactions(transactions) {
        const container = document.getElementById('transactionsList');
        if (!container) return;
        
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
                    </div>
                </div>
                <div class="transaction-amount ${transaction.amount >= 0 ? 'positive' : 'negative'}">
                    ${this.formatCurrency(transaction.amount)}
                </div>
                <div class="transaction-actions">
                    <button class="btn btn-icon btn-small" onclick="app.deleteTransaction('${transaction.id}')" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    showDashboard() {
        const loading = document.getElementById('loadingScreen');
        const dashboard = document.getElementById('dashboard');
        
        if (loading) loading.style.display = 'none';
        if (dashboard) dashboard.style.display = 'block';
    }

    showCreateAccountModal() {
        const modal = document.getElementById('createAccountModal');
        if (modal) {
            // Populate parent account dropdown
            this.populateParentAccountDropdown();
            
            modal.classList.add('show');
            const nameField = document.getElementById('accountName');
            if (nameField) nameField.focus();
        }
    }

    async handleCreateAccount() {
        const form = document.getElementById('createAccountForm');
        if (!form) return;
        
        const formData = new FormData(form);
        
        const accountData = {
            name: formData.get('name'),
            type: formData.get('type'),
            balance: parseFloat(formData.get('balance')) || 0,
            currency: formData.get('currency') || 'USD',
            parentId: formData.get('parentId') || null
        };

        try {
            const response = await fetch(this.buildApiUrl('/api/accounts'), {
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
            
            // Repopulate dropdowns with updated account list
            this.populateTransactionAccountDropdowns();
        } catch (error) {
            console.error('Failed to create account:', error);
            this.showNotification(error.message, 'error');
        }
    }

    showCreateTransactionModal() {
        const modal = document.getElementById('createTransactionModal');
        if (modal) {
            // Populate account dropdowns
            this.populateTransactionAccountDropdowns();
            
            modal.classList.add('show');
            
            // Set today's date as default
            const today = new Date().toISOString().split('T')[0];
            const dateField = document.getElementById('transactionDate');
            if (dateField) dateField.value = today;
            
            const descField = document.getElementById('transactionDescription');
            if (descField) descField.focus();
        }
    }

    async handleCreateTransaction() {
        const form = document.getElementById('createTransactionForm');
        if (!form) return;
        
        const formData = new FormData(form);
        
        const transactionData = {
            description: formData.get('description'),
            amount: parseFloat(formData.get('amount')),
            fromAccountId: formData.get('fromAccountId'),
            category: formData.get('category') || 'general',
            date: formData.get('date') ? new Date(formData.get('date')).getTime() : Date.now()
        };

        try {
            const response = await fetch(this.buildApiUrl('/api/transactions'), {
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
            
            // Repopulate dropdowns with updated data
            this.populateTransactionAccountDropdowns();
        } catch (error) {
            console.error('Failed to create transaction:', error);
            this.showNotification(error.message, 'error');
        }
    }

    async deleteAccount(accountId) {
        if (!confirm('Are you sure you want to delete this account?')) {
            return;
        }

        try {
            const response = await fetch(this.buildApiUrl(`/api/accounts/${accountId}`), {
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
        if (!confirm('Are you sure you want to delete this transaction?')) {
            return;
        }

        try {
            const response = await fetch(this.buildApiUrl(`/api/transactions/${transactionId}`), {
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

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="notification-message">${this.escapeHtml(message)}</div>
        `;

        container.appendChild(notification);

        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

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
}

// Initialize the application
window.app = new PersonalFinanceApp();