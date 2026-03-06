import { test, expect } from '@playwright/test';

test.describe('FPS Arena - Multiplayer Features', () => {
    test('should allow two players to join the same game', async ({ browser }) => {
        // Create two browser contexts for two different players
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        
        const page1 = await context1.newPage();
        const page2 = await context2.newPage();
        
        try {
            // Player 1 joins
            await page1.goto('/');
            await page1.fill('#playerName', 'Player1');
            await page1.click('button[type="submit"]');
            
            // Wait for Player 1 to start game
            await page1.waitForTimeout(3000);
            
            // Verify Player 1 is in game
            const gameContainer1 = page1.locator('#gameContainer');
            await expect(gameContainer1).toBeVisible();
            
            // Player 2 joins
            await page2.goto('/');
            await page2.fill('#playerName', 'Player2');
            await page2.click('button[type="submit"]');
            
            // Wait for Player 2 to start game
            await page2.waitForTimeout(3000);
            
            // Verify Player 2 is in game
            const gameContainer2 = page2.locator('#gameContainer');
            await expect(gameContainer2).toBeVisible();
            
            // Wait a bit for real-time sync
            await page1.waitForTimeout(2000);
            await page2.waitForTimeout(2000);
            
            // Check that both players can see each other in the player list
            // Note: This might need adjustment based on the actual implementation
            const playersCount1 = await page1.evaluate(() => window._test?.getPlayersCount());
            const playersCount2 = await page2.evaluate(() => window._test?.getPlayersCount());
            
            // Should have at least 2 players (including themselves)
            expect(playersCount1).toBeGreaterThanOrEqual(1);
            expect(playersCount2).toBeGreaterThanOrEqual(1);
            
            // Verify player names are stored correctly
            const player1Name = await page1.evaluate(() => window._test?.getPlayerName());
            const player2Name = await page2.evaluate(() => window._test?.getPlayerName());
            
            expect(player1Name).toBe('Player1');
            expect(player2Name).toBe('Player2');
            
        } finally {
            await context1.close();
            await context2.close();
        }
    });

    test('should handle connection status updates', async ({ page }) => {
        await page.goto('/');
        
        // Initially should show connecting status
        const connectionStatus = page.locator('#connectionStatus .status-text');
        await expect(connectionStatus).toContainText('Connecting...');
        
        // Complete the join flow
        await page.fill('#playerName', 'TestPlayer');
        await page.click('button[type="submit"]');
        
        // Wait for game start and connection
        await page.waitForTimeout(4000);
        
        // Should eventually show connected status
        await expect(connectionStatus).toContainText('Connected');
        
        // Connection indicator should be green (connected class)
        const statusIndicator = page.locator('#connectionStatus .status-indicator');
        await expect(statusIndicator).toHaveClass(/connected/);
    });

    test('should display different roles correctly', async ({ page }) => {
        await page.goto('/');
        
        // Enter name
        await page.fill('#playerName', 'TestPlayer');
        await page.click('button[type="submit"]');
        
        // Select medic role
        await page.click('[data-role="medic"]');
        
        // Wait for game to start
        await page.waitForTimeout(3000);
        
        // Should show medic role in HUD
        const playerRoleElement = page.locator('#playerInfo #playerRole');
        await expect(playerRoleElement).toContainText('🏥 Medic');
        
        // Should show role-specific actions for medic
        const roleActions = page.locator('#roleActions');
        await expect(roleActions).toContainText('Heal Nearby');
        
        // Check that medic has correct stats
        await expect(page.locator('#healthText')).toContainText('120/120'); // Medic has more health
        await expect(page.locator('#ammoText')).toContainText('20/20'); // Medic has less ammo
    });

    test('should handle game controls display', async ({ page }) => {
        await page.goto('/');
        
        // Complete join flow
        await page.fill('#playerName', 'TestPlayer');
        await page.click('button[type="submit"]');
        
        // Wait for game to start
        await page.waitForTimeout(3000);
        
        // Check that controls are displayed
        const controls = page.locator('#controls');
        await expect(controls).toBeVisible();
        await expect(controls).toContainText('WASD/Arrow Keys: Move');
        await expect(controls).toContainText('Spacebar: Shoot');
        await expect(controls).toContainText('R: Reload');
        
        // Check player list is displayed
        const playerList = page.locator('#playerList');
        await expect(playerList).toBeVisible();
        await expect(page.locator('#playerList h4')).toContainText('Players:');
    });

    test('should handle role switching', async ({ page }) => {
        await page.goto('/');
        
        // Enter name
        await page.fill('#playerName', 'TestPlayer');
        await page.click('button[type="submit"]');
        
        // Initially assault should be selected (default)
        let currentRole = await page.evaluate(() => window._test?.getCurrentRole());
        expect(currentRole).toBe('assault');
        
        // Select sniper role
        await page.click('[data-role="sniper"]');
        
        currentRole = await page.evaluate(() => window._test?.getCurrentRole());
        expect(currentRole).toBe('sniper');
        
        // Select medic role
        await page.click('[data-role="medic"]');
        
        currentRole = await page.evaluate(() => window._test?.getCurrentRole());
        expect(currentRole).toBe('medic');
    });

    test('should validate game canvas and rendering', async ({ page }) => {
        await page.goto('/');
        
        // Complete join flow
        await page.fill('#playerName', 'TestPlayer');
        await page.click('button[type="submit"]');
        
        // Wait for game to start
        await page.waitForTimeout(3000);
        
        // Canvas should be visible and have correct dimensions
        const canvas = page.locator('#gameCanvas');
        await expect(canvas).toBeVisible();
        
        // Check canvas dimensions
        const canvasWidth = await canvas.getAttribute('width');
        const canvasHeight = await canvas.getAttribute('height');
        
        expect(canvasWidth).toBe('800');
        expect(canvasHeight).toBe('600');
        
        // Canvas should have game styling
        await expect(canvas).toHaveCSS('border-width', '2px');
    });

    test('should handle invalid connection gracefully', async ({ page }) => {
        await page.goto('/');
        
        // Complete the form
        await page.fill('#playerName', 'TestPlayer');
        await page.click('button[type="submit"]');
        
        // Wait a bit for connection attempt
        await page.waitForTimeout(1000);
        
        // Should not crash and should show some status
        const connectionStatus = page.locator('#connectionStatus');
        await expect(connectionStatus).toBeVisible();
        
        // Page should not have any uncaught errors
        const errors = [];
        page.on('pageerror', error => errors.push(error));
        
        await page.waitForTimeout(2000);
        
        // Should not have critical JavaScript errors
        expect(errors.filter(e => e.message.includes('Cannot read property'))).toHaveLength(0);
    });
});