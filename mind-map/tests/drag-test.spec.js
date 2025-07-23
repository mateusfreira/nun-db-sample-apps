const { test, expect } = require('@playwright/test');

test.describe('Mind Map Dragging Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('file://' + require('path').resolve(__dirname, '../index.html'));
    
    // Join workspace
    await page.locator('#workspace-input').fill('drag-test');
    await page.locator('#join-workspace-btn').click();
    await page.waitForTimeout(1000);
  });

  test('should drag nodes in select mode', async ({ page }) => {
    // Create a node
    await page.locator('#nodeTool').click();
    const canvas = page.locator('#canvas');
    await canvas.click({ position: { x: 200, y: 200 } });
    
    // Close modal if it appears
    await page.waitForTimeout(300);
    if (await page.locator('#nodeEditorModal').isVisible()) {
      await page.locator('#saveNodeBtn').click();
      await page.waitForTimeout(200);
    }
    
    // Switch to select mode
    await page.locator('#selectTool').click();
    await page.waitForTimeout(200);
    
    // Get the node and its initial position
    await page.waitForSelector('.mind-map-node');
    const node = page.locator('.mind-map-node').first();
    const circle = page.locator('.mind-map-node circle').first();
    
    const initialCx = parseFloat(await circle.getAttribute('cx'));
    const initialCy = parseFloat(await circle.getAttribute('cy'));
    
    console.log(`Initial position: (${initialCx}, ${initialCy})`);
    
    // Drag the node using mouse events
    const nodeBox = await node.boundingBox();
    console.log('Node bounding box:', nodeBox);
    
    // Start drag from center of node
    const startX = nodeBox.x + nodeBox.width / 2;
    const startY = nodeBox.y + nodeBox.height / 2;
    const endX = startX + 100; // Move 100px to the right
    const endY = startY + 50;  // Move 50px down
    
    console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);
    
    // Perform drag operation
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(100); // Small delay to ensure drag starts
    await page.mouse.move(endX, endY);
    await page.waitForTimeout(100); // Small delay during drag
    await page.mouse.up();
    
    // Wait for position update
    await page.waitForTimeout(500);
    
    // Check if the node moved
    const finalCx = parseFloat(await circle.getAttribute('cx'));
    const finalCy = parseFloat(await circle.getAttribute('cy'));
    
    console.log(`Final position: (${finalCx}, ${finalCy})`);
    
    // Check if position changed significantly
    const deltaX = Math.abs(finalCx - initialCx);
    const deltaY = Math.abs(finalCy - initialCy);
    
    console.log(`Movement: deltaX=${deltaX}, deltaY=${deltaY}`);
    
    // Expect significant movement (at least 10px in any direction)
    expect(deltaX > 10 || deltaY > 10).toBeTruthy();
    
    if (deltaX > 10 || deltaY > 10) {
      console.log('✅ Node dragging works correctly!');
    } else {
      console.log('⚠️ Node did not move significantly');
    }
  });

  test('should not drag nodes in other tool modes', async ({ page }) => {
    // Create a node
    await page.locator('#nodeTool').click();
    const canvas = page.locator('#canvas');
    await canvas.click({ position: { x: 200, y: 200 } });
    
    // Close modal if it appears
    await page.waitForTimeout(300);
    if (await page.locator('#nodeEditorModal').isVisible()) {
      await page.locator('#saveNodeBtn').click();
      await page.waitForTimeout(200);
    }
    
    // Stay in node mode (should not allow dragging)
    await page.waitForSelector('.mind-map-node');
    const circle = page.locator('.mind-map-node circle').first();
    
    const initialCx = parseFloat(await circle.getAttribute('cx'));
    const initialCy = parseFloat(await circle.getAttribute('cy'));
    
    // Try to drag the node
    const node = page.locator('.mind-map-node').first();
    const nodeBox = await node.boundingBox();
    
    const startX = nodeBox.x + nodeBox.width / 2;
    const startY = nodeBox.y + nodeBox.height / 2;
    const endX = startX + 50;
    const endY = startY + 50;
    
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY);
    await page.mouse.up();
    
    await page.waitForTimeout(300);
    
    // Position should not change significantly in node mode
    const finalCx = parseFloat(await circle.getAttribute('cx'));
    const finalCy = parseFloat(await circle.getAttribute('cy'));
    
    const deltaX = Math.abs(finalCx - initialCx);
    const deltaY = Math.abs(finalCy - initialCy);
    
    console.log(`In node mode - Movement: deltaX=${deltaX}, deltaY=${deltaY}`);
    
    // Should not move much in node mode
    expect(deltaX < 5 && deltaY < 5).toBeTruthy();
    console.log('✅ Nodes correctly do not drag in node mode!');
  });
});