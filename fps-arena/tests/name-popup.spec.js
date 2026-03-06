import { test, expect } from '@playwright/test';

test.describe('FPS Arena - Name Entry Popup', () => {
    test('should show name entry modal on page load', async ({ page }) => {
        await page.goto('/');
        
        // Check that name modal is visible
        const nameModal = page.locator('#nameModal');
        await expect(nameModal).toBeVisible();
        
        // Check modal content
        await expect(page.locator('h2')).toContainText('Welcome to FPS Arena');
        await expect(page.locator('label[for="playerName"]')).toContainText('Enter your player name:');
        
        // Check input field is focused
        const nameInput = page.locator('#playerName');
        await expect(nameInput).toBeFocused();
        
        // Test hook should indicate modal is visible
        const isModalVisible = await page.evaluate(() => window._test?.isModalVisible());
        expect(isModalVisible).toBe(true);
    });

    test('should validate empty name input', async ({ page }) => {
        await page.goto('/');
        
        // Try to submit empty form
        await page.click('button[type="submit"]');
        
        // Should show error message
        const errorMessage = page.locator('#nameError');
        await expect(errorMessage).toContainText('Please enter a name');
        
        // Modal should still be visible
        const nameModal = page.locator('#nameModal');
        await expect(nameModal).toBeVisible();
    });

    test('should validate name length requirements', async ({ page }) => {
        await page.goto('/');
        
        // Test too short name
        await page.fill('#playerName', 'A');
        await page.click('button[type="submit"]');
        
        const errorMessage = page.locator('#nameError');
        await expect(errorMessage).toContainText('Name must be at least 2 characters');
        
        // Test too long name
        await page.fill('#playerName', 'A'.repeat(25));
        await page.click('button[type="submit"]');
        
        await expect(errorMessage).toContainText('Name must be less than 20 characters');
    });

    test('should accept valid name and proceed to role selection', async ({ page }) => {
        await page.goto('/');
        
        const testName = 'TestPlayer';
        
        // Fill in valid name
        await page.fill('#playerName', testName);
        await page.click('button[type="submit"]');
        
        // Name modal should be hidden
        const nameModal = page.locator('#nameModal');
        await expect(nameModal).toHaveClass(/hidden/);
        
        // Role modal should be visible
        const roleModal = page.locator('#roleModal');
        await expect(roleModal).toBeVisible();
        
        // Check role selection content
        await expect(page.locator('#roleModal h2')).toContainText('Select Your Role');
        
        // Check that all three roles are present
        await expect(page.locator('[data-role="assault"]')).toBeVisible();
        await expect(page.locator('[data-role="sniper"]')).toBeVisible();
        await expect(page.locator('[data-role="medic"]')).toBeVisible();
        
        // Test hook should store the entered name
        const storedName = await page.evaluate(() => window._test?.getPlayerName());
        expect(storedName).toBe(testName);
        
        // Test hook should indicate modal is no longer visible
        const isModalVisible = await page.evaluate(() => window._test?.isModalVisible());
        expect(isModalVisible).toBe(false);
    });

    test('should allow role selection', async ({ page }) => {
        await page.goto('/');
        
        // Enter name
        await page.fill('#playerName', 'TestPlayer');
        await page.click('button[type="submit"]');
        
        // Wait for role modal
        const roleModal = page.locator('#roleModal');
        await expect(roleModal).toBeVisible();
        
        // Click on sniper role
        await page.click('[data-role="sniper"]');
        
        // Should be selected
        await expect(page.locator('[data-role="sniper"]')).toHaveClass(/selected/);
        
        // Check current role via test hook
        const currentRole = await page.evaluate(() => window._test?.getCurrentRole());
        expect(currentRole).toBe('sniper');
    });

    test('should auto-start game after role selection', async ({ page }) => {
        await page.goto('/');
        
        // Enter name
        await page.fill('#playerName', 'TestPlayer');
        await page.click('button[type="submit"]');
        
        // Wait for role modal and let it auto-proceed
        const roleModal = page.locator('#roleModal');
        await expect(roleModal).toBeVisible();
        
        // Wait for game to start (should happen automatically after 2 seconds)
        await page.waitForTimeout(2500);
        
        // Role modal should be hidden and game should be visible
        await expect(roleModal).toHaveClass(/hidden/);
        
        const gameContainer = page.locator('#gameContainer');
        await expect(gameContainer).toBeVisible();
        
        // Canvas should be present
        await expect(page.locator('#gameCanvas')).toBeVisible();
        
        // HUD elements should be visible
        await expect(page.locator('#playerInfo')).toBeVisible();
        await expect(page.locator('#stats')).toBeVisible();
        
        // Test hook should indicate game has started
        const isGameStarted = await page.evaluate(() => window._test?.isGameStarted());
        expect(isGameStarted).toBe(true);
    });

    test('should display player info in HUD after game start', async ({ page }) => {
        await page.goto('/');
        
        const testName = 'TestPlayer';
        
        // Complete the flow
        await page.fill('#playerName', testName);
        await page.click('button[type="submit"]');
        
        // Wait for game to start
        await page.waitForTimeout(3000);
        
        // Check HUD displays player info
        const playerNameElement = page.locator('#playerInfo #playerName');
        await expect(playerNameElement).toContainText(testName);
        
        const playerRoleElement = page.locator('#playerInfo #playerRole');
        await expect(playerRoleElement).toContainText('⚔️ Assault'); // Default role
        
        // Check health and ammo displays
        await expect(page.locator('#healthText')).toContainText('100/100');
        await expect(page.locator('#ammoText')).toContainText('30/30');
    });
});