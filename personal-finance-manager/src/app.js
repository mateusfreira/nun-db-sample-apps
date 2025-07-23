import { getDatabase, resetDatabase } from './database.js';
import { AccountManager } from './accounts.js';
import { TransactionManager } from './transactions.js';

/**
 * Personal Finance Manager - Main Application Class
 * Manages real-time personal finance with hierarchical accounts and transactions
 */
export class PersonalFinanceManager {
    constructor(config = {}) {
        this.userId = config.userId || this.generateUserId();
        this.config = config;
        
        // Initialize database with configuration
        this.db = getDatabase({
            url: config.dbUrl || 'wss://ws-staging.nundb.org/',
            db: config.dbName || 'personal-finance-demo',
            token: config.dbToken || 'demo-token',
            user: this.userId,
            mockMode: config.mockMode || false
        });

        this.accountManager = new AccountManager(this.userId);
        this.transactionManager = new TransactionManager(this.userId);
        
        this.isConnected = false;
        this.listeners = new Map();
        
        // Real-time update handlers
        this.onAccountUpdate = null;
        this.onTransactionUpdate = null;
        this.onBalanceUpdate = null;
        this.onConnectionUpdate = null;
    }

    /**
     * Generate unique user ID
     */
    generateUserId() {
        return `user_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            console.log(`Initializing Personal Finance Manager for user: ${this.userId}`);
            
            // Connect to database
            await this.db.connect();
            this.isConnected = true;
            
            // Set up real-time listeners
            await this._setupRealTimeListeners();
            
            // Notify connection status
            if (this.onConnectionUpdate) {
                this.onConnectionUpdate({
                    status: 'connected',
                    userId: this.userId,
                    dbConfig: this.db.getConnectionStatus()
                });
            }
            
            console.log('Personal Finance Manager initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize Personal Finance Manager:', error);
            this.isConnected = false;
            
            if (this.onConnectionUpdate) {
                this.onConnectionUpdate({
                    status: 'error',
                    error: error.message,
                    userId: this.userId
                });
            }
            
            throw error;
        }
    }

    /**
     * Account Management Methods
     */
    async createAccount(accountData) {
        this._ensureConnected();
        return this.accountManager.createAccount(accountData);
    }

    async getAccount(accountId) {
        this._ensureConnected();
        return this.accountManager.getAccount(accountId);
    }

    async getAllAccounts() {
        this._ensureConnected();
        return this.accountManager.getAllAccounts();
    }

    async updateAccount(accountId, updates) {
        this._ensureConnected();
        return this.accountManager.updateAccount(accountId, updates);
    }

    async deleteAccount(accountId) {
        this._ensureConnected();
        return this.accountManager.deleteAccount(accountId);
    }

    async getAccountHierarchy() {
        this._ensureConnected();
        return this.accountManager.getAccountHierarchy();
    }

    async calculateTotalBalance(accountId) {
        this._ensureConnected();
        return this.accountManager.calculateTotalBalance(accountId);
    }

    /**
     * Transaction Management Methods
     */
    async createTransaction(transactionData) {
        this._ensureConnected();
        return this.transactionManager.createTransaction(transactionData);
    }

    async getTransaction(transactionId) {
        this._ensureConnected();
        return this.transactionManager.getTransaction(transactionId);
    }

    async getAllTransactions(options = {}) {
        this._ensureConnected();
        return this.transactionManager.getAllTransactions(options);
    }

    async getTransactionsForAccount(accountId, options = {}) {
        this._ensureConnected();
        return this.transactionManager.getTransactionsForAccount(accountId, options);
    }

    async updateTransaction(transactionId, updates) {
        this._ensureConnected();
        return this.transactionManager.updateTransaction(transactionId, updates);
    }

    async deleteTransaction(transactionId) {
        this._ensureConnected();
        return this.transactionManager.deleteTransaction(transactionId);
    }

    async getBalanceHistory(accountId, options = {}) {
        this._ensureConnected();
        return this.transactionManager.getBalanceHistory(accountId, options);
    }

    async getSpendingByCategory(options = {}) {
        this._ensureConnected();
        return this.transactionManager.getSpendingByCategory(options);
    }

    /**
     * Financial Analysis Methods
     */
    async getFinancialSummary() {
        this._ensureConnected();
        
        const [accounts, transactions] = await Promise.all([
            this.getAllAccounts(),
            this.getAllTransactions()
        ]);

        // Categorize accounts
        const accountsByType = {
            asset: accounts.filter(acc => acc.type === 'asset'),
            liability: accounts.filter(acc => acc.type === 'liability'),
            income: accounts.filter(acc => acc.type === 'income'),
            expense: accounts.filter(acc => acc.type === 'expense')
        };

        // Calculate totals
        const totalAssets = accountsByType.asset.reduce((sum, acc) => sum + acc.balance, 0);
        const totalLiabilities = accountsByType.liability.reduce((sum, acc) => sum + acc.balance, 0);
        const netWorth = totalAssets - totalLiabilities;

        // Calculate monthly income/expenses
        const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const recentTransactions = transactions.filter(txn => txn.date >= oneMonthAgo);
        
        const monthlyIncome = recentTransactions
            .filter(txn => txn.amount > 0)
            .reduce((sum, txn) => sum + txn.amount, 0);
            
        const monthlyExpenses = recentTransactions
            .filter(txn => txn.amount < 0)
            .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);

        return {
            netWorth,
            totalAssets,
            totalLiabilities,
            monthlyIncome,
            monthlyExpenses,
            monthlySavings: monthlyIncome - monthlyExpenses,
            accountsByType,
            accountCount: accounts.length,
            transactionCount: transactions.length,
            lastTransactionDate: transactions.length > 0 ? 
                Math.max(...transactions.map(txn => txn.date)) : null
        };
    }

    async getCashFlowAnalysis(periodDays = 30) {
        this._ensureConnected();
        
        const startDate = Date.now() - (periodDays * 24 * 60 * 60 * 1000);
        const transactions = await this.getAllTransactions({
            startDate,
            sortBy: 'date',
            sortOrder: 'asc'
        });

        const dailyCashFlow = new Map();
        
        for (const txn of transactions) {
            const dayKey = new Date(txn.date).toISOString().split('T')[0];
            const existing = dailyCashFlow.get(dayKey) || { income: 0, expenses: 0, net: 0 };
            
            if (txn.amount > 0) {
                existing.income += txn.amount;
            } else {
                existing.expenses += Math.abs(txn.amount);
            }
            
            existing.net = existing.income - existing.expenses;
            dailyCashFlow.set(dayKey, existing);
        }

        return Array.from(dailyCashFlow.entries())
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * Real-time Event Handlers
     */
    setAccountUpdateHandler(handler) {
        this.onAccountUpdate = handler;
    }

    setTransactionUpdateHandler(handler) {
        this.onTransactionUpdate = handler;
    }

    setBalanceUpdateHandler(handler) {
        this.onBalanceUpdate = handler;
    }

    setConnectionUpdateHandler(handler) {
        this.onConnectionUpdate = handler;
    }

    /**
     * Utility Methods
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            userId: this.userId,
            database: this.db.getConnectionStatus()
        };
    }

    async disconnect() {
        this.isConnected = false;
        
        // Clear listeners
        this.listeners.clear();
        
        // Disconnect database
        this.db.disconnect();
        
        if (this.onConnectionUpdate) {
            this.onConnectionUpdate({
                status: 'disconnected',
                userId: this.userId
            });
        }
        
        console.log('Personal Finance Manager disconnected');
    }

    async reset() {
        await this.disconnect();
        resetDatabase();
        console.log('Personal Finance Manager reset');
    }

    // Private helper methods

    _ensureConnected() {
        if (!this.isConnected) {
            throw new Error('Personal Finance Manager not connected. Call initialize() first.');
        }
    }

    async _setupRealTimeListeners() {
        // Listen for account updates
        const accountUpdateKey = `user:${this.userId}:account_updates`;
        await this.db.watch(accountUpdateKey, (data) => {
            if (this.onAccountUpdate && data.value) {
                this.onAccountUpdate(data.value);
            }
        });

        // Listen for transaction updates
        const transactionUpdateKey = `user:${this.userId}:transaction_updates`;
        await this.db.watch(transactionUpdateKey, (data) => {
            if (this.onTransactionUpdate && data.value) {
                this.onTransactionUpdate(data.value);
            }
        });

        // Listen for balance updates
        const balanceUpdateKey = `user:${this.userId}:balance_updates`;
        await this.db.watch(balanceUpdateKey, (data) => {
            if (this.onBalanceUpdate && data.value) {
                this.onBalanceUpdate(data.value);
            }
        });

        console.log('Real-time listeners set up successfully');
    }
}

/**
 * Convenience function to create and initialize a new finance manager
 */
export async function createFinanceManager(config = {}) {
    const manager = new PersonalFinanceManager(config);
    await manager.initialize();
    return manager;
}