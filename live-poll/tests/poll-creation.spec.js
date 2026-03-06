const { test, expect } = require('@playwright/test');

test.describe('Live Poll - Poll Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to initialize
    await page.waitForLoadState('networkidle');
  });

  test('should display the create poll form on initial load', async ({ page }) => {
    // Check that create page is active
    await expect(page.locator('#createPage')).toHaveClass(/active/);
    
    // Check form elements are present
    await expect(page.locator('#pollQuestion')).toBeVisible();
    await expect(page.locator('#optionsList')).toBeVisible();
    await expect(page.locator('#addOption')).toBeVisible();
    await expect(page.locator('#createPollForm button[type="submit"]')).toBeVisible();
    
    // Check initial options
    const optionInputs = page.locator('.option-input');
    await expect(optionInputs).toHaveCount(2);
  });

  test('should add and remove poll options', async ({ page }) => {
    // Initial state: 2 options
    let optionInputs = page.locator('.option-input');
    await expect(optionInputs).toHaveCount(2);
    
    // Add an option
    await page.click('#addOption');
    await expect(optionInputs).toHaveCount(3);
    
    // Add another option
    await page.click('#addOption');
    await expect(optionInputs).toHaveCount(4);
    
    // Remove buttons should be enabled when more than 2 options
    const removeButtons = page.locator('.btn-remove:not(:disabled)');
    await expect(removeButtons).toHaveCount(4);
    
    // Remove an option
    await page.locator('.btn-remove').last().click();
    await expect(optionInputs).toHaveCount(3);
  });

  test('should enforce character limit on question', async ({ page }) => {
    const questionInput = page.locator('#pollQuestion');
    const charCount = page.locator('.char-count');
    
    // Initial state
    await expect(charCount).toHaveText('0/200');
    
    // Type a question
    const testQuestion = 'What is your favorite programming language?';
    await questionInput.fill(testQuestion);
    await expect(charCount).toHaveText(`${testQuestion.length}/200`);
    
    // Check maxlength attribute
    await expect(questionInput).toHaveAttribute('maxlength', '200');
  });

  test('should create a poll and navigate to voting page', async ({ page }) => {
    // Fill in the poll form
    await page.fill('#pollQuestion', 'What is your favorite color?');
    
    // Fill in options
    const optionInputs = page.locator('.option-input');
    await optionInputs.nth(0).fill('Red');
    await optionInputs.nth(1).fill('Blue');
    
    // Add and fill a third option
    await page.click('#addOption');
    await optionInputs.nth(2).fill('Green');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for navigation to voting page
    await page.waitForSelector('#votePage.active', { state: 'visible' });
    
    // Check that URL contains poll ID
    await expect(page).toHaveURL(/\?p=[a-z0-9]{6}/);
    
    // Verify poll question is displayed
    await expect(page.locator('#pollQuestionDisplay')).toHaveText('What is your favorite color?');
    
    // Verify options are displayed
    const voteOptions = page.locator('.vote-option-label');
    await expect(voteOptions).toHaveCount(3);
    await expect(voteOptions.nth(0)).toContainText('Red');
    await expect(voteOptions.nth(1)).toContainText('Blue');
    await expect(voteOptions.nth(2)).toContainText('Green');
  });

  test('should validate form before submission', async ({ page }) => {
    // Try to submit without filling required fields
    await page.click('button[type="submit"]');
    
    // Should still be on create page
    await expect(page.locator('#createPage')).toHaveClass(/active/);
    
    // Fill question but leave options empty
    await page.fill('#pollQuestion', 'Test question');
    const optionInputs = page.locator('.option-input');
    await optionInputs.nth(0).fill('');
    await optionInputs.nth(1).fill('');
    
    // Browser validation should prevent submission
    await page.click('button[type="submit"]');
    await expect(page.locator('#createPage')).toHaveClass(/active/);
  });

  test('should handle settings correctly', async ({ page }) => {
    // Check default settings
    const allowMultiple = page.locator('#allowMultiple');
    const showResults = page.locator('#showResults');
    
    await expect(allowMultiple).not.toBeChecked();
    await expect(showResults).toBeChecked();
    
    // Toggle settings
    await allowMultiple.check();
    await showResults.uncheck();
    
    // Create poll with custom settings
    await page.fill('#pollQuestion', 'Select your skills');
    await page.locator('.option-input').nth(0).fill('JavaScript');
    await page.locator('.option-input').nth(1).fill('Python');
    
    await page.click('button[type="submit"]');
    
    // Wait for voting page
    await page.waitForSelector('#votePage.active', { state: 'visible' });
    
    // Check that checkboxes are rendered (multiple choice)
    const checkboxes = page.locator('input[type="checkbox"][name="pollOption"]');
    await expect(checkboxes).toHaveCount(2);
  });

  test('should show loading state during poll creation', async ({ page }) => {
    // Fill in the poll form
    await page.fill('#pollQuestion', 'Loading test');
    await page.locator('.option-input').nth(0).fill('Option 1');
    await page.locator('.option-input').nth(1).fill('Option 2');
    
    // Monitor loading state
    const loadingPromise = page.waitForSelector('#loadingState.active', { state: 'visible' });
    const hiddenPromise = page.waitForSelector('#loadingState.active', { state: 'hidden' });
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Loading should appear and then disappear
    await loadingPromise;
    await hiddenPromise;
    
    // Should be on voting page
    await page.waitForSelector('#votePage.active', { state: 'visible' });
  });

  test('should prevent adding more than 10 options', async ({ page }) => {
    // Add options until we reach the limit
    for (let i = 2; i < 10; i++) {
      await page.click('#addOption');
    }
    
    // Should have 10 options now
    const optionInputs = page.locator('.option-input');
    await expect(optionInputs).toHaveCount(10);
    
    // Try to add another option
    await page.click('#addOption');
    
    // Should still have 10 options
    await expect(optionInputs).toHaveCount(10);
    
    // Should show error toast
    await expect(page.locator('.toast.error')).toContainText('Maximum 10 options allowed');
  });
});