import { test, expect } from './browser-test.js';

const LANGUAGES = ['hi', 'bn'];

for (const lang of LANGUAGES) {
  test(lang, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');

    await page.locator('#welcome-language-select').selectOption(lang);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);

    const welcomePageLayout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(welcomePageLayout.scrollWidth, 'no sideways page scroll on the welcome page').toBeLessThanOrEqual(welcomePageLayout.clientWidth);

    await page.locator('[data-begin-ledger]:visible').first().click();
    await page.locator('[data-close-moment]').first().click();

    const ledgerPageLayout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(ledgerPageLayout.scrollWidth, 'no sideways page scroll on the ledger').toBeLessThanOrEqual(ledgerPageLayout.clientWidth);
  });
}
