import { getDatabase } from './database.js';
import { AccountManager } from './accounts.js';

/**
 * Transaction management with real-time balance updates
 */
export class TransactionManager {
    constructor(userId) {
        this.userId = userId;
        this.db = getDatabase();
        this.accountManager = new AccountManager(userId);
        this.transactions = new Map();
    }

    /**
     * Generate unique transaction ID
     */
    generateTransactionId() {
        return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }

    /**
     * Create a new transaction
     */
    async createTransaction(transactionData) {
        const transaction = {
            id: this.generateTransactionId(),
            description: transactionData.description,
            amount: parseFloat(transactionData.amount),
            fromAccountId: transactionData.fromAccountId,
            toAccountId: transactionData.toAccountId || null,
            category: transactionData.category || 'general',
            date: transactionData.date || Date.now(),
            userId: this.userId,
            created: Date.now(),
            updated: Date.now(),
            metadata: transactionData.metadata || {}
        };

        // Validate transaction data
        await this._validateTransaction(transaction);

        // Store transaction
        const transactionKey = `user:${this.userId}:transaction:${transaction.id}`;
        await this.db.set(transactionKey, transaction);

        // Add to user's transaction list
        await this._addToTransactionList(transaction.id);

        // Update account balances
        await this._updateAccountBalances(transaction);

        // Update local cache
        this.transactions.set(transaction.id, transaction);

        // Broadcast transaction creation
        await this._broadcastTransactionUpdate('created', transaction);

        console.log(`Created transaction: ${transaction.description} (${transaction.id})`);
        return transaction;
    }

    /**
     * Get transaction by ID
     */
    async getTransaction(transactionId) {
        // Check cache first
        if (this.transactions.has(transactionId)) {
            return this.transactions.get(transactionId);
        }

        try {
            const transactionKey = `user:${this.userId}:transaction:${transactionId}`;
            const result = await this.db.get(transactionKey);
            
            if (result && result.value) {
                this.transactions.set(transactionId, result.value);
                return result.value;
            }
            return null;
        } catch (error) {
            console.error(`Failed to get transaction ${transactionId}:`, error);
            return null;
        }
    }

    /**
     * Get all transactions for the user
     */
    async getAllTransactions(options = {}) {
        try {
            const transactionListKey = `user:${this.userId}:transactions`;
            const result = await this.db.get(transactionListKey);
            
            if (!result || !result.value) {
                return [];
            }

            const transactionIds = Array.isArray(result.value) ? result.value : [result.value];
            let transactions = [];

            for (const transactionId of transactionIds) {
                const transaction = await this.getTransaction(transactionId);
                if (transaction) {
                    transactions.push(transaction);
                }
            }

            // Apply filters and sorting
            transactions = this._applyFilters(transactions, options);
            transactions = this._applySorting(transactions, options);
            transactions = this._applyPagination(transactions, options);

            return transactions;
        } catch (error) {
            console.error('Failed to get all transactions:', error);
            return [];
        }
    }

    /**
     * Get transactions for a specific account
     */
    async getTransactionsForAccount(accountId, options = {}) {
        const allTransactions = await this.getAllTransactions();
        
        const accountTransactions = allTransactions.filter(txn => 
            txn.fromAccountId === accountId || txn.toAccountId === accountId
        );

        return this._applySorting(accountTransactions, options);
    }

    /**
     * Update transaction
     */
    async updateTransaction(transactionId, updates) {
        const transaction = await this.getTransaction(transactionId);
        if (!transaction) {
            throw new Error(`Transaction not found: ${transactionId}`);
        }

        if (transaction.userId !== this.userId) {
            throw new Error('Cannot update transaction owned by different user');
        }

        // Revert old balance changes
        await this._revertAccountBalances(transaction);

        const updatedTransaction = {
            ...transaction,
            ...updates,
            id: transaction.id, // Ensure ID cannot be changed
            userId: transaction.userId, // Ensure userId cannot be changed
            created: transaction.created, // Ensure created timestamp cannot be changed
            updated: Date.now()
        };

        // Validate updated transaction
        await this._validateTransaction(updatedTransaction);

        // Store updated transaction
        const transactionKey = `user:${this.userId}:transaction:${transactionId}`;
        await this.db.set(transactionKey, updatedTransaction);

        // Apply new balance changes
        await this._updateAccountBalances(updatedTransaction);

        // Update local cache
        this.transactions.set(transactionId, updatedTransaction);

        // Broadcast transaction update
        await this._broadcastTransactionUpdate('updated', updatedTransaction);

        console.log(`Updated transaction: ${updatedTransaction.description} (${transactionId})`);
        return updatedTransaction;
    }

