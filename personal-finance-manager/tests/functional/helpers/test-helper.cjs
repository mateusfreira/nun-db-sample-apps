const { expect } = require('@playwright/test');

/**
 * Test helper for Personal Finance Manager
 * Provides utilities for testing account and transaction management
 */
class FinanceTestHelper {
    constructor(page) {
        this.page = page;
        this.baseUrl = 'http://localhost:3000';
    }

    /**
     * Generate unique test user ID with worker isolation
     */
    generateTestUserId(testName) {
        const workerId = process.env.TEST_WORKER_INDEX || '0';
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 5);
        return `test_${testName}_w${workerId}_${timestamp}_${random}`;
    }

    /**
     * Initialize the application with a test user
     */
    async initializeApp(testName, options = {}) {
        const userId = this.generateTestUserId(testName);
        
        // Set mock mode for testing
        await this.page.addInitScript(() => {
            window.FINANCE_MOCK_MODE = true;
        });

        const url = `${this.baseUrl}?userId=${userId}&mock=true`;
        await this.page.goto(url);
        
        // Wait for application to initialize
        await this.waitForConnection();
        await this.waitForDashboard();
        
        return userId;
    }

    /**
     * Wait for database connection
     */
    async waitForConnection(timeout = 10000) {
        await this.page.waitForSelector('.status-indicator.connected', { timeout });
        await expect(this.page.locator('.status-text')).toContainText('Connected');
    }

    /**
     * Wait for dashboard to load
     */
    async waitForDashboard(timeout = 5000) {
        await this.page.waitForSelector('#dashboard', { state: 'visible', timeout });
        await this.page.waitForSelector('.loading-screen', { state: 'hidden', timeout });
    }

    /**
     * Create a new account
     */
    async createAccount(accountData) {
        await this.page.click('#createAccountBtn');
        await this.page.waitForSelector('#createAccountModal.show');

        // Fill form
        await this.page.fill('#accountName', accountData.name);
        await this.page.selectOption('#accountType', accountData.type);
        
        if (accountData.parentId) {
            await this.page.selectOption('#parentAccount', accountData.parentId);
        }
        
        if (accountData.balance !== undefined) {
            await this.page.fill('#initialBalance', accountData.balance.toString());
        }
        
        if (accountData.currency) {
            await this.page.selectOption('#currency', accountData.currency);
        }

        // Submit form
        await this.page.click('#createAccountForm button[type="submit"]');
        
        // Wait for modal to close and success notification
        await this.page.waitForSelector('#createAccountModal', { state: 'hidden' });
        await this.waitForNotification('created successfully');
        
        // Wait for accounts to update
        await this.waitForAccountsUpdate();
    }

    /**
     * Create a new transaction
     */
    async createTransaction(transactionData) {
        await this.page.click('#createTransactionBtn');
        await this.page.waitForSelector('#createTransactionModal.show');

        // Fill form
        await this.page.fill('#transactionDescription', transactionData.description);
        await this.page.fill('#transactionAmount', transactionData.amount.toString());
        await this.page.selectOption('#fromAccount', transactionData.fromAccountId);
        
        if (transactionData.toAccountId) {
            await this.page.selectOption('#toAccount', transactionData.toAccountId);
        }
        
        if (transactionData.category) {
            await this.page.selectOption('#transactionCategory', transactionData.category);
        }
        
        if (transactionData.date) {
            const dateStr = new Date(transactionData.date).toISOString().split('T')[0];
            await this.page.fill('#transactionDate', dateStr);
        }

        // Submit form
        await this.page.click('#createTransactionForm button[type="submit"]');
        
        // Wait for modal to close and success notification
        await this.page.waitForSelector('#createTransactionModal', { state: 'hidden' });
        await this.waitForNotification('created successfully');
        
        // Wait for transactions to update
        await this.waitForTransactionsUpdate();
    }

    /**
     * Get all accounts from the UI
     */
    async getAccounts() {
        const accountItems = await this.page.locator('.account-item').all();
        const accounts = [];

        for (const item of accountItems) {
            const name = await item.locator('.account-name').textContent();
            const balance = await item.locator('.account-balance').textContent();
            const details = await item.locator('.account-details').textContent();
            const accountId = await item.getAttribute('data-account-id');

            accounts.push({
                id: accountId,
                name: name.trim(),
                balance: this.parseCurrency(balance),
                details: details.trim()
            });
        }

        return accounts;
    }

    /**
     * Get all transactions from the UI
     */
    async getTransactions() {
        const transactionItems = await this.page.locator('.transaction-item').all();
        const transactions = [];

        for (const item of transactionItems) {
            const description = await item.locator('.transaction-description').textContent();
            const amount = await item.locator('.transaction-amount').textContent();
            const details = await item.locator('.transaction-details').textContent();
            const transactionId = await item.getAttribute('data-transaction-id');

            transactions.push({
                id: transactionId,
                description: description.trim(),
                amount: this.parseCurrency(amount),
                details: details.trim()
            });
        }

        return transactions;
    }

    /**
     * Get financial summary data
     */
    async getFinancialSummary() {
        return {
            netWorth: this.parseCurrency(await this.page.locator('#netWorth').textContent()),
            totalAssets: this.parseCurrency(await this.page.locator('#totalAssets').textContent()),
            totalLiabilities: this.parseCurrency(await this.page.locator('#totalLiabilities').textContent()),
            monthlyIncome: this.parseCurrency(await this.page.locator('#monthlyIncome').textContent()),
            monthlyExpenses: this.parseCurrency(await this.page.locator('#monthlyExpenses').textContent()),
            monthlySavings: this.parseCurrency(await this.page.locator('#monthlySavings').textContent())
        };
    }

    /**
     * Delete an account by ID
     */
    async deleteAccount(accountId) {
        const deleteBtn = this.page.locator(`[data-account-id="${accountId}"] .account-actions button[title="Delete"]`);
        await deleteBtn.click();
        
        // Confirm deletion in dialog
        this.page.once('dialog', dialog => dialog.accept());
        
        await this.waitForNotification('deleted successfully');
        await this.waitForAccountsUpdate();
    }

    /**
     * Delete a transaction by ID
     */
    async deleteTransaction(transactionId) {
        const deleteBtn = this.page.locator(`[data-transaction-id="${transactionId}"] .transaction-actions button[title="Delete"]`);
        await deleteBtn.click();
        
        // Confirm deletion in dialog
        this.page.once('dialog', dialog => dialog.accept());
        
        await this.waitForNotification('deleted successfully');
        await this.waitForTransactionsUpdate();
    }

    /**
     * Reset all user data
     */
    async resetData() {
        await this.page.click('#resetBtn');
        
        // Confirm reset in dialog
        this.page.once('dialog', dialog => dialog.accept());
        
        await this.waitForNotification('reset successfully');
        await this.waitForDashboard();
    }

    /**
     * Filter transactions by account
     */
    async filterTransactions(accountId) {
        await this.page.selectOption('#transactionFilter', accountId || '');
        await this.waitForTransactionsUpdate();
    }

    /**
     * Wait for notification with specific text
     */
    async waitForNotification(text, timeout = 5000) {
        await this.page.waitForSelector('.notification.show', { timeout });
        await expect(this.page.locator('.notification.show')).toContainText(text);
        
        // Wait for notification to disappear
        await this.page.waitForSelector('.notification.show', { state: 'hidden', timeout: 6000 });
    }

    /**
     * Wait for accounts to update in the UI
     */
    async waitForAccountsUpdate(timeout = 3000) {
        // Wait for any loading states to complete
        await this.page.waitForTimeout(500);
        
        // Ensure we're not seeing the empty state if accounts exist
        const hasAccounts = await this.page.locator('.account-item').count() > 0;
        if (hasAccounts) {
            await this.page.waitForSelector('.account-item', { timeout });
        }
    }

    /**
     * Wait for transactions to update in the UI
     */
    async waitForTransactionsUpdate(timeout = 3000) {
        // Wait for any loading states to complete
        await this.page.waitForTimeout(500);
        
        // Ensure we're not seeing the empty state if transactions exist
        const hasTransactions = await this.page.locator('.transaction-item').count() > 0;
        if (hasTransactions) {
            await this.page.waitForSelector('.transaction-item', { timeout });
        }
    }

    /**
     * Wait for financial summary to update
     */
    async waitForSummaryUpdate(timeout = 3000) {
        // Wait for summary cards to be visible and populated
        await this.page.waitForSelector('.summary-card .card-value', { timeout });
        await this.page.waitForTimeout(500); // Allow for any animations
    }

    /**
     * Parse currency string to number
     */
    parseCurrency(currencyString) {
        if (!currencyString) return 0;
        return parseFloat(currencyString.replace(/[^-\d.]/g, ''));
    }

    /**
     * Format number as currency string
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    /**
     * Check if element exists
     */
    async elementExists(selector) {
        try {
            await this.page.waitForSelector(selector, { timeout: 1000 });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get account by name
     */
    async getAccountByName(name) {
        const accounts = await this.getAccounts();
        return accounts.find(account => account.name === name);
    }

    /**
     * Get transaction by description
     */
    async getTransactionByDescription(description) {
        const transactions = await this.getTransactions();
        return transactions.find(transaction => transaction.description === description);
    }

    /**
     * Take screenshot for debugging
     */
    async takeScreenshot(name) {
        await this.page.screenshot({ 
            path: `test-results/screenshots/${name}-${Date.now()}.png`,
            fullPage: true 
        });
    }

    /**
     * Wait for stable state (no loading indicators)
     */
    async waitForStableState(timeout = 5000) {
        // Wait for any loading spinners to disappear
        await this.page.waitForSelector('.loading-spinner', { state: 'hidden', timeout: 1000 }).catch(() => {});
        
        // Wait for connection to be established
        await this.waitForConnection();
        
        // Small delay to ensure all async operations complete
        await this.page.waitForTimeout(500);
    }
}

module.exports = { FinanceTestHelper };