import { test, expect } from './browser-test.js';

test('the Settings and Account dialogs have no sideways scroll at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');

  // wait for the element to be visible
  await page.locator('[data-begin-ledger]:visible').first().click();
  await page.locator('[data-close-moment]').first().click();

  await page.getByRole('button', { name: 'Journey settings' }).click();
  await expect(page.locator('#settings-dialog')).toBeVisible();

  const settingsSize = await page.locator('#settings-dialog').evaluate((dialog) => ({
    clientWidth: dialog.clientWidth,
    scrollWidth: dialog.scrollWidth,
  }));
  expect(settingsSize.scrollWidth, `Settings dialog overflow`).toBeLessThanOrEqual(settingsSize.clientWidth);

  const docSize1 = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(docSize1.scrollWidth, `Page overflow when settings dialog open`).toBeLessThanOrEqual(docSize1.clientWidth);

  await page.keyboard.press('Escape');

  await page.locator('#account-button').click();
  await expect(page.locator('#account-dialog')).toBeVisible();

  const accountSize = await page.locator('#account-dialog').evaluate((dialog) => ({
    clientWidth: dialog.clientWidth,
    scrollWidth: dialog.scrollWidth,
  }));
  expect(accountSize.scrollWidth, `Account dialog overflow`).toBeLessThanOrEqual(accountSize.clientWidth);

  const docSize2 = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(docSize2.scrollWidth, `Page overflow when account dialog open`).toBeLessThanOrEqual(docSize2.clientWidth);

  await page.keyboard.press('Escape');
});

test('the Settings and Account dialogs have no sideways scroll at 200% zoom', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  await page.goto('/');

  // wait for the element to be visible
  await page.locator('[data-begin-ledger]:visible').first().click();
  await page.locator('[data-close-moment]').first().click();

  await page.getByRole('button', { name: 'Journey settings' }).click();
  await expect(page.locator('#settings-dialog')).toBeVisible();

  const settingsSize = await page.locator('#settings-dialog').evaluate((dialog) => ({
    clientWidth: dialog.clientWidth,
    scrollWidth: dialog.scrollWidth,
  }));
  expect(settingsSize.scrollWidth, `Settings dialog overflow`).toBeLessThanOrEqual(settingsSize.clientWidth);

  const docSize1 = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(docSize1.scrollWidth, `Page overflow when settings dialog open`).toBeLessThanOrEqual(docSize1.clientWidth);

  await page.keyboard.press('Escape');

  await page.locator('#account-button').click();
  await expect(page.locator('#account-dialog')).toBeVisible();

  const accountSize = await page.locator('#account-dialog').evaluate((dialog) => ({
    clientWidth: dialog.clientWidth,
    scrollWidth: dialog.scrollWidth,
  }));
  expect(accountSize.scrollWidth, `Account dialog overflow`).toBeLessThanOrEqual(accountSize.clientWidth);

  const docSize2 = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(docSize2.scrollWidth, `Page overflow when account dialog open`).toBeLessThanOrEqual(docSize2.clientWidth);

  await page.keyboard.press('Escape');
});
