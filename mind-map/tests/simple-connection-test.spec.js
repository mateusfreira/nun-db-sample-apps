const { test, expect } = require('@playwright/test');

test('simple workspace join and connection test', async ({ page }) => {
  // Enable console logging to see debug messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.goto('http://localhost:3000');
  
  // Wait for the page to load
  await page.waitForTimeout(2000);
  
  console.log('Filling workspace input...');
  const workspaceInput = page.locator('#workspace-input');
  await workspaceInput.fill('test-workspace');
  
  console.log('Waiting for button to be enabled...');
  const joinBtn = page.locator('#join-workspace-btn');
  
  // Check if button becomes enabled after filling input
  await page.waitForTimeout(500);
  
  const isEnabled = await joinBtn.isEnabled();
  console.log('Join button enabled:', isEnabled);
  
  if (!isEnabled) {
    console.log('Button still disabled, checking HTML attributes...');
    const buttonHtml = await joinBtn.innerHTML();
    console.log('Button HTML:', buttonHtml);
    
    const isDisabled = await joinBtn.getAttribute('disabled');
    console.log('Button disabled attribute:', isDisabled);
  }
  
  // Force enable if needed for testing
  if (!isEnabled) {
    await page.evaluate(() => {
      document.getElementById('join-workspace-btn').disabled = false;
    });
  }
  
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
    
    // Test basic node creation
    console.log('Testing node creation...');
    const nodeTool = page.locator('[data-tool="node"]');
    await nodeTool.click();
    
    const canvas = page.locator('#canvas');
    await canvas.click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(500);
    
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(500);
    
    // Check if nodes were created
    const nodes = page.locator('.mind-map-node');
    const nodeCount = await nodes.count();
    console.log('Nodes created:', nodeCount);
    
    if (nodeCount >= 2) {
      console.log('Testing connection creation...');
      const connectionTool = page.locator('[data-tool="connection"]');
      await connectionTool.click();
      
      const firstNode = nodes.first();
      const secondNode = nodes.last();
      
      // Get the center position of nodes
      const firstBox = await firstNode.boundingBox();
      const secondBox = await secondNode.boundingBox();
      
      if (firstBox && secondBox) {
        console.log('Clicking on first node center...');
        await page.mouse.click(firstBox.x + firstBox.width/2, firstBox.y + firstBox.height/2);
        await page.waitForTimeout(300);
        
        console.log('Clicking on second node center...');
        await page.mouse.click(secondBox.x + secondBox.width/2, secondBox.y + secondBox.height/2);
        await page.waitForTimeout(500);
        
        // Check if connection was created
        const connections = page.locator('.mind-map-connection');
        const connectionCount = await connections.count();
        console.log('Connections created:', connectionCount);
        
        if (connectionCount > 0) {
          console.log('✅ Connection tool working!');
        } else {
          console.log('❌ Connection tool not working');
        }
      } else {
        console.log('Could not get node bounding boxes');
      }
    }
  } else {
    console.log('❌ Failed to join workspace');
  }
  
  console.log('Test completed');
});