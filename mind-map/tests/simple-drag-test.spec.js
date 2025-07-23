const { test, expect } = require('@playwright/test');

test('simple drag test', async ({ page }) => {
  await page.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  
  // Join workspace
  await page.locator('#workspace-input').fill('simple-drag');
  await page.locator('#join-workspace-btn').click();
  await page.waitForTimeout(1000);
  
  // Create a node
  await page.locator('#nodeTool').click();
  const canvas = page.locator('#canvas');
  await canvas.click({ position: { x: 200, y: 200 } });
  
  // Close modal
  await page.waitForTimeout(300);
  if (await page.locator('#nodeEditorModal').isVisible()) {
    await page.locator('#saveNodeBtn').click();
  }
  
  // Switch to select mode
  await page.locator('#selectTool').click();
  
  // Get node position
  const circle = page.locator('.mind-map-node circle').first();
  const initialCx = await circle.getAttribute('cx');
  console.log('Initial X position:', initialCx);
  
  // Drag node
  const node = page.locator('.mind-map-node').first();
  await node.hover();
  await page.mouse.down();
  await page.mouse.move(300, 250);  // Move to new position
  await page.mouse.up();
  
  await page.waitForTimeout(500);
  
  // Check new position
  const finalCx = await circle.getAttribute('cx');
  console.log('Final X position:', finalCx);
  
  const moved = Math.abs(parseFloat(finalCx) - parseFloat(initialCx)) > 5;
  console.log('Node moved:', moved ? '✅ YES' : '❌ NO');
  
  expect(moved).toBeTruthy();
});