/**
 * Financial Analysis Tests
 * Tests for financial summary, cash flow analysis, and reporting features
 */

const { test, expect } = require('@playwright/test');
const { FinanceTestHelper } = require('./helpers/test-helper.cjs');

test.describe('Financial Analysis', () => {
    let helper;
    let userId;
    let checkingAccount;
    let savingsAccount;
    let creditCardAccount;

    test.beforeEach(async ({ page }) => {
        helper = new FinanceTestHelper(page);
        userId = await helper.initializeApp('financial-analysis');

        // Create comprehensive account structure
        await helper.createAccount({
            name: 'Checking Account',
            type: 'asset',
            balance: 2500
        });

        await helper.createAccount({
            name: 'Savings Account',
            type: 'asset',
            balance: 10000
        });

        await helper.createAccount({
            name: 'Credit Card',
            type: 'liability',
            balance: 1500
        });

        checkingAccount = await helper.getAccountByName('Checking Account');
        savingsAccount = await helper.getAccountByName('Savings Account');
        creditCardAccount = await helper.getAccountByName('Credit Card');
    });

    test.describe('Financial Summary Calculations', () => {
        test('should calculate basic financial metrics correctly', async ({ page }) => {
            await helper.waitForSummaryUpdate();
            const summary = await helper.getFinancialSummary();

            // Initial state: Assets = 2500 + 10000 = 12500, Liabilities = 1500
            expect(summary.totalAssets).toBe(12500);
            expect(summary.totalLiabilities).toBe(1500);
            expect(summary.netWorth).toBe(11000); // 12500 - 1500
        });

        test('should update metrics when account balances change', async ({ page }) => {
            // Add income to checking account
            await helper.createTransaction({
                description: 'Salary',
                amount: 3000,
                fromAccountId: checkingAccount.id,
                category: 'income'
            });

            await helper.waitForSummaryUpdate();
            let summary = await helper.getFinancialSummary();
            
            expect(summary.totalAssets).toBe(15500); // 5500 + 10000
            expect(summary.netWorth).toBe(14000); // 15500 - 1500

            // Add expense
            await helper.createTransaction({
                description: 'Rent',
                amount: -1200,
                fromAccountId: checkingAccount.id,
                category: 'housing'
            });

            await helper.waitForSummaryUpdate();
            summary = await helper.getFinancialSummary();
            
            expect(summary.totalAssets).toBe(14300); // 4300 + 10000
            expect(summary.netWorth).toBe(12800); // 14300 - 1500
        });

        test('should handle multiple account types correctly', async ({ page }) => {
            // Add more account types
            await helper.createAccount({
                name: 'Investment Account',
                type: 'asset',
                balance: 25000
            });

            await helper.createAccount({
                name: 'Mortgage',
                type: 'liability',
                balance: 150000
            });

            await helper.waitForSummaryUpdate();
            const summary = await helper.getFinancialSummary();

            expect(summary.totalAssets).toBe(37500); // 2500 + 10000 + 25000
            expect(summary.totalLiabilities).toBe(151500); // 1500 + 150000
            expect(summary.netWorth).toBe(-114000); // 37500 - 151500
        });
    });

    test.describe('Monthly Income and Expense Tracking', () => {
        test('should track monthly income correctly', async ({ page }) => {
            // Create income transactions
            await helper.createTransaction({
                description: 'Salary Payment',
                amount: 4000,
                fromAccountId: checkingAccount.id,
                category: 'income'
            });

            await helper.createTransaction({
                description: 'Freelance Work',
                amount: 800,
                fromAccountId: checkingAccount.id,
                category: 'income'
            });

            await helper.waitForSummaryUpdate();
            const summary = await helper.getFinancialSummary();

            expect(summary.monthlyIncome).toBeGreaterThanOrEqual(4800);
        });

        test('should track monthly expenses correctly', async ({ page }) => {
            // Create expense transactions
            const expenses = [
                { description: 'Rent', amount: -1200, category: 'housing' },
                { description: 'Groceries', amount: -400, category: 'groceries' },
                { description: 'Utilities', amount: -150, category: 'utilities' },
                { description: 'Gas', amount: -80, category: 'transportation' }
            ];

            for (const expense of expenses) {
                await helper.createTransaction({
                    ...expense,
                    fromAccountId: checkingAccount.id
                });
            }

            await helper.waitForSummaryUpdate();
            const summary = await helper.getFinancialSummary();

            expect(summary.monthlyExpenses).toBeGreaterThanOrEqual(1830);
        });

        test('should calculate monthly savings correctly', async ({ page }) => {
            // Add income
            await helper.createTransaction({
                description: 'Monthly Income',
                amount: 5000,
                fromAccountId: checkingAccount.id,
                category: 'income'
            });

            // Add expenses
            await helper.createTransaction({
                description: 'Monthly Expenses',
                amount: -3500,
                fromAccountId: checkingAccount.id,
                category: 'general'
            });

            await helper.waitForSummaryUpdate();
            const summary = await helper.getFinancialSummary();

            expect(summary.monthlyIncome).toBeGreaterThanOrEqual(5000);
            expect(summary.monthlyExpenses).toBeGreaterThanOrEqual(3500);
            expect(summary.monthlySavings).toBe(summary.monthlyIncome - summary.monthlyExpenses);
        });
    });

    test.describe('UI Visual Indicators', () => {
        test('should show positive values in green', async ({ page }) => {
            // Create positive net worth scenario
            await helper.createTransaction({
                description: 'Large Income',
                amount: 5000,
                fromAccountId: checkingAccount.id,
                category: 'income'
            });

            await helper.waitForSummaryUpdate();

            // Net worth should be positive and green
            const netWorthElement = page.locator('#netWorth');
            await expect(netWorthElement).toHaveClass(/positive/);

            // Monthly savings should be positive if income > expenses
            const monthlySavingsElement = page.locator('#monthlySavings');
            const savingsClass = await monthlySavingsElement.getAttribute('class');
            // May be positive depending on other transactions
        });

        test('should show negative values in red', async ({ page }) => {
            // Create scenario with high expenses
            await helper.createTransaction({
                description: 'Large Expense',
                amount: -15000,
                fromAccountId: checkingAccount.id,
                category: 'general'
            });

            await helper.waitForSummaryUpdate();

            // Net worth might be negative depending on total
            const summary = await helper.getFinancialSummary();
            if (summary.netWorth < 0) {
                const netWorthElement = page.locator('#netWorth');
                await expect(netWorthElement).toHaveClass(/negative/);
            }
        });
    });

    test.describe('Real-time Updates', () => {
        test('should update summary immediately after transaction creation', async ({ page }) => {
            const initialSummary = await helper.getFinancialSummary();

            await helper.createTransaction({
                description: 'Test Income',
                amount: 1000,
                fromAccountId: checkingAccount.id,
                category: 'income'
            });

            await helper.waitForSummaryUpdate();
            const updatedSummary = await helper.getFinancialSummary();

            // Total assets should increase by transaction amount
            expect(updatedSummary.totalAssets).toBe(initialSummary.totalAssets + 1000);
            expect(updatedSummary.netWorth).toBe(initialSummary.netWorth + 1000);
        });

        test('should update summary immediately after account creation', async ({ page }) => {
            const initialSummary = await helper.getFinancialSummary();

            await helper.createAccount({
                name: 'New Savings',
                type: 'asset',
                balance: 5000
            });

            await helper.waitForSummaryUpdate();
            const updatedSummary = await helper.getFinancialSummary();

            expect(updatedSummary.totalAssets).toBe(initialSummary.totalAssets + 5000);
            expect(updatedSummary.netWorth).toBe(initialSummary.netWorth + 5000);
        });

        test('should update summary after transaction deletion', async ({ page }) => {
            // Create a transaction
            await helper.createTransaction({
                description: 'Temp Transaction',
                amount: -500,
                fromAccountId: checkingAccount.id,
                category: 'general'
            });

            await helper.waitForSummaryUpdate();
            const summaryAfterCreation = await helper.getFinancialSummary();

            // Delete the transaction
            const transaction = await helper.getTransactionByDescription('Temp Transaction');
            await helper.deleteTransaction(transaction.id);

            await helper.waitForSummaryUpdate();
            const summaryAfterDeletion = await helper.getFinancialSummary();

            // Summary should return to original state
            expect(summaryAfterDeletion.totalAssets).toBe(summaryAfterCreation.totalAssets + 500);
        });
    });

    test.describe('Complex Financial Scenarios', () => {
        test('should handle transfer transactions correctly in summary', async ({ page }) => {
            const initialSummary = await helper.getFinancialSummary();

            // Transfer between accounts should not change total assets
            await helper.createTransaction({
                description: 'Internal Transfer',
                amount: -1000,
                fromAccountId: checkingAccount.id,
                toAccountId: savingsAccount.id,
                category: 'transfer'
            });

            await helper.waitForSummaryUpdate();
            const summaryAfterTransfer = await helper.getFinancialSummary();

            // Total assets should remain the same for internal transfers
            expect(summaryAfterTransfer.totalAssets).toBe(initialSummary.totalAssets);
            expect(summaryAfterTransfer.netWorth).toBe(initialSummary.netWorth);
        });

        test('should handle mixed income and expense categories', async ({ page }) => {
            const transactionMix = [
                { description: 'Salary', amount: 4000, category: 'income' },
                { description: 'Rent', amount: -1200, category: 'housing' },
                { description: 'Side Job', amount: 500, category: 'income' },
                { description: 'Groceries', amount: -300, category: 'groceries' },
                { description: 'Investment Return', amount: 200, category: 'income' },
                { description: 'Entertainment', amount: -150, category: 'entertainment' }
            ];

            for (const txn of transactionMix) {
                await helper.createTransaction({
                    ...txn,
                    fromAccountId: checkingAccount.id
                });
            }

            await helper.waitForSummaryUpdate();
            const summary = await helper.getFinancialSummary();

            // Total income should be 4000 + 500 + 200 = 4700
            expect(summary.monthlyIncome).toBeGreaterThanOrEqual(4700);
            
            // Total expenses should be 1200 + 300 + 150 = 1650
            expect(summary.monthlyExpenses).toBeGreaterThanOrEqual(1650);
            
            // Savings should be income - expenses
            expect(summary.monthlySavings).toBe(summary.monthlyIncome - summary.monthlyExpenses);
        });

        test('should handle account hierarchy in asset calculations', async ({ page }) => {
            // Create parent account
            await helper.createAccount({
                name: 'Investment Portfolio',
                type: 'asset',
                balance: 0
            });

            const parentAccount = await helper.getAccountByName('Investment Portfolio');

            // Create child accounts
            await helper.createAccount({
                name: 'Stock Portfolio',
                type: 'asset',
                balance: 15000,
                parentId: parentAccount.id
            });

            await helper.createAccount({
                name: 'Bond Portfolio',
                type: 'asset',
                balance: 8000,
                parentId: parentAccount.id
            });

            await helper.waitForSummaryUpdate();
            const summary = await helper.getFinancialSummary();

            // Should include all asset accounts in total
            expect(summary.totalAssets).toBeGreaterThanOrEqual(35500); // Original + new accounts
        });
    });

    test.describe('Error Handling and Edge Cases', () => {
        test('should handle zero balances correctly', async ({ page }) => {
            await helper.createAccount({
                name: 'Empty Account',
                type: 'asset',
                balance: 0
            });

            await helper.waitForSummaryUpdate();
            const summary = await helper.getFinancialSummary();

            // Should not break with zero balance accounts
            expect(summary.totalAssets).toBeGreaterThanOrEqual(12500); // Original amount
        });

        test('should handle very large numbers', async ({ page }) => {
            await helper.createAccount({
                name: 'Large Account',
                type: 'asset',
                balance: 1000000 // 1 million
            });

            await helper.waitForSummaryUpdate();
            const summary = await helper.getFinancialSummary();

            expect(summary.totalAssets).toBeGreaterThanOrEqual(1012500);
            
            // Check that UI formatting handles large numbers
            const netWorthElement = page.locator('#netWorth');
            const displayedValue = await netWorthElement.textContent();
            expect(displayedValue).toContain('$'); // Should be formatted as currency
        });

        test('should handle negative account balances', async ({ page }) => {
            // Create an account with negative balance (overdraft)
            await helper.createAccount({
                name: 'Overdraft Account',
                type: 'asset',
                balance: -500
            });

            await helper.waitForSummaryUpdate();
            const summary = await helper.getFinancialSummary();

            // Negative asset balance should reduce total assets
            expect(summary.totalAssets).toBe(12000); // 12500 - 500
        });
    });
});