const { test, expect } = require('@playwright/test');

test.describe('Mind Map Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  });

  test('should create and connect nodes', async ({ page }) => {
    // Join workspace
    await page.locator('#workspace-input').fill('test-workspace');
    await page.locator('#join-workspace-btn').click();
    await page.waitForTimeout(500);
    
    // Create first node
    await page.locator('#nodeTool').click();
    const canvas = page.locator('#canvas');
    await canvas.click({ position: { x: 150, y: 150 } });
    
    // Wait for modal and close it quickly (just save default)
    await page.waitForTimeout(300);
    const modal = page.locator('#nodeEditorModal');
    if (await modal.isVisible()) {
      console.log('Modal visible for first node, saving...');
      await page.locator('#saveNodeBtn').click();
      await page.waitForTimeout(200);
    } else {
      console.log('Modal not visible for first node, continuing...');
    }
    
    // Wait to see first node
    await page.waitForSelector('.mind-map-node');
    console.log('First node created');
    
    // Create second node
    await canvas.click({ position: { x: 350, y: 150 } });
    await page.waitForTimeout(300);
    if (await modal.isVisible()) {
      console.log('Modal visible for second node, saving...');
      await page.locator('#saveNodeBtn').click();
      await page.waitForTimeout(200);
    } else {
      console.log('Modal not visible for second node, continuing...');
    }
    
    // Verify two nodes exist
    await page.waitForSelector('.mind-map-node');
    const nodes = page.locator('.mind-map-node');
    await expect(nodes).toHaveCount(2);
    
    // Switch to connect tool
    await page.locator('#connectTool').click();
    
    // Connect the nodes
    const firstNode = nodes.first();
    const secondNode = nodes.last();
    
    await firstNode.click();
    await secondNode.click();
    
    // Wait and check for connection
    await page.waitForTimeout(500);
    const connections = page.locator('.connection-line');
    await expect(connections).toHaveCount(1);
    
    console.log('✅ Connection test passed!');
  });

  test('should switch tools correctly', async ({ page }) => {
    // Join workspace
    await page.locator('#workspace-input').fill('test-workspace');
    await page.locator('#join-workspace-btn').click();
    await page.waitForTimeout(500);
    
    const selectTool = page.locator('#selectTool');
    const nodeTool = page.locator('#nodeTool');
    const canvas = page.locator('#canvas');
    
    // Check initial state
    await expect(selectTool).toHaveClass(/active/);
    
    // Switch to node tool
    await nodeTool.click();
    await expect(nodeTool).toHaveClass(/active/);
    await expect(selectTool).not.toHaveClass(/active/);
    
    console.log('✅ Tool switching test passed!');
  });
});