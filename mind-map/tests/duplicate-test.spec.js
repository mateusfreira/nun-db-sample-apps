const { test, expect } = require('@playwright/test');

test('test for duplicate nodes during drag', async ({ page }) => {
  await page.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  
  // Join workspace
  await page.locator('#workspace-input').fill('duplicate-test');
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
  await page.waitForTimeout(200);
  
  // Count initial nodes
  await page.waitForSelector('.mind-map-node');
  const initialCount = await page.locator('.mind-map-node').count();
  console.log('Initial node count:', initialCount);
  
  // Drag the node
  const node = page.locator('.mind-map-node').first();
  await node.hover();
  await page.mouse.down();
  
  // During drag, check node count
  await page.mouse.move(300, 250);
  await page.waitForTimeout(100);
  const duringDragCount = await page.locator('.mind-map-node').count();
  console.log('Node count during drag:', duringDragCount);
  
  await page.mouse.up();
  await page.waitForTimeout(500);
  
  // Final count after drag
  const finalCount = await page.locator('.mind-map-node').count();
  console.log('Final node count:', finalCount);
  
  // Check for duplicate nodes
  const hasDuplicates = duringDragCount > initialCount || finalCount > initialCount;
  
  if (hasDuplicates) {
    console.log('❌ DUPLICATE NODES DETECTED!');
    console.log(`Initial: ${initialCount}, During: ${duringDragCount}, Final: ${finalCount}`);
  } else {
    console.log('✅ NO DUPLICATES - Drag working correctly!');
  }
  
  // Test should pass if no duplicates
  expect(finalCount).toBe(initialCount);
  expect(duringDragCount).toBe(initialCount);
});