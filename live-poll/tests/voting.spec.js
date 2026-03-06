const { test, expect } = require('@playwright/test');

test.describe('Live Poll - Voting', () => {
  let pollId;

  test.beforeEach(async ({ page }) => {
    // Create a poll first
    await page.goto('/');
    
    // Fill in poll details
    await page.fill('#pollQuestion', 'What is your favorite fruit?');
    await page.locator('.option-input').nth(0).fill('Apple');
    await page.locator('.option-input').nth(1).fill('Banana');
    await page.click('#addOption');
    await page.locator('.option-input').nth(2).fill('Orange');
    
    // Submit to create poll
    await page.click('button[type="submit"]');
    
    // Wait for voting page and extract poll ID
    await page.waitForSelector('#votePage.active', { state: 'visible' });
    const url = page.url();
    const match = url.match(/\?p=([a-z0-9]{6})/);
    pollId = match ? match[1] : null;
    
    expect(pollId).toBeTruthy();
  });

  test('should display poll correctly on voting page', async ({ page }) => {
    // Check poll question
    await expect(page.locator('#pollQuestionDisplay')).toHaveText('What is your favorite fruit?');
    
    // Check poll ID is displayed
    await expect(page.locator('#pollId')).toHaveText(pollId);
    
    // Check options
    const options = page.locator('.vote-option-label');
    await expect(options).toHaveCount(3);
    await expect(options.nth(0)).toContainText('Apple');
    await expect(options.nth(1)).toContainText('Banana');
    await expect(options.nth(2)).toContainText('Orange');
    
    // Check vote count
    await expect(page.locator('#totalVotes')).toHaveText('0 votes');
    
    // Check live indicator
    await expect(page.locator('#liveIndicator')).toBeVisible();
  });

  test('should submit a vote successfully', async ({ page }) => {
    // Select an option
    await page.click('label[for="option-1"]');
    
    // Submit vote
    await page.click('#submitVote');
    
    // Should show results section
    await expect(page.locator('#resultsSection')).toBeVisible();
    await expect(page.locator('#votingSection')).not.toBeVisible();
    
    // Check results
    const resultItems = page.locator('.result-item');
    await expect(resultItems).toHaveCount(3);
    
    // Check that Banana has 1 vote
    const bananaResult = resultItems.filter({ hasText: 'Banana' });
    await expect(bananaResult.locator('.result-votes')).toContainText('1 vote');
    await expect(bananaResult.locator('.result-percentage')).toContainText('100.0%');
    
    // Total votes should update
    await expect(page.locator('#totalVotes')).toHaveText('1 vote');
  });

  test('should prevent duplicate voting', async ({ page }) => {
    // Submit first vote
    await page.click('label[for="option-0"]');
    await page.click('#submitVote');
    
    // Reload the page
    await page.reload();
    
    // Should show results immediately (already voted)
    await expect(page.locator('#resultsSection')).toBeVisible();
    await expect(page.locator('#votingSection')).not.toBeVisible();
  });

  test('should load existing poll by URL', async ({ page, context }) => {
    // Open a new page with the poll URL
    const newPage = await context.newPage();
    await newPage.goto(`/?p=${pollId}`);
    
    // Should show the voting page
    await newPage.waitForSelector('#votePage.active', { state: 'visible' });
    
    // Check poll details
    await expect(newPage.locator('#pollQuestionDisplay')).toHaveText('What is your favorite fruit?');
    await expect(newPage.locator('#pollId')).toHaveText(pollId);
    
    // Check options are displayed
    const options = newPage.locator('.vote-option-label');
    await expect(options).toHaveCount(3);
  });

  test('should handle share functionality', async ({ page, context }) => {
    // Click share button
    await page.click('#shareBtn');
    
    // Check if URL was copied (toast message)
    await expect(page.locator('.toast.success')).toContainText('Link copied to clipboard');
    
    // Verify the URL format
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\?p=[a-z0-9]{6}/);
  });

  test('should show real-time updates', async ({ page, context }) => {
    // Open two pages for the same poll
    const voter1 = page;
    const voter2 = await context.newPage();
    await voter2.goto(`/?p=${pollId}`);
    
    // Voter 1 votes for Apple
    await voter1.click('label[for="option-0"]');
    await voter1.click('#submitVote');
    
    // Check results on voter 1's page
    await expect(voter1.locator('#resultsSection')).toBeVisible();
    
    // Voter 2 should see updated vote count
    await expect(voter2.locator('#totalVotes')).toHaveText('1 vote');
    
    // Voter 2 votes for Banana
    await voter2.click('label[for="option-1"]');
    await voter2.click('#submitVote');
    
    // Both should see 2 total votes
    await expect(voter1.locator('#totalVotes')).toHaveText('2 votes');
    await expect(voter2.locator('#totalVotes')).toHaveText('2 votes');
    
    // Check vote distribution on voter 1's page
    const appleResult = voter1.locator('.result-item').filter({ hasText: 'Apple' });
    await expect(appleResult.locator('.result-percentage')).toContainText('50.0%');
    
    const bananaResult = voter1.locator('.result-item').filter({ hasText: 'Banana' });
    await expect(bananaResult.locator('.result-percentage')).toContainText('50.0%');
  });

  test('should handle multiple choice polls', async ({ page }) => {
    // Create a multiple choice poll
    await page.goto('/');
    
    await page.fill('#pollQuestion', 'Select your skills');
    await page.locator('.option-input').nth(0).fill('JavaScript');
    await page.locator('.option-input').nth(1).fill('Python');
    await page.click('#addOption');
    await page.locator('.option-input').nth(2).fill('Java');
    
    // Enable multiple choice
    await page.check('#allowMultiple');
    
    // Create poll
    await page.click('button[type="submit"]');
    
    // Should have checkboxes instead of radio buttons
    const checkboxes = page.locator('input[type="checkbox"][name="pollOption"]');
    await expect(checkboxes).toHaveCount(3);
    
    // Select multiple options
    await page.check('#option-0');
    await page.check('#option-2');
    
    // Submit vote
    await page.click('#submitVote');
    
    // Check results
    await expect(page.locator('#resultsSection')).toBeVisible();
    
    // JavaScript and Java should each have 1 vote
    const jsResult = page.locator('.result-item').filter({ hasText: 'JavaScript' });
    await expect(jsResult.locator('.result-votes')).toContainText('1 vote');
    
    const javaResult = page.locator('.result-item').filter({ hasText: 'Java' });
    await expect(javaResult.locator('.result-votes')).toContainText('1 vote');
    
    // Total votes should be 1 (one person voted)
    await expect(page.locator('#totalVotes')).toHaveText('1 vote');
  });

  test('should handle "New Poll" button', async ({ page }) => {
    // Vote first
    await page.click('label[for="option-0"]');
    await page.click('#submitVote');
    
    // Click new poll button
    await page.click('#newPollBtn');
    
    // Should navigate to create page
    await expect(page).toHaveURL('/');
    await page.waitForSelector('#createPage.active', { state: 'visible' });
  });

  test('should show winner highlighting', async ({ page, context }) => {
    // Create multiple voters
    const voters = [page];
    for (let i = 0; i < 3; i++) {
      const newVoter = await context.newPage();
      await newVoter.goto(`/?p=${pollId}`);
      voters.push(newVoter);
    }
    
    // Vote distribution: Apple-3, Banana-1
    await voters[0].click('label[for="option-0"]'); // Apple
    await voters[0].click('#submitVote');
    
    await voters[1].click('label[for="option-0"]'); // Apple
    await voters[1].click('#submitVote');
    
    await voters[2].click('label[for="option-0"]'); // Apple
    await voters[2].click('#submitVote');
    
    await voters[3].click('label[for="option-1"]'); // Banana
    await voters[3].click('#submitVote');
    
    // Check winner highlighting on first voter's page
    await page.waitForTimeout(500); // Wait for updates
    const appleBar = page.locator('.result-bar').filter({ hasText: '75.0%' });
    await expect(appleBar).toHaveClass(/winner/);
    
    // Close extra pages
    for (let i = 1; i < voters.length; i++) {
      await voters[i].close();
    }
  });
});