    /**
     * Delete transaction
     */
    async deleteTransaction(transactionId) {
        const transaction = await this.getTransaction(transactionId);
        if (!transaction) {
            throw new Error(`Transaction not found: ${transactionId}`);
        }

        if (transaction.userId !== this.userId) {
            throw new Error('Cannot delete transaction owned by different user');
        }

        // Revert balance changes
        await this._revertAccountBalances(transaction);

        // Remove from user's transaction list
        await this._removeFromTransactionList(transactionId);

        // Delete transaction data
        const transactionKey = `user:${this.userId}:transaction:${transactionId}`;
        await this.db.delete(transactionKey);

        // Remove from local cache
        this.transactions.delete(transactionId);

        // Broadcast transaction deletion
        await this._broadcastTransactionUpdate('deleted', { id: transactionId, userId: this.userId });

        console.log(`Deleted transaction: ${transaction.description} (${transactionId})`);
        return true;
    }

    /**
     * Get account balance history
     */
    async getBalanceHistory(accountId, options = {}) {
        const transactions = await this.getTransactionsForAccount(accountId, {
            sortBy: 'date',
            sortOrder: 'asc'
        });

        const account = await this.accountManager.getAccount(accountId);
        if (!account) {
            throw new Error(`Account not found: ${accountId}`);
        }

        let runningBalance = account.balance;
        const history = [];

        // Work backwards from current balance
        for (let i = transactions.length - 1; i >= 0; i--) {
            const txn = transactions[i];
            let amount = 0;

            if (txn.fromAccountId === accountId) {
                amount = -Math.abs(txn.amount);
                runningBalance -= amount;
            }
            if (txn.toAccountId === accountId) {
                amount = Math.abs(txn.amount);
                runningBalance -= amount;
            }

            history.unshift({
                date: txn.date,
                transaction: txn,
                amount,
                balance: runningBalance
            });
        }

        return history;
    }

