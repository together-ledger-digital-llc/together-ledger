import { test, expect } from './browser-test.js';

test('tie field hints to fields using aria-describedby', async ({ page }) => {
  await page.goto('/');

  // Moment Detail Hint
  const momentDetailTextarea = page.locator('#moment-form textarea[name="detail"]');
  const momentDetailHintId = await momentDetailTextarea.getAttribute('aria-describedby');
  expect(momentDetailHintId).toBe('moment-detail-hint');
  await expect(page.locator(`#${momentDetailHintId}`)).toBeAttached();

  // Moment Money Hint
  const momentMoneyInput = page.locator('#moment-form input[name="money"]');
  const momentMoneyHintId = await momentMoneyInput.getAttribute('aria-describedby');
  expect(momentMoneyHintId).toBe('moment-money-hint');
  await expect(page.locator(`#${momentMoneyHintId}`)).toBeAttached();

  const momentMoneySelect = page.locator('#moment-form select[name="moneyCurrency"]');
  const momentMoneySelectHintId = await momentMoneySelect.getAttribute('aria-describedby');
  expect(momentMoneySelectHintId).toBe('moment-money-hint');

  // Journey Location Hint
  const journeyLocationInput = page.locator('#journey-form input[name="location"]');
  const journeyLocationHintId = await journeyLocationInput.getAttribute('aria-describedby');
  expect(journeyLocationHintId).toBe('journey-location-hint');
  await expect(page.locator(`#${journeyLocationHintId}`)).toBeAttached();

  // Concern Detail Hint
  const concernDetailTextarea = page.locator('#concern-form textarea[name="detail"]');
  const concernDetailHintId = await concernDetailTextarea.getAttribute('aria-describedby');
  expect(concernDetailHintId).toBe('concern-detail-hint');
  await expect(page.locator(`#${concernDetailHintId}`)).toBeAttached();
});
