const { test, expect } = require('@playwright/test');

test('connection functionality test with wider spacing', async ({ page }) => {
  // Enable console logging to see debug messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.goto('http://localhost:3000');
  
  // Wait for the page to load
  await page.waitForTimeout(2000);
  
  console.log('Filling workspace input...');
  const workspaceInput = page.locator('#workspace-input');
  await workspaceInput.fill('connection-test');
  
  console.log('Waiting for button to be enabled...');
  const joinBtn = page.locator('#join-workspace-btn');
  await page.waitForTimeout(500);
  
  console.log('Clicking join button...');
  await joinBtn.click();
  
  // Wait for workspace screen
  await page.waitForTimeout(3000);
  
  // Check if we're in workspace screen
  const workspaceScreen = page.locator('#workspace-screen');
  const isVisible = await workspaceScreen.isVisible();
  console.log('Workspace screen visible:', isVisible);
  
  if (isVisible) {
    console.log('✅ Successfully joined workspace');
    
    // Test basic node creation with wide spacing
    console.log('Testing node creation with wide spacing...');
    const nodeTool = page.locator('[data-tool="node"]');
    await nodeTool.click();
    
    const canvas = page.locator('#canvas');
    // Create nodes far apart to avoid coordinate transformation issues
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(500);
    
    await canvas.click({ position: { x: 600, y: 400 } });
    await page.waitForTimeout(500);
    
    // Check if nodes were created
    const nodes = page.locator('.mind-map-node');
    const nodeCount = await nodes.count();
    console.log('Nodes created:', nodeCount);
    
    if (nodeCount >= 2) {
      console.log('Testing connection creation...');
      const connectionTool = page.locator('[data-tool="connection"]');
      await connectionTool.click();
      
      // Click directly on canvas positions where nodes should be
      console.log('Clicking on first node area...');
      await canvas.click({ position: { x: 100, y: 100 } });
      await page.waitForTimeout(500);
      
      console.log('Clicking on second node area...');
      await canvas.click({ position: { x: 600, y: 400 } });
      await page.waitForTimeout(1000);
      
      // Check if connection was created
      const connections = page.locator('.mind-map-connection');
      const connectionCount = await connections.count();
      console.log('Connections created:', connectionCount);
      
      // Also check SVG lines
      const svgLines = page.locator('svg line');
      const svgLineCount = await svgLines.count();
      console.log('SVG lines found:', svgLineCount);
      
      if (connectionCount > 0 || svgLineCount > 0) {
        console.log('✅ Connection tool working!');
      } else {
        console.log('❌ Connection tool not working');
      }
    }
  } else {
    console.log('❌ Failed to join workspace');
  }
  
  console.log('Test completed');
});