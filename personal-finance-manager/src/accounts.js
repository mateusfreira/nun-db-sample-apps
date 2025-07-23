import { getDatabase } from './database.js';

/**
 * Account management with hierarchical structure and real-time updates
 */
export class AccountManager {
    constructor(userId) {
        this.userId = userId;
        this.db = getDatabase();
        this.accounts = new Map();
        this.listeners = new Map();
    }

    /**
     * Generate unique account ID
     */
    generateAccountId() {
        return `account_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }

    /**
     * Create a new account
     */
    async createAccount(accountData) {
        const account = {
            id: this.generateAccountId(),
            name: accountData.name,
            type: accountData.type, // asset, liability, income, expense
            parentId: accountData.parentId || null,
            balance: accountData.balance || 0,
            currency: accountData.currency || 'USD',
            userId: this.userId,
            created: Date.now(),
            updated: Date.now(),
            metadata: accountData.metadata || {}
        };

        // Validate account type
        const validTypes = ['asset', 'liability', 'income', 'expense'];
        if (!validTypes.includes(account.type)) {
            throw new Error(`Invalid account type: ${account.type}`);
        }

        // Validate parent relationship
        if (account.parentId) {
            const parentAccount = await this.getAccount(account.parentId);
            if (!parentAccount) {
                throw new Error(`Parent account not found: ${account.parentId}`);
            }
            if (parentAccount.userId !== this.userId) {
                throw new Error('Cannot create account under parent owned by different user');
            }
        }

        // Store account
        const accountKey = `user:${this.userId}:account:${account.id}`;
        await this.db.set(accountKey, account);

        // Add to user's account list
        await this._addToAccountList(account.id);

        // Update local cache
        this.accounts.set(account.id, account);

        // Broadcast account creation
        await this._broadcastAccountUpdate('created', account);

        console.log(`Created account: ${account.name} (${account.id})`);
        return account;
    }

    /**
     * Get account by ID
     */
    async getAccount(accountId) {
        // Check cache first
        if (this.accounts.has(accountId)) {
            return this.accounts.get(accountId);
        }

        try {
            const accountKey = `user:${this.userId}:account:${accountId}`;
            const result = await this.db.get(accountKey);
            
            if (result && result.value) {
                this.accounts.set(accountId, result.value);
                return result.value;
            }
            return null;
        } catch (error) {
            console.error(`Failed to get account ${accountId}:`, error);
            return null;
        }
    }

    /**
     * Get all accounts for the user
     */
    async getAllAccounts() {
        try {
            const accountListKey = `user:${this.userId}:accounts`;
            const result = await this.db.get(accountListKey);
            
            if (!result || !result.value) {
                return [];
            }

            const accountIds = Array.isArray(result.value) ? result.value : [result.value];
            const accounts = [];

            for (const accountId of accountIds) {
                const account = await this.getAccount(accountId);
                if (account) {
                    accounts.push(account);
                }
            }

            return accounts;
        } catch (error) {
            console.error('Failed to get all accounts:', error);
            return [];
        }
    }

    /**
     * Update account
     */
    async updateAccount(accountId, updates) {
        const account = await this.getAccount(accountId);
        if (!account) {
            throw new Error(`Account not found: ${accountId}`);
        }

        if (account.userId !== this.userId) {
            throw new Error('Cannot update account owned by different user');
        }

        // Validate parent relationship change
        if (updates.parentId !== undefined && updates.parentId !== account.parentId) {
            if (updates.parentId) {
                const parentAccount = await this.getAccount(updates.parentId);
                if (!parentAccount) {
                    throw new Error(`Parent account not found: ${updates.parentId}`);
                }
                if (parentAccount.userId !== this.userId) {
                    throw new Error('Cannot set parent to account owned by different user');
                }
                
                // Prevent circular references
                if (await this._wouldCreateCircularReference(accountId, updates.parentId)) {
                    throw new Error('Cannot create circular parent-child relationship');
                }
            }
        }

        const updatedAccount = {
            ...account,
            ...updates,
            id: account.id, // Ensure ID cannot be changed
            userId: account.userId, // Ensure userId cannot be changed
            created: account.created, // Ensure created timestamp cannot be changed
            updated: Date.now()
        };

        // Store updated account
        const accountKey = `user:${this.userId}:account:${accountId}`;
        await this.db.set(accountKey, updatedAccount);

        // Update local cache
        this.accounts.set(accountId, updatedAccount);

        // Broadcast account update
        await this._broadcastAccountUpdate('updated', updatedAccount);

        console.log(`Updated account: ${updatedAccount.name} (${accountId})`);
        return updatedAccount;
    }

    /**
     * Delete account
     */
    async deleteAccount(accountId) {
        const account = await this.getAccount(accountId);
        if (!account) {
            throw new Error(`Account not found: ${accountId}`);
        }

        if (account.userId !== this.userId) {
            throw new Error('Cannot delete account owned by different user');
        }

        // Check for child accounts
        const allAccounts = await this.getAllAccounts();
        const childAccounts = allAccounts.filter(acc => acc.parentId === accountId);
        if (childAccounts.length > 0) {
            throw new Error('Cannot delete account with child accounts. Delete or reassign child accounts first.');
        }

        // Remove from user's account list
        await this._removeFromAccountList(accountId);

        // Delete account data
        const accountKey = `user:${this.userId}:account:${accountId}`;
        await this.db.delete(accountKey);

        // Remove from local cache
        this.accounts.delete(accountId);

        // Broadcast account deletion
        await this._broadcastAccountUpdate('deleted', { id: accountId, userId: this.userId });

        console.log(`Deleted account: ${account.name} (${accountId})`);
        return true;
    }

    /**
     * Get account hierarchy (accounts organized by parent-child relationships)
     */
    async getAccountHierarchy() {
        const allAccounts = await this.getAllAccounts();
        const accountMap = new Map(allAccounts.map(acc => [acc.id, acc]));
        
        // Build hierarchy
        const rootAccounts = [];
        const addChildren = (account) => {
            const children = allAccounts.filter(acc => acc.parentId === account.id);
            account.children = children.map(child => {
                const childWithChildren = { ...child };
                addChildren(childWithChildren);
                return childWithChildren;
            });
            return account;
        };

        // Find root accounts (no parent) and build their hierarchies
        for (const account of allAccounts) {
            if (!account.parentId) {
                rootAccounts.push(addChildren({ ...account }));
            }
        }

        return rootAccounts;
    }

    /**
     * Calculate total balance for account including all children
     */
    async calculateTotalBalance(accountId) {
        const account = await this.getAccount(accountId);
        if (!account) {
            return 0;
        }

        let totalBalance = account.balance;
        
        // Add balances from child accounts
        const allAccounts = await this.getAllAccounts();
        const childAccounts = allAccounts.filter(acc => acc.parentId === accountId);
        
        for (const childAccount of childAccounts) {
            totalBalance += await this.calculateTotalBalance(childAccount.id);
        }

        return totalBalance;
    }

    /**
     * Update account balance (used by transaction manager)
     */
    async updateBalance(accountId, amount) {
        const account = await this.getAccount(accountId);
        if (!account) {
            throw new Error(`Account not found: ${accountId}`);
        }

        const newBalance = account.balance + amount;
        await this.updateAccount(accountId, { balance: newBalance });

        // Propagate balance change to parent accounts
        if (account.parentId) {
            await this._propagateBalanceChange(account.parentId, amount);
        }

        return newBalance;
    }

    /**
     * Watch for account updates
     */
    async watchAccounts(callback) {
        const watchKey = `user:${this.userId}:account_updates`;
        return this.db.watch(watchKey, callback);
    }

    // Private helper methods

    async _addToAccountList(accountId) {
        const accountListKey = `user:${this.userId}:accounts`;
        
        try {
            const result = await this.db.get(accountListKey);
            let accountIds = [];
            
            if (result && result.value) {
                accountIds = Array.isArray(result.value) ? result.value : [result.value];
            }
            
            if (!accountIds.includes(accountId)) {
                accountIds.push(accountId);
                await this.db.set(accountListKey, accountIds);
            }
        } catch (error) {
            console.error('Failed to add account to list:', error);
            // Fallback: try to set just this account
            await this.db.set(accountListKey, [accountId]);
        }
    }

    async _removeFromAccountList(accountId) {
        const accountListKey = `user:${this.userId}:accounts`;
        
        try {
            const result = await this.db.get(accountListKey);
            if (result && result.value) {
                let accountIds = Array.isArray(result.value) ? result.value : [result.value];
                accountIds = accountIds.filter(id => id !== accountId);
                await this.db.set(accountListKey, accountIds);
            }
        } catch (error) {
            console.error('Failed to remove account from list:', error);
        }
    }

    async _broadcastAccountUpdate(action, account) {
        const updateKey = `user:${this.userId}:account_updates`;
        const updateData = {
            action,
            account,
            timestamp: Date.now()
        };
        
        await this.db.set(updateKey, Date.now().toString(), updateData);
    }

    async _wouldCreateCircularReference(accountId, newParentId) {
        // Check if newParentId is a descendant of accountId
        const checkDescendant = async (currentId, targetId) => {
            if (currentId === targetId) {
                return true;
            }
            
            const allAccounts = await this.getAllAccounts();
            const children = allAccounts.filter(acc => acc.parentId === currentId);
            
            for (const child of children) {
                if (await checkDescendant(child.id, targetId)) {
                    return true;
                }
            }
            
            return false;
        };

        return await checkDescendant(accountId, newParentId);
    }

    async _propagateBalanceChange(parentId, amount) {
        // This is a simplified propagation - in a real system you might want
        // to track whether parent balances should include child balances
        // For now, we'll just trigger an update event for the parent
        const updateKey = `user:${this.userId}:balance_updates`;
        const updateData = {
            accountId: parentId,
            amount,
            timestamp: Date.now()
        };
        
        await this.db.set(updateKey, Date.now().toString(), updateData);
    }
}