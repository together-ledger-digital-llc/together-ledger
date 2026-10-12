import { readFileSync } from 'node:fs';
import { test, expect } from './browser-test.js';

// The web's Settings, moved through t() (docs/TRANSLATION.md): it reads word for word as the
// English file says, a person's own text in a sentence is put in a <bdi>, and a missing key falls
// back with a warning in development.

const english = JSON.parse(readFileSync(new URL('../locales/en.json', import.meta.url), 'utf8'));

test('Settings reads word for word from the English file', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Begin your ledger/ }).first().click();
  await expect(page.locator('#moment-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Journey settings' }).click();
  const dialog = page.locator('#settings-dialog');
  await expect(dialog.locator('.dialog-head h2')).toHaveText(english['common.journeySettings.title']);
  await expect(dialog.locator('.dialog-head .eyebrow')).toHaveText(english['common.journeySettings.title']);
  await expect(dialog.locator('#settings-storage-copy')).toHaveText(english['settings.storage.browserOnly']);
  await expect(dialog.getByRole('button', { name: english['settings.dialog.close'] })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: english['common.appearance.title'] })).toBeVisible();
  await expect(dialog.getByRole('combobox', { name: english['settings.theme.menuLabel'] })).toBeVisible();
  await expect(dialog.locator('#theme-copy')).toHaveText(english['common.theme.note']);
  await expect(dialog.getByRole('heading', { name: english['settings.backup.title'] })).toBeVisible();
  await expect(dialog.locator('#backup-privacy-copy')).toHaveText(english['settings.backup.privacy']);
  await expect(dialog.locator('#restore-boundary-copy')).toHaveText(english['settings.backup.restoreBoundary']);
  await expect(dialog.getByRole('button', { name: english['settings.backup.export'] })).toBeVisible();
  await expect(dialog.getByRole('button', { name: english['settings.backup.import'] })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: english['settings.reset.title'] })).toBeVisible();
  await expect(dialog.getByText(english['settings.reset.note'])).toBeVisible();
  await expect(dialog.getByRole('heading', { name: english['settings.privacy.title'] })).toBeVisible();
  await expect(dialog.getByText(english['settings.privacy.note'])).toBeVisible();
  expect(await dialog.locator('[data-i18n]:empty').count(), 'no sentence left blank').toBe(0);

  await dialog.getByRole('button', { name: english['settings.reset.action'] }).click();
  await expect(page.getByRole('heading', { name: english['settings.reset.confirmTitle'] })).toBeVisible();
  await expect(page.getByText(english['settings.reset.confirmConsequence'])).toBeVisible();
  await expect(page.getByRole('button', { name: english['settings.reset.confirmAction'] })).toBeVisible();
});

test('a person\'s own text inside a sentence is put in a <bdi>, and a missing key warns and falls back', async ({ page }) => {
  const warnings = [];
  page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()); });
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { renderSentence, sentenceHtml, t } = await import('/src/i18n/web.js');
    const element = document.createElement('p');
    renderSentence(element, 'history.screen.title', { journey: 'আমাদের যাত্রা' });
    return {
      html: element.innerHTML,
      text: element.textContent,
      markup: sentenceHtml('history.screen.title', { journey: '<Home & Fall>' }),
      missing: t('nowhere.at.all'),
      plain: t('history.screen.title', { journey: 'Home' }),
    };
  });
  expect(result.html).toBe('<bdi>আমাদের যাত্রা</bdi> history');
  expect(result.text).toBe('আমাদের যাত্রা history');
  expect(result.markup).toBe('<bdi>&lt;Home &amp; Fall&gt;</bdi> history');
  expect(result.plain).toBe('⁨Home⁩ history');
  expect(result.missing).toBe('nowhere.at.all');
  expect(warnings.some((text) => text.includes('"nowhere.at.all" is missing in en'))).toBe(true);
});
