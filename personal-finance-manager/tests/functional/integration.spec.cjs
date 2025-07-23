/**
 * Integration Tests
 * End-to-end tests for complete user workflows and system integration
 */

const { test, expect } = require('@playwright/test');
const { FinanceTestHelper } = require('./helpers/test-helper.cjs');

test.describe('Integration Tests', () => {
    let helper;
    let userId;

    test.beforeEach(async ({ page }) => {
        helper = new FinanceTestHelper(page);
        userId = await helper.initializeApp('integration');
    });

    test.describe('Complete User Workflows', () => {
        test('should complete full personal finance setup workflow', async ({ page }) => {
            // Step 1: Create account hierarchy
            await helper.createAccount({
                name: 'Assets',
                type: 'asset',
                balance: 0
            });

            const assetsAccount = await helper.getAccountByName('Assets');

            await helper.createAccount({
                name: 'Checking Account',
                type: 'asset',
                balance: 2000,
                parentId: assetsAccount.id
            });

            await helper.createAccount({
                name: 'Savings Account',
                type: 'asset',
                balance: 10000,
                parentId: assetsAccount.id
            });

            await helper.createAccount({
                name: 'Liabilities',
                type: 'liability',
                balance: 0
            });

            const liabilitiesAccount = await helper.getAccountByName('Liabilities');

            await helper.createAccount({
                name: 'Credit Card',
                type: 'liability',
                balance: 1500,
                parentId: liabilitiesAccount.id
            });

            // Step 2: Verify account hierarchy
            const accounts = await helper.getAccounts();
            expect(accounts).toHaveLength(5);

            // Step 3: Check financial summary
            await helper.waitForSummaryUpdate();
            let summary = await helper.getFinancialSummary();
            expect(summary.totalAssets).toBe(12000);
            expect(summary.totalLiabilities).toBe(1500);
            expect(summary.netWorth).toBe(10500);

            // Step 4: Create typical monthly transactions
            const checkingAccount = await helper.getAccountByName('Checking Account');
            const savingsAccount = await helper.getAccountByName('Savings Account');
            const creditCardAccount = await helper.getAccountByName('Credit Card');

            // Income
            await helper.createTransaction({
                description: 'Monthly Salary',
                amount: 5000,
                fromAccountId: checkingAccount.id,
                category: 'income'
            });

            // Expenses
            const monthlyExpenses = [
                { description: 'Rent Payment', amount: -1200, category: 'housing' },
                { description: 'Grocery Shopping', amount: -400, category: 'groceries' },
                { description: 'Electric Bill', amount: -120, category: 'utilities' },
                { description: 'Gas Bill', amount: -80, category: 'utilities' },
                { description: 'Internet', amount: -60, category: 'utilities' },
                { description: 'Phone Bill', amount: -50, category: 'utilities' },
                { description: 'Car Insurance', amount: -100, category: 'transportation' },
                { description: 'Gas Station', amount: -80, category: 'transportation' },
                { description: 'Restaurant', amount: -75, category: 'entertainment' },
                { description: 'Movies', amount: -25, category: 'entertainment' }
            ];

            for (const expense of monthlyExpenses) {
                await helper.createTransaction({
                    ...expense,
                    fromAccountId: checkingAccount.id
                });
            }

            // Savings transfer
            await helper.createTransaction({
                description: 'Monthly Savings',
                amount: -1000,
                fromAccountId: checkingAccount.id,
                toAccountId: savingsAccount.id,
                category: 'transfer'
            });

            // Credit card payment
            await helper.createTransaction({
                description: 'Credit Card Payment',
                amount: -500,
                fromAccountId: checkingAccount.id,
                toAccountId: creditCardAccount.id,
                category: 'transfer'
            });

            // Step 5: Verify final state
            await helper.waitForSummaryUpdate();
            summary = await helper.getFinancialSummary();

            // Check that all transactions affected the summary correctly
            expect(summary.monthlyIncome).toBeGreaterThanOrEqual(5000);
            expect(summary.monthlyExpenses).toBeGreaterThanOrEqual(2190); // Sum of expenses
            expect(summary.monthlySavings).toBe(summary.monthlyIncome - summary.monthlyExpenses);

            // Verify transaction count
            const transactions = await helper.getTransactions();
            expect(transactions).toHaveLength(12); // 1 income + 10 expenses + 1 savings transfer + 1 credit card payment
        });

        test('should handle multi-currency accounts workflow', async ({ page }) => {
            // Create accounts in different currencies
            await helper.createAccount({
                name: 'USD Checking',
                type: 'asset',
                balance: 2000,
                currency: 'USD'
            });

            await helper.createAccount({
                name: 'EUR Savings',
                type: 'asset',
                balance: 1500,
                currency: 'EUR'
            });

            await helper.createAccount({
                name: 'GBP Investment',
                type: 'asset',
                balance: 800,
                currency: 'GBP'
            });

            const accounts = await helper.getAccounts();
            expect(accounts).toHaveLength(3);

            // Verify accounts were created with correct details
            const usdAccount = await helper.getAccountByName('USD Checking');
            const eurAccount = await helper.getAccountByName('EUR Savings');
            const gbpAccount = await helper.getAccountByName('GBP Investment');

            expect(usdAccount).toBeTruthy();
            expect(eurAccount).toBeTruthy();
            expect(gbpAccount).toBeTruthy();

            // Create transactions in each currency
            await helper.createTransaction({
                description: 'USD Income',
                amount: 1000,
                fromAccountId: usdAccount.id,
                category: 'income'
            });

            await helper.createTransaction({
                description: 'EUR Expense',
                amount: -200,
                fromAccountId: eurAccount.id,
                category: 'general'
            });

            await helper.createTransaction({
                description: 'GBP Investment',
                amount: 100,
                fromAccountId: gbpAccount.id,
                category: 'investment'
            });

            // Verify all transactions were created
            const transactions = await helper.getTransactions();
            expect(transactions).toHaveLength(3);
        });

        test('should handle business expense tracking workflow', async ({ page }) => {
            // Create business-related accounts
            await helper.createAccount({
                name: 'Business Checking',
                type: 'asset',
                balance: 5000
            });

            await helper.createAccount({
                name: 'Business Credit Card',
                type: 'liability',
                balance: 2000
            });

            const businessChecking = await helper.getAccountByName('Business Checking');
            const businessCredit = await helper.getAccountByName('Business Credit Card');

            // Create various business expense transactions
            const businessExpenses = [
                { description: 'Office Rent', amount: -800, category: 'office' },
                { description: 'Software Subscription', amount: -99, category: 'software' },
                { description: 'Business Lunch', amount: -65, category: 'meals' },
                { description: 'Conference Registration', amount: -299, category: 'education' },
                { description: 'Office Supplies', amount: -150, category: 'supplies' },
                { description: 'Marketing Campaign', amount: -500, category: 'marketing' },
                { description: 'Business Insurance', amount: -200, category: 'insurance' }
            ];

            for (const expense of businessExpenses) {
                await helper.createTransaction({
                    ...expense,
                    fromAccountId: businessChecking.id
                });
            }

            // Business income
            await helper.createTransaction({
                description: 'Client Payment',
                amount: 3000,
                fromAccountId: businessChecking.id,
                category: 'income'
            });

            await helper.createTransaction({
                description: 'Product Sales',
                amount: 1200,
                fromAccountId: businessChecking.id,
                category: 'income'
            });

            // Verify business transactions
            const transactions = await helper.getTransactions();
            expect(transactions).toHaveLength(9); // 7 expenses + 2 income

            // Filter by business checking account
            await helper.filterTransactions(businessChecking.id);
            const filteredTransactions = await helper.getTransactions();
            expect(filteredTransactions).toHaveLength(9);
        });
    });

    test.describe('Data Consistency and Persistence', () => {
        test('should maintain data consistency across page refreshes', async ({ page }) => {
            // Create some data
            await helper.createAccount({
                name: 'Persistence Test Account',
                type: 'asset',
                balance: 1000
            });

            const account = await helper.getAccountByName('Persistence Test Account');

            await helper.createTransaction({
                description: 'Persistence Test Transaction',
                amount: -100,
                fromAccountId: account.id,
                category: 'test'
            });

            // Verify initial state
            let accounts = await helper.getAccounts();
            let transactions = await helper.getTransactions();
            let summary = await helper.getFinancialSummary();

            expect(accounts).toHaveLength(1);
            expect(transactions).toHaveLength(1);
            expect(summary.totalAssets).toBe(900); // 1000 - 100

            // Refresh the page (simulate browser refresh)
            await page.reload();
            await helper.waitForConnection();
            await helper.waitForDashboard();

            // Verify data persisted
            accounts = await helper.getAccounts();
            transactions = await helper.getTransactions();
            summary = await helper.getFinancialSummary();

            expect(accounts).toHaveLength(1);
            expect(accounts[0].name).toBe('Persistence Test Account');
            expect(transactions).toHaveLength(1);
            expect(transactions[0].description).toBe('Persistence Test Transaction');
            expect(summary.totalAssets).toBe(900);
        });

        test('should handle large datasets efficiently', async ({ page }) => {
            // Create multiple accounts
            const accountPromises = [];
            for (let i = 1; i <= 10; i++) {
                accountPromises.push(helper.createAccount({
                    name: `Account ${i}`,
                    type: i % 2 === 0 ? 'asset' : 'liability',
                    balance: i * 100
                }));
            }
            await Promise.all(accountPromises);

            // Verify accounts were created
            const accounts = await helper.getAccounts();
            expect(accounts).toHaveLength(10);

            // Create many transactions
            const firstAccount = accounts[0];
            const transactionPromises = [];
            for (let i = 1; i <= 50; i++) {
                transactionPromises.push(helper.createTransaction({
                    description: `Transaction ${i}`,
                    amount: i % 2 === 0 ? -i * 10 : i * 10,
                    fromAccountId: firstAccount.id,
                    category: 'general'
                }));
            }
            await Promise.all(transactionPromises);

            // Verify transactions were created
            const transactions = await helper.getTransactions();
            expect(transactions).toHaveLength(50);

            // Verify UI is still responsive
            await helper.waitForSummaryUpdate();
            const summary = await helper.getFinancialSummary();
            expect(summary).toBeTruthy();
        });
    });

    test.describe('Error Recovery and Resilience', () => {
        test('should recover gracefully from temporary network issues', async ({ page }) => {
            // Create initial data
            await helper.createAccount({
                name: 'Network Test Account',
                type: 'asset',
                balance: 1000
            });

            // Simulate network interruption
            await page.route('/api/**', route => {
                route.abort();
            });

            // Try to create transaction (should fail)
            await page.click('#createTransactionBtn');
            await page.waitForSelector('#createTransactionModal.show');
            await page.fill('#transactionDescription', 'Failed Transaction');
            await page.fill('#transactionAmount', '-50');
            
            const account = await helper.getAccountByName('Network Test Account');
            await page.selectOption('#fromAccount', account.id);
            await page.click('#createTransactionForm button[type="submit"]');

            // Should show error notification
            await helper.waitForNotification('Failed');

            // Restore network
            await page.unroute('/api/**');

            // Retry transaction creation (should succeed)
            await page.fill('#transactionDescription', 'Successful Transaction');
            await page.click('#createTransactionForm button[type="submit"]');

            await helper.waitForNotification('created successfully');
            const transactions = await helper.getTransactions();
            expect(transactions).toHaveLength(1);
        });

        test('should handle concurrent user actions gracefully', async ({ page }) => {
            await helper.createAccount({
                name: 'Concurrent Test Account',
                type: 'asset',
                balance: 1000
            });

            const account = await helper.getAccountByName('Concurrent Test Account');

            // Simulate rapid concurrent actions
            const actions = [
                helper.createTransaction({
                    description: 'Transaction 1',
                    amount: -10,
                    fromAccountId: account.id
                }),
                helper.createTransaction({
                    description: 'Transaction 2',
                    amount: -20,
                    fromAccountId: account.id
                }),
                helper.createTransaction({
                    description: 'Transaction 3',
                    amount: -30,
                    fromAccountId: account.id
                })
            ];

            await Promise.all(actions);

            // Verify all transactions were created
            const transactions = await helper.getTransactions();
            expect(transactions).toHaveLength(3);

            // Verify account balance is correct
            await helper.waitForAccountsUpdate();
            const updatedAccount = await helper.getAccountByName('Concurrent Test Account');
            expect(updatedAccount.balance).toBe(940); // 1000 - 10 - 20 - 30
        });
    });

    test.describe('Full Application Reset and Cleanup', () => {
        test('should reset all data when requested', async ({ page }) => {
            // Create comprehensive test data
            await helper.createAccount({
                name: 'Reset Test Account 1',
                type: 'asset',
                balance: 1000
            });

            await helper.createAccount({
                name: 'Reset Test Account 2',
                type: 'liability',
                balance: 500
            });

            const account1 = await helper.getAccountByName('Reset Test Account 1');

            await helper.createTransaction({
                description: 'Reset Test Transaction',
                amount: -100,
                fromAccountId: account1.id
            });

            // Verify data exists
            let accounts = await helper.getAccounts();
            let transactions = await helper.getTransactions();
            expect(accounts).toHaveLength(2);
            expect(transactions).toHaveLength(1);

            // Reset all data
            await helper.resetData();

            // Verify all data is cleared
            accounts = await helper.getAccounts();
            transactions = await helper.getTransactions();
            expect(accounts).toHaveLength(0);
            expect(transactions).toHaveLength(0);

            // Verify financial summary is reset
            const summary = await helper.getFinancialSummary();
            expect(summary.totalAssets).toBe(0);
            expect(summary.totalLiabilities).toBe(0);
            expect(summary.netWorth).toBe(0);
            expect(summary.monthlyIncome).toBe(0);
            expect(summary.monthlyExpenses).toBe(0);
            expect(summary.monthlySavings).toBe(0);
        });
    });

    test.describe('Mobile Responsiveness', () => {
        test('should work correctly on mobile viewport', async ({ page }) => {
            // Set mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });

            // Create test data
            await helper.createAccount({
                name: 'Mobile Test Account',
                type: 'asset',
                balance: 1000
            });

            // Verify mobile layout
            await expect(page.locator('.app-header')).toBeVisible();
            await expect(page.locator('.summary-cards')).toBeVisible();
            await expect(page.locator('.accounts-container')).toBeVisible();

            // Test mobile interactions
            const account = await helper.getAccountByName('Mobile Test Account');
            await helper.createTransaction({
                description: 'Mobile Transaction',
                amount: -50,
                fromAccountId: account.id
            });

            const transactions = await helper.getTransactions();
            expect(transactions).toHaveLength(1);
        });
    });
});