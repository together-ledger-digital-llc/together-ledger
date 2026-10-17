import { test, expect } from './browser-test.js';
import { keyboardWalk } from './fixtures/keyboard-walk.js';

test('Walk the moment and Journey settings dialogs by keyboard alone', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#welcome-title');

  await page.locator('[data-begin-ledger]').first().click();
  await page.locator('[data-close-moment]').first().click();

  // Journey settings dialog
  await page.getByRole('button', { name: 'Journey settings' }).click();
  await expect(page.locator('#settings-dialog')).toBeVisible();

  let stops = await keyboardWalk(page);

  expect(stops.length).toBeGreaterThan(0);
  for (const stop of stops) {
    expect(stop.visible).toBe(true);
    expect(stop.ring).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(page.locator('#settings-dialog')).toBeHidden();

  // Moment dialog
  await page.locator('[data-open-moment]:visible').first().click();
  await expect(page.locator('#moment-dialog')).toBeVisible();

  stops = await keyboardWalk(page);

  expect(stops.length).toBeGreaterThan(0);
  for (const stop of stops) {
    expect(stop.visible).toBe(true);
    expect(stop.ring).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(page.locator('#moment-dialog')).toBeHidden();
});
