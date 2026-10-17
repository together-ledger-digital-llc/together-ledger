import { test, expect } from './browser-test.js';

const SIZES = [
  { width: 320, height: 568 },
  { width: 640, height: 400 },
];

for (const size of SIZES) {
  test(`at { width: ${size.width}, height: ${size.height} } the ledger has no sideways page scroll`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/');

    const beginLedgerPrimary = page.locator('.welcome-nav [data-begin-ledger]');
    if (await beginLedgerPrimary.isVisible()) {
      await beginLedgerPrimary.click();
    } else {
      await page.locator('.welcome-menu > summary').click();
      await page.getByRole('button', { name: /Begin your ledger/ }).first().click();
    }
    await page.locator('[data-close-moment]').first().click();

    await expect(page.locator('#ledger-app:not([hidden]) #trip-name')).toHaveCount(1);

    const pageLayout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(pageLayout.scrollWidth, 'no sideways page scroll').toBeLessThanOrEqual(pageLayout.clientWidth);
  });
}
