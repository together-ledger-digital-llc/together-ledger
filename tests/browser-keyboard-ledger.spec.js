import { test, expect } from './browser-test.js';
import { keyboardWalk } from './fixtures/keyboard-walk.js';

test('Walk the ledger by keyboard alone', async ({ page }) => {
  await page.goto('/');

  // Reach the ledger
  await page.locator('[data-begin-ledger]').first().click();
  await page.locator('[data-close-moment]').first().click();

  // Wait for the ledger to render before blurring
  await expect(page.locator('#moments-title')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Journey settings' })).toBeVisible();
  await expect(page.locator("#moment-dialog")).toBeHidden();

  // Reset focus from any interactions that brought us to the ledger
  await page.evaluate(() => {
    if (document.activeElement) {
      document.activeElement.blur();
    }
  });

  const stops = await keyboardWalk(page);

  // Expect at least one stop
  expect(stops.length).toBeGreaterThan(0);

  // Expect every stop to be visible and to show a ring
  for (const stop of stops) {
    expect(stop.visible).toBe(true);
    expect(stop.ring).toBe(true);
  }

  // Expect a stop whose name is 'Journey settings'
  const hasSettings = stops.some(stop => stop.name === "Journey settings");
  expect(hasSettings).toBe(true);

  // Expect a stop that is the #account-button (compare by its text)
  // account button initially says "Sign in", "Accounts soon", or "Account settings"
  const accountButtonName = await page.locator('#account-button').first().evaluate(el => el.getAttribute('aria-label') || (el.textContent || '').trim());

  const hasAccountButton = stops.some(stop => stop.name === accountButtonName);
  expect(hasAccountButton).toBe(true);

  // Focus the 'Journey settings' button and press Enter
  await page.getByRole('button', { name: 'Journey settings' }).focus();
  await page.keyboard.press('Enter');

  // Expect #settings-dialog to be visible
  await expect(page.locator('#settings-dialog')).toBeVisible();
});
