import { test, expect } from './browser-test.js';

test('focus returns to the trigger button after Settings and Account dialogs close', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#welcome-title');

  await page.locator('[data-begin-ledger]').first().click();
  await page.locator('[data-close-moment]').first().click();

  const settingsButton = page.getByRole('button', { name: 'Journey settings' });
  await settingsButton.click();
  await expect(page.locator('#settings-dialog')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('#settings-dialog')).toBeHidden();
  await expect(settingsButton).toBeFocused();

  const accountButton = page.locator('#account-button');
  await accountButton.click();
  await expect(page.locator('#account-dialog')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('#account-dialog')).toBeHidden();
  await expect(accountButton).toBeFocused();
});