    /**
     * Get spending by category
     */
    async getSpendingByCategory(options = {}) {
        const transactions = await this.getAllTransactions(options);
        const categoryTotals = new Map();

        for (const txn of transactions) {
            if (txn.amount < 0) { // Only count expenses
                const category = txn.category || 'uncategorized';
                const current = categoryTotals.get(category) || 0;
                categoryTotals.set(category, current + Math.abs(txn.amount));
            }
        }

        return Array.from(categoryTotals.entries())
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount);
    }

    /**
     * Watch for transaction updates
     */
    async watchTransactions(callback) {
        const watchKey = `user:${this.userId}:transaction_updates`;
        return this.db.watch(watchKey, callback);
    }

    // Private helper methods

    async _validateTransaction(transaction) {
        if (!transaction.description || transaction.description.trim().length === 0) {
            throw new Error('Transaction description is required');
        }

        if (isNaN(transaction.amount) || transaction.amount === 0) {
            throw new Error('Transaction amount must be a non-zero number');
        }

        if (!transaction.fromAccountId) {
            throw new Error('Source account is required');
        }

        // Validate source account exists and belongs to user
        const fromAccount = await this.accountManager.getAccount(transaction.fromAccountId);
        if (!fromAccount) {
            throw new Error(`Source account not found: ${transaction.fromAccountId}`);
        }

        // If destination account specified, validate it
        if (transaction.toAccountId) {
            const toAccount = await this.accountManager.getAccount(transaction.toAccountId);
            if (!toAccount) {
                throw new Error(`Destination account not found: ${transaction.toAccountId}`);
            }
        }

        // Validate date
        if (transaction.date && (isNaN(transaction.date) || transaction.date > Date.now())) {
            throw new Error('Invalid transaction date');
        }
    }

    async _updateAccountBalances(transaction) {
        // Debit from source account
        await this.accountManager.updateBalance(transaction.fromAccountId, -Math.abs(transaction.amount));

        // Credit to destination account (if specified)
        if (transaction.toAccountId) {
            await this.accountManager.updateBalance(transaction.toAccountId, Math.abs(transaction.amount));
        }
    }

    async _revertAccountBalances(transaction) {
        // Reverse the balance changes
        await this.accountManager.updateBalance(transaction.fromAccountId, Math.abs(transaction.amount));

        if (transaction.toAccountId) {
            await this.accountManager.updateBalance(transaction.toAccountId, -Math.abs(transaction.amount));
        }
    }

    async _addToTransactionList(transactionId) {
        const transactionListKey = `user:${this.userId}:transactions`;
        
        try {
            const result = await this.db.get(transactionListKey);
            let transactionIds = [];
            
            if (result && result.value) {
                transactionIds = Array.isArray(result.value) ? result.value : [result.value];
            }
            
            if (!transactionIds.includes(transactionId)) {
                transactionIds.push(transactionId);
                await this.db.set(transactionListKey, transactionIds);
            }
        } catch (error) {
            console.error('Failed to add transaction to list:', error);
            await this.db.set(transactionListKey, [transactionId]);
        }
    }

    async _removeFromTransactionList(transactionId) {
        const transactionListKey = `user:${this.userId}:transactions`;
        
        try {
            const result = await this.db.get(transactionListKey);
            if (result && result.value) {
                let transactionIds = Array.isArray(result.value) ? result.value : [result.value];
                transactionIds = transactionIds.filter(id => id !== transactionId);
                await this.db.set(transactionListKey, transactionIds);
            }
        } catch (error) {
            console.error('Failed to remove transaction from list:', error);
        }
    }

    async _broadcastTransactionUpdate(action, transaction) {
        const updateKey = `user:${this.userId}:transaction_updates`;
        const updateData = {
            action,
            transaction,
            timestamp: Date.now()
        };
        
        await this.db.set(updateKey, Date.now().toString(), updateData);
    }

    _applyFilters(transactions, options) {
        let filtered = transactions;

        if (options.accountId) {
            filtered = filtered.filter(txn => 
                txn.fromAccountId === options.accountId || txn.toAccountId === options.accountId
            );
        }

        if (options.category) {
            filtered = filtered.filter(txn => txn.category === options.category);
        }

        if (options.startDate) {
            filtered = filtered.filter(txn => txn.date >= options.startDate);
        }

        if (options.endDate) {
            filtered = filtered.filter(txn => txn.date <= options.endDate);
        }

        if (options.minAmount !== undefined) {
            filtered = filtered.filter(txn => Math.abs(txn.amount) >= options.minAmount);
        }

        if (options.maxAmount !== undefined) {
            filtered = filtered.filter(txn => Math.abs(txn.amount) <= options.maxAmount);
        }

        return filtered;
    }

    _applySorting(transactions, options) {
        const sortBy = options.sortBy || 'date';
        const sortOrder = options.sortOrder || 'desc';

        return transactions.sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'date':
                    comparison = a.date - b.date;
                    break;
                case 'amount':
                    comparison = Math.abs(a.amount) - Math.abs(b.amount);
                    break;
                case 'description':
                    comparison = a.description.localeCompare(b.description);
                    break;
                case 'category':
                    comparison = a.category.localeCompare(b.category);
                    break;
                default:
                    comparison = a.created - b.created;
            }

            return sortOrder === 'desc' ? -comparison : comparison;
        });
    }

    _applyPagination(transactions, options) {
        if (options.limit) {
            const offset = options.offset || 0;
            return transactions.slice(offset, offset + options.limit);
        }
        return transactions;
    }
}