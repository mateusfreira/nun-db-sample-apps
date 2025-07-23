/**
 * Account Management Tests
 * Tests for creating, reading, updating, and deleting accounts
 */

const { test, expect } = require('@playwright/test');
const { FinanceTestHelper } = require('./helpers/test-helper.cjs');

test.describe('Account Management', () => {
    let helper;
    let userId;

    test.beforeEach(async ({ page }) => {
        helper = new FinanceTestHelper(page);
        userId = await helper.initializeApp('account-mgmt');
    });

    test.describe('Account Creation', () => {
        test('should create a basic asset account', async ({ page }) => {
            await helper.createAccount({
                name: 'Checking Account',
                type: 'asset',
                balance: 1000
            });

            const accounts = await helper.getAccounts();
            expect(accounts).toHaveLength(1);
            expect(accounts[0].name).toBe('Checking Account');
            expect(accounts[0].balance).toBe(1000);
        });

        test('should create accounts of different types', async ({ page }) => {
            const accountTypes = [
                { name: 'Savings Account', type: 'asset', balance: 5000 },
                { name: 'Credit Card', type: 'liability', balance: -1500 },
                { name: 'Salary', type: 'income', balance: 0 },
                { name: 'Groceries', type: 'expense', balance: 0 }
            ];

            for (const accountData of accountTypes) {
                await helper.createAccount(accountData);
            }

            const accounts = await helper.getAccounts();
            expect(accounts).toHaveLength(4);

            // Verify each account type was created
            const accountNames = accounts.map(acc => acc.name);
            expect(accountNames).toContain('Savings Account');
            expect(accountNames).toContain('Credit Card');
            expect(accountNames).toContain('Salary');
            expect(accountNames).toContain('Groceries');
        });

        test('should create hierarchical accounts', async ({ page }) => {
            // Create parent account first
            await helper.createAccount({
                name: 'Bank Accounts',
                type: 'asset',
                balance: 0
            });

            const parentAccount = await helper.getAccountByName('Bank Accounts');
            expect(parentAccount).toBeTruthy();

            // Create child account
            await helper.createAccount({
                name: 'Checking',
                type: 'asset',
                balance: 2000,
                parentId: parentAccount.id
            });

            const accounts = await helper.getAccounts();
            expect(accounts).toHaveLength(2);

            // Verify parent-child relationship in UI
            const childAccount = await helper.getAccountByName('Checking');
            expect(childAccount).toBeTruthy();
        });

        test('should validate required fields', async ({ page }) => {
            await page.click('#createAccountBtn');
            await page.waitForSelector('#createAccountModal.show');

            // Try to submit without required fields
            await page.click('#createAccountForm button[type="submit"]');

            // Form should still be visible (validation failed)
            await expect(page.locator('#createAccountModal.show')).toBeVisible();

            // Fill required fields
            await page.fill('#accountName', 'Test Account');
            await page.selectOption('#accountType', 'asset');
            await page.click('#createAccountForm button[type="submit"]');

            // Modal should close
            await page.waitForSelector('#createAccountModal', { state: 'hidden' });
        });
    });

    test.describe('Account Display and Management', () => {
        test('should display account hierarchy correctly', async ({ page }) => {
            // Create a hierarchical structure
            await helper.createAccount({
                name: 'Assets',
                type: 'asset',
                balance: 0
            });

            const assetsAccount = await helper.getAccountByName('Assets');

            await helper.createAccount({
                name: 'Current Assets',
                type: 'asset',
                balance: 0,
                parentId: assetsAccount.id
            });

            const currentAssetsAccount = await helper.getAccountByName('Current Assets');

            await helper.createAccount({
                name: 'Checking Account',
                type: 'asset',
                balance: 1500,
                parentId: currentAssetsAccount.id
            });

            // Verify hierarchy in UI
            const accounts = await helper.getAccounts();
            expect(accounts).toHaveLength(3);

            // Check for proper indentation/styling classes
            const rootAccount = page.locator('[data-account-id="' + assetsAccount.id + '"]');
            await expect(rootAccount).not.toHaveClass(/child|grandchild/);

            const childAccount = page.locator('[data-account-id="' + currentAssetsAccount.id + '"]');
            await expect(childAccount).toHaveClass(/child/);

            const grandchildAccount = await helper.getAccountByName('Checking Account');
            const grandchildElement = page.locator('[data-account-id="' + grandchildAccount.id + '"]');
            await expect(grandchildElement).toHaveClass(/grandchild/);
        });

        test('should update financial summary when accounts are created', async ({ page }) => {
            // Check initial summary
            let summary = await helper.getFinancialSummary();
            expect(summary.totalAssets).toBe(0);
            expect(summary.totalLiabilities).toBe(0);
            expect(summary.netWorth).toBe(0);

            // Create asset account
            await helper.createAccount({
                name: 'Savings',
                type: 'asset',
                balance: 5000
            });

            await helper.waitForSummaryUpdate();
            summary = await helper.getFinancialSummary();
            expect(summary.totalAssets).toBe(5000);
            expect(summary.netWorth).toBe(5000);

            // Create liability account
            await helper.createAccount({
                name: 'Credit Card',
                type: 'liability',
                balance: 1500
            });

            await helper.waitForSummaryUpdate();
            summary = await helper.getFinancialSummary();
            expect(summary.totalAssets).toBe(5000);
            expect(summary.totalLiabilities).toBe(1500);
            expect(summary.netWorth).toBe(3500);
        });
    });

    test.describe('Account Deletion', () => {
        test('should delete an account successfully', async ({ page }) => {
            await helper.createAccount({
                name: 'Test Account',
                type: 'asset',
                balance: 1000
            });

            let accounts = await helper.getAccounts();
            expect(accounts).toHaveLength(1);

            const account = accounts[0];
            await helper.deleteAccount(account.id);

            accounts = await helper.getAccounts();
            expect(accounts).toHaveLength(0);

            // Should show empty state
            await expect(page.locator('.empty-state')).toBeVisible();
        });

        test('should update financial summary after account deletion', async ({ page }) => {
            await helper.createAccount({
                name: 'Temp Account',
                type: 'asset',
                balance: 2000
            });

            await helper.waitForSummaryUpdate();
            let summary = await helper.getFinancialSummary();
            expect(summary.totalAssets).toBe(2000);

            const account = await helper.getAccountByName('Temp Account');
            await helper.deleteAccount(account.id);

            await helper.waitForSummaryUpdate();
            summary = await helper.getFinancialSummary();
            expect(summary.totalAssets).toBe(0);
        });
    });

    test.describe('Account Selection in Forms', () => {
        test('should populate account selects correctly', async ({ page }) => {
            // Create a few accounts
            await helper.createAccount({
                name: 'Checking',
                type: 'asset',
                balance: 1000
            });

            await helper.createAccount({
                name: 'Savings',
                type: 'asset',
                balance: 5000
            });

            // Open create account modal to check parent select
            await page.click('#createAccountBtn');
            await page.waitForSelector('#createAccountModal.show');

            const parentOptions = await page.locator('#parentAccount option').allTextContents();
            expect(parentOptions).toContain('Checking');
            expect(parentOptions).toContain('Savings');

            // Close the modal more reliably
            await page.locator('#createAccountModal .modal-close').click();

            // Open create transaction modal to check account selects
            await page.click('#createTransactionBtn');
            await page.waitForSelector('#createTransactionModal.show');

            const fromAccountOptions = await page.locator('#fromAccount option').allTextContents();
            expect(fromAccountOptions).toContain('Checking ($1,000.00)');
            expect(fromAccountOptions).toContain('Savings ($5,000.00)');

            const toAccountOptions = await page.locator('#toAccount option').allTextContents();
            expect(toAccountOptions).toContain('Checking ($1,000.00)');
            expect(toAccountOptions).toContain('Savings ($5,000.00)');

            // Close the modal more reliably
            await page.locator('#createTransactionModal .modal-close').click();
        });
    });

    test.describe('Error Handling', () => {
        test('should handle network errors gracefully', async ({ page }) => {
            // Simulate network error by intercepting API calls
            await page.route('/api/accounts*', route => {
                route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Internal server error' })
                });
            });

            await page.click('#createAccountBtn');
            await page.waitForSelector('#createAccountModal.show');

            await page.fill('#accountName', 'Error Test Account');
            await page.selectOption('#accountType', 'asset');
            await page.click('#createAccountForm button[type="submit"]');

            // Should show error notification
            await helper.waitForNotification('Internal server error');
        });
    });

    test.describe('Real-time Updates', () => {
        test('should handle multiple rapid account creations', async ({ page }) => {
            const accounts = [
                { name: 'Account 1', type: 'asset', balance: 100 },
                { name: 'Account 2', type: 'asset', balance: 200 },
                { name: 'Account 3', type: 'asset', balance: 300 }
            ];

            // Create accounts rapidly
            for (const accountData of accounts) {
                await helper.createAccount(accountData);
            }

            const createdAccounts = await helper.getAccounts();
            expect(createdAccounts).toHaveLength(3);

            // Verify all accounts were created with correct data
            const accountNames = createdAccounts.map(acc => acc.name);
            expect(accountNames).toContain('Account 1');
            expect(accountNames).toContain('Account 2');
            expect(accountNames).toContain('Account 3');

            // Verify financial summary is correct
            await helper.waitForSummaryUpdate();
            const summary = await helper.getFinancialSummary();
            expect(summary.totalAssets).toBe(600); // 100 + 200 + 300
        });
    });
});