const { test, expect } = require('@playwright/test');

test('final connection functionality test', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Join a workspace
  const workspaceInput = page.locator('#workspace-input');
  await workspaceInput.fill('final-test');
  await page.waitForTimeout(500);
  
  const joinBtn = page.locator('#join-workspace-btn');
  await joinBtn.click();
  
  // Wait for workspace screen
  await page.waitForTimeout(3000);
  await expect(page.locator('#workspace-screen')).toBeVisible();
  
  // Create nodes
  console.log('Creating nodes...');
  const nodeTool = page.locator('[data-tool="node"]');
  await nodeTool.click();
  
  const canvas = page.locator('#canvas');
  
  // Create first node at position (300, 200)
  await canvas.click({ position: { x: 300, y: 200 } });
  await page.waitForTimeout(500);
  
  // Create second node at position (500, 350)
  await canvas.click({ position: { x: 500, y: 350 } });
  await page.waitForTimeout(500);
  
  // Verify nodes were created
  const nodes = page.locator('.mind-map-node');
  await expect(nodes).toHaveCount(2);
  
  // Switch to connection tool
  console.log('Switching to connection tool...');
  const connectionTool = page.locator('[data-tool="connection"]');
  await connectionTool.click();
  await expect(connectionTool).toHaveClass(/active/);
  
  // Create connection by clicking on both node positions
  console.log('Creating connection...');
  await canvas.click({ position: { x: 300, y: 200 } });
  await page.waitForTimeout(300);
  await canvas.click({ position: { x: 500, y: 350 } });
  await page.waitForTimeout(1000);
  
  // Verify connection was created
  const connections = page.locator('.mind-map-connection');
  const connectionCount = await connections.count();
  console.log('Connection elements found:', connectionCount);
  
  // Also check SVG lines
  const svgLines = page.locator('svg line.mind-map-connection');
  const svgLineCount = await svgLines.count();
  console.log('SVG connection lines found:', svgLineCount);
  
  // Verify at least one connection method worked
  expect(connectionCount + svgLineCount).toBeGreaterThan(0);
  
  // Take a screenshot to verify visually
  await page.screenshot({ path: 'test-results/final-connection-test.png', fullPage: true });
  
  console.log('✅ Connection functionality test completed successfully!');
});