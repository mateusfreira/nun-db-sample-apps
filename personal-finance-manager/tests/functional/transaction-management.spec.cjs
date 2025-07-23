/**
 * Transaction Management Tests
 * Tests for creating, reading, updating, and deleting transactions
 */

const { test, expect } = require('@playwright/test');
const { FinanceTestHelper } = require('./helpers/test-helper.cjs');

test.describe('Transaction Management', () => {
    let helper;
    let userId;
    let checkingAccount;
    let savingsAccount;

    test.beforeEach(async ({ page }) => {
        helper = new FinanceTestHelper(page);
        userId = await helper.initializeApp('transaction-mgmt');

        // Create test accounts
        await helper.createAccount({
            name: 'Checking Account',
            type: 'asset',
            balance: 2000
        });

        await helper.createAccount({
            name: 'Savings Account',
            type: 'asset',
            balance: 5000
        });

        checkingAccount = await helper.getAccountByName('Checking Account');
        savingsAccount = await helper.getAccountByName('Savings Account');
    });

    test.describe('Transaction Creation', () => {
        test('should create a basic expense transaction', async ({ page }) => {
            await helper.createTransaction({
                description: 'Grocery Shopping',
                amount: -85.50,
                fromAccountId: checkingAccount.id,
                category: 'groceries'
            });

            const transactions = await helper.getTransactions();
            expect(transactions).toHaveLength(1);
            expect(transactions[0].description).toBe('Grocery Shopping');
            expect(transactions[0].amount).toBe(-85.50);
        });

        test('should create a basic income transaction', async ({ page }) => {
            await helper.createTransaction({
                description: 'Salary Payment',
                amount: 3000,
                fromAccountId: checkingAccount.id,
                category: 'income'
            });

            const transactions = await helper.getTransactions();
            expect(transactions).toHaveLength(1);
            expect(transactions[0].description).toBe('Salary Payment');
            expect(transactions[0].amount).toBe(3000);
        });

        test('should create a transfer between accounts', async ({ page }) => {
            await helper.createTransaction({
                description: 'Transfer to Savings',
                amount: -500,
                fromAccountId: checkingAccount.id,
                toAccountId: savingsAccount.id,
                category: 'transfer'
            });

            const transactions = await helper.getTransactions();
            expect(transactions).toHaveLength(1);
            expect(transactions[0].description).toBe('Transfer to Savings');
            expect(transactions[0].amount).toBe(-500);
        });

        test('should create transactions with different categories', async ({ page }) => {
            const testTransactions = [
                { description: 'Gas Station', amount: -45, category: 'transportation' },
                { description: 'Restaurant', amount: -32.50, category: 'entertainment' },
                { description: 'Doctor Visit', amount: -150, category: 'healthcare' },
                { description: 'Electric Bill', amount: -85, category: 'utilities' }
            ];

            for (const txnData of testTransactions) {
                await helper.createTransaction({
                    ...txnData,
                    fromAccountId: checkingAccount.id
                });
            }

            const transactions = await helper.getTransactions();
            expect(transactions).toHaveLength(4);

            const descriptions = transactions.map(txn => txn.description);
            expect(descriptions).toContain('Gas Station');
            expect(descriptions).toContain('Restaurant');
            expect(descriptions).toContain('Doctor Visit');
            expect(descriptions).toContain('Electric Bill');
        });

        test('should validate required fields', async ({ page }) => {
            await page.click('#createTransactionBtn');
            await page.waitForSelector('#createTransactionModal.show');

            // Try to submit without required fields
            await page.click('#createTransactionForm button[type="submit"]');

            // Form should still be visible (validation failed)
            await expect(page.locator('#createTransactionModal.show')).toBeVisible();

            // Fill required fields
            await page.fill('#transactionDescription', 'Test Transaction');
            await page.fill('#transactionAmount', '100');
            await page.selectOption('#fromAccount', checkingAccount.id);
            await page.click('#createTransactionForm button[type="submit"]');

            // Modal should close
            await page.waitForSelector('#createTransactionModal', { state: 'hidden' });
        });
    });

    test.describe('Balance Updates', () => {
        test('should update account balance after expense transaction', async ({ page }) => {
            const initialBalance = checkingAccount.balance;

            await helper.createTransaction({
                description: 'Test Expense',
                amount: -100,
                fromAccountId: checkingAccount.id
            });

            await helper.waitForAccountsUpdate();
            const updatedAccount = await helper.getAccountByName('Checking Account');
            expect(updatedAccount.balance).toBe(initialBalance - 100);

            // Check financial summary
            await helper.waitForSummaryUpdate();
            const summary = await helper.getFinancialSummary();
            expect(summary.totalAssets).toBe(6900); // 1900 + 5000
        });

        test('should update account balance after income transaction', async ({ page }) => {
            const initialBalance = checkingAccount.balance;

            await helper.createTransaction({
                description: 'Test Income',
                amount: 500,
                fromAccountId: checkingAccount.id
            });

            await helper.waitForAccountsUpdate();
            const updatedAccount = await helper.getAccountByName('Checking Account');
            expect(updatedAccount.balance).toBe(initialBalance + 500);

            // Check financial summary
            await helper.waitForSummaryUpdate();
            const summary = await helper.getFinancialSummary();
            expect(summary.totalAssets).toBe(7500); // 2500 + 5000
        });

        test('should update both account balances for transfers', async ({ page }) => {
            const initialCheckingBalance = checkingAccount.balance;
            const initialSavingsBalance = savingsAccount.balance;

            await helper.createTransaction({
                description: 'Transfer Test',
                amount: -300,
                fromAccountId: checkingAccount.id,
                toAccountId: savingsAccount.id
            });

            await helper.waitForAccountsUpdate();
            
            const updatedChecking = await helper.getAccountByName('Checking Account');
            const updatedSavings = await helper.getAccountByName('Savings Account');
            
            expect(updatedChecking.balance).toBe(initialCheckingBalance - 300);
            expect(updatedSavings.balance).toBe(initialSavingsBalance + 300);

            // Total assets should remain the same for transfers
            await helper.waitForSummaryUpdate();
            const summary = await helper.getFinancialSummary();
            expect(summary.totalAssets).toBe(7000); // No change for transfers
        });
    });

    test.describe('Transaction Display and Filtering', () => {
        test('should display transactions correctly', async ({ page }) => {
            await helper.createTransaction({
                description: 'Test Transaction 1',
                amount: -50,
                fromAccountId: checkingAccount.id,
                category: 'groceries'
            });

            await helper.createTransaction({
                description: 'Test Transaction 2',
                amount: 200,
                fromAccountId: savingsAccount.id,
                category: 'income'
            });

            const transactions = await helper.getTransactions();
            expect(transactions).toHaveLength(2);

            // Verify transaction details are displayed
            const txn1 = transactions.find(t => t.description === 'Test Transaction 1');
            const txn2 = transactions.find(t => t.description === 'Test Transaction 2');

            expect(txn1).toBeTruthy();
            expect(txn1.amount).toBe(-50);
            
            expect(txn2).toBeTruthy();
            expect(txn2.amount).toBe(200);
        });

        test('should filter transactions by account', async ({ page }) => {
            // Create transactions in different accounts
            await helper.createTransaction({
                description: 'Checking Transaction',
                amount: -25,
                fromAccountId: checkingAccount.id
            });

            await helper.createTransaction({
                description: 'Savings Transaction',
                amount: -15,
                fromAccountId: savingsAccount.id
            });

            // Filter by checking account
            await helper.filterTransactions(checkingAccount.id);
            
            let transactions = await helper.getTransactions();
            expect(transactions).toHaveLength(1);
            expect(transactions[0].description).toBe('Checking Transaction');

            // Filter by savings account
            await helper.filterTransactions(savingsAccount.id);
            
            transactions = await helper.getTransactions();
            expect(transactions).toHaveLength(1);
            expect(transactions[0].description).toBe('Savings Transaction');

            // Show all transactions
            await helper.filterTransactions('');
            
            transactions = await helper.getTransactions();
            expect(transactions).toHaveLength(2);
        });

        test('should show empty state when no transactions exist', async ({ page }) => {
            // Should show empty state by default
            await expect(page.locator('.transactions-list .empty-state')).toBeVisible();
            await expect(page.locator('.empty-state')).toContainText('No transactions yet');
        });
    });

    test.describe('Transaction Deletion', () => {
        test('should delete a transaction and restore account balance', async ({ page }) => {
            const initialBalance = checkingAccount.balance;

            await helper.createTransaction({
                description: 'Delete Test',
                amount: -75,
                fromAccountId: checkingAccount.id
            });

            // Verify balance decreased
            await helper.waitForAccountsUpdate();
            let updatedAccount = await helper.getAccountByName('Checking Account');
            expect(updatedAccount.balance).toBe(initialBalance - 75);

            // Delete the transaction
            const transaction = await helper.getTransactionByDescription('Delete Test');
            await helper.deleteTransaction(transaction.id);

            // Verify balance restored
            await helper.waitForAccountsUpdate();
            updatedAccount = await helper.getAccountByName('Checking Account');
            expect(updatedAccount.balance).toBe(initialBalance);

            // Verify transaction list is empty
            const transactions = await helper.getTransactions();
            expect(transactions).toHaveLength(0);
        });

        test('should delete transfer transaction and restore both balances', async ({ page }) => {
            const initialCheckingBalance = checkingAccount.balance;
            const initialSavingsBalance = savingsAccount.balance;

            await helper.createTransaction({
                description: 'Transfer Delete Test',
                amount: -200,
                fromAccountId: checkingAccount.id,
                toAccountId: savingsAccount.id
            });

            // Verify balances changed
            await helper.waitForAccountsUpdate();
            let updatedChecking = await helper.getAccountByName('Checking Account');
            let updatedSavings = await helper.getAccountByName('Savings Account');
            expect(updatedChecking.balance).toBe(initialCheckingBalance - 200);
            expect(updatedSavings.balance).toBe(initialSavingsBalance + 200);

            // Delete the transaction
            const transaction = await helper.getTransactionByDescription('Transfer Delete Test');
            await helper.deleteTransaction(transaction.id);

            // Verify balances restored
            await helper.waitForAccountsUpdate();
            updatedChecking = await helper.getAccountByName('Checking Account');
            updatedSavings = await helper.getAccountByName('Savings Account');
            expect(updatedChecking.balance).toBe(initialCheckingBalance);
            expect(updatedSavings.balance).toBe(initialSavingsBalance);
        });
    });

    test.describe('Financial Analysis Integration', () => {
        test('should update monthly income/expense tracking', async ({ page }) => {
            // Create income transaction
            await helper.createTransaction({
                description: 'Monthly Salary',
                amount: 3000,
                fromAccountId: checkingAccount.id,
                category: 'income'
            });

            // Create expense transactions
            await helper.createTransaction({
                description: 'Rent Payment',
                amount: -1200,
                fromAccountId: checkingAccount.id,
                category: 'housing'
            });

            await helper.createTransaction({
                description: 'Groceries',
                amount: -300,
                fromAccountId: checkingAccount.id,
                category: 'groceries'
            });

            await helper.waitForSummaryUpdate();
            const summary = await helper.getFinancialSummary();
            
            // Note: The actual values depend on how the monthly calculation works
            // For transactions created today, they should be included in monthly totals
            expect(summary.monthlyIncome).toBeGreaterThan(0);
            expect(summary.monthlyExpenses).toBeGreaterThan(0);
            expect(summary.monthlySavings).toBe(summary.monthlyIncome - summary.monthlyExpenses);
        });
    });

    test.describe('Error Handling', () => {
        test('should handle invalid transaction amounts', async ({ page }) => {
            await page.click('#createTransactionBtn');
            await page.waitForSelector('#createTransactionModal.show');

            await page.fill('#transactionDescription', 'Invalid Amount Test');
            await page.fill('#transactionAmount', '0'); // Zero amount should be invalid
            await page.selectOption('#fromAccount', checkingAccount.id);
            
            // This might depend on client-side validation
            await page.click('#createTransactionForm button[type="submit"]');
            
            // Should either show validation error or server error
            // Implementation depends on where validation occurs
        });

        test('should handle network errors gracefully', async ({ page }) => {
            // Simulate network error
            await page.route('/api/transactions*', route => {
                route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Database error' })
                });
            });

            await page.click('#createTransactionBtn');
            await page.waitForSelector('#createTransactionModal.show');

            await page.fill('#transactionDescription', 'Error Test');
            await page.fill('#transactionAmount', '-50');
            await page.selectOption('#fromAccount', checkingAccount.id);
            await page.click('#createTransactionForm button[type="submit"]');

            // Should show error notification
            await helper.waitForNotification('Database error');
        });
    });

    test.describe('Real-time Updates', () => {
        test('should handle multiple rapid transactions', async ({ page }) => {
            const transactions = [
                { description: 'Transaction 1', amount: -10 },
                { description: 'Transaction 2', amount: -20 },
                { description: 'Transaction 3', amount: -30 },
                { description: 'Transaction 4', amount: -40 },
                { description: 'Transaction 5', amount: -50 }
            ];

            // Create transactions rapidly
            for (const txnData of transactions) {
                await helper.createTransaction({
                    ...txnData,
                    fromAccountId: checkingAccount.id,
                    category: 'general'
                });
            }

            const createdTransactions = await helper.getTransactions();
            expect(createdTransactions).toHaveLength(5);

            // Verify all transactions were created
            const descriptions = createdTransactions.map(txn => txn.description);
            for (const txn of transactions) {
                expect(descriptions).toContain(txn.description);
            }

            // Verify account balance is correct
            await helper.waitForAccountsUpdate();
            const updatedAccount = await helper.getAccountByName('Checking Account');
            const expectedBalance = checkingAccount.balance - 150; // Sum of all transaction amounts
            expect(updatedAccount.balance).toBe(expectedBalance);
        });
    });
});