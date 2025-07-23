const { test, expect } = require('@playwright/test');

test('CSS styling verification', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Wait for page to load
  await page.waitForTimeout(1000);
  
  // Check if setup screen has proper styling
  const setupScreen = page.locator('#setup-screen');
  await expect(setupScreen).toBeVisible();
  
  // Check if the card has proper background color
  const card = page.locator('.setup-card');
  const cardStyle = await card.evaluate(el => {
    const styles = window.getComputedStyle(el);
    return {
      backgroundColor: styles.backgroundColor,
      borderRadius: styles.borderRadius,
      padding: styles.padding
    };
  });
  
  console.log('Card styles:', cardStyle);
  
  // Check if button has proper styling
  const button = page.locator('#join-workspace-btn');
  const buttonStyle = await button.evaluate(el => {
    const styles = window.getComputedStyle(el);
    return {
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      borderRadius: styles.borderRadius,
      padding: styles.padding
    };
  });
  
  console.log('Button styles:', buttonStyle);
  
  // Check if input has proper styling  
  const input = page.locator('#workspace-input');
  const inputStyle = await input.evaluate(el => {
    const styles = window.getComputedStyle(el);
    return {
      borderRadius: styles.borderRadius,
      padding: styles.padding,
      fontSize: styles.fontSize
    };
  });
  
  console.log('Input styles:', inputStyle);
  
  // Verify that elements have non-default styles (indicating CSS is loaded)
  expect(cardStyle.backgroundColor).not.toBe('rgba(0, 0, 0, 0)'); // Should have white background
  expect(cardStyle.borderRadius).not.toBe('0px'); // Should have border radius
  expect(buttonStyle.borderRadius).not.toBe('0px'); // Should have border radius
  expect(inputStyle.borderRadius).not.toBe('0px'); // Should have border radius
});