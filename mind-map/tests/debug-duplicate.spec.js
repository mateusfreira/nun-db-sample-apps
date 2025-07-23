const { test, expect } = require('@playwright/test');

test('debug duplicate nodes issue', async ({ page }) => {
  await page.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  
  // Enable console logging
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  
  // Join workspace
  await page.locator('#workspace-input').fill('debug-test');
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
  await page.waitForTimeout(500);
  
  // Get all nodes and their positions
  const nodes = page.locator('.mind-map-node');
  const initialCount = await nodes.count();
  console.log(`\n=== INITIAL STATE ===`);
  console.log(`Node count: ${initialCount}`);
  
  for (let i = 0; i < initialCount; i++) {
    const node = nodes.nth(i);
    const nodeId = await node.getAttribute('data-node-id');
    const circle = node.locator('circle');
    const cx = await circle.getAttribute('cx');
    const cy = await circle.getAttribute('cy');
    console.log(`Node ${i}: ID=${nodeId}, Position=(${cx}, ${cy})`);
  }
  
  // Start dragging
  console.log(`\n=== STARTING DRAG ===`);
  const firstNode = nodes.first();
  const nodeBox = await firstNode.boundingBox();
  
  await page.mouse.move(nodeBox.x + nodeBox.width/2, nodeBox.y + nodeBox.height/2);
  await page.mouse.down();
  
  // Check during drag
  await page.waitForTimeout(100);
  await page.mouse.move(nodeBox.x + 100, nodeBox.y + 50);
  await page.waitForTimeout(100);
  
  console.log(`\n=== DURING DRAG ===`);
  const duringCount = await nodes.count();
  console.log(`Node count: ${duringCount}`);
  
  for (let i = 0; i < duringCount; i++) {
    const node = nodes.nth(i);
    const nodeId = await node.getAttribute('data-node-id');
    const circle = node.locator('circle');
    const cx = await circle.getAttribute('cx');
    const cy = await circle.getAttribute('cy');
    console.log(`Node ${i}: ID=${nodeId}, Position=(${cx}, ${cy})`);
  }
  
  // Finish drag
  await page.mouse.up();
  await page.waitForTimeout(500);
  
  console.log(`\n=== AFTER DRAG ===`);
  const finalCount = await nodes.count();
  console.log(`Node count: ${finalCount}`);
  
  for (let i = 0; i < finalCount; i++) {
    const node = nodes.nth(i);
    const nodeId = await node.getAttribute('data-node-id');
    const circle = node.locator('circle');
    const cx = await circle.getAttribute('cx');
    const cy = await circle.getAttribute('cy');
    console.log(`Node ${i}: ID=${nodeId}, Position=(${cx}, ${cy})`);
  }
  
  // Look for nodes with same ID
  const nodeIds = [];
  for (let i = 0; i < finalCount; i++) {
    const nodeId = await nodes.nth(i).getAttribute('data-node-id');
    nodeIds.push(nodeId);
  }
  
  const uniqueIds = [...new Set(nodeIds)];
  console.log(`\n=== ANALYSIS ===`);
  console.log(`Total nodes: ${finalCount}`);
  console.log(`Unique IDs: ${uniqueIds.length}`);
  console.log(`Node IDs: ${nodeIds.join(', ')}`);
  
  if (finalCount > uniqueIds.length) {
    console.log(`❌ DUPLICATE NODES FOUND! Same ID appears multiple times.`);
  } else if (finalCount > 1) {
    console.log(`❌ MULTIPLE NODES FOUND! Different nodes created.`);
  } else {
    console.log(`✅ NO DUPLICATES FOUND!`);
  }
});