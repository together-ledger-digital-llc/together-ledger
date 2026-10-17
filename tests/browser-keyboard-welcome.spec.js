import { test, expect } from './browser-test.js';
import { keyboardWalk } from './fixtures/keyboard-walk.js';

test('Walk the welcome page by keyboard alone', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#welcome-title');

  const stops = await keyboardWalk(page);

  // Expect at least one stop
  expect(stops.length).toBeGreaterThan(0);

  // Expect every stop to be visible and to show a ring
  for (const stop of stops) {
    expect(stop.visible).toBe(true);
    expect(stop.ring).toBe(true);
  }

  // Expect the [data-begin-ledger] button to be among the stops
  // We identify it by its name
  const beginLedgerName = await page.locator('[data-begin-ledger]').first().evaluate(el => el.getAttribute('aria-label') || (el.textContent || '').trim());
  const beginLedgerTag = await page.locator('[data-begin-ledger]').first().evaluate(el => el.tagName.toLowerCase());

  expect(stops).toContainEqual(expect.objectContaining({
    tag: beginLedgerTag,
    name: beginLedgerName
  }));

  // Focus that button and press Enter
  await page.locator('[data-begin-ledger]').first().focus();
  await page.keyboard.press('Enter');

  // Expect #ledger-app to be visible
  await expect(page.locator('#ledger-app')).toBeVisible();
});
