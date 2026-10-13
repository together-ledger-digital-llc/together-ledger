// The Language preference on the web (101B, docs/TRANSLATION.md "Choosing the language").
//
// The service is faked at its production address; tests/account-language.test.js proves the
// route. A language is approved here by answering locales/languages.json with that language's
// status set, as a reviewer's sign-off would leave it, and its file with a few sentences.

import { readFileSync } from 'node:fs';
import { test, expect } from './browser-test.js';

const API = 'https://api.together-ledger.com/api/v1';
const USER = { id: 'user-asha', username: 'asha', displayName: 'Asha Rao', email: 'asha@example.test', emailVerified: true, hasPassword: true, language: null };
const manifest = JSON.parse(readFileSync(new URL('../locales/languages.json', import.meta.url), 'utf8'));
const english = JSON.parse(readFileSync(new URL('../locales/en.json', import.meta.url), 'utf8'));

// Test sentences only: just enough of each language to see the page switch to it.
const FILES = {
  hi: { '@@locale': 'hi', 'common.language.title': 'भाषा', 'common.appearance.title': 'रूप' },
  bn: { '@@locale': 'bn', 'common.language.title': 'ভাষা' },
  'hi-Latn': { '@@locale': 'hi-Latn', 'common.language.title': 'Bhasha' },
  'es-419': { '@@locale': 'es-419', 'common.language.title': 'Idioma' },
};

const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function approve(page, ...tags) {
  // Every translation not named is a draft, whatever the shipped manifest says today.
  const approved = {
    ...manifest,
    languages: manifest.languages.map((language) => {
      if (language.tag === manifest.source) return language;
      return tags.includes(language.tag)
        ? { ...language, status: 'approved', reviewer: 'A fluent reviewer', approvedOn: '2026-10-12' }
        : { ...language, status: 'draft', reviewer: null, approvedOn: null };
    }),
  };
  await page.route('**/locales/languages.json', (route) => json(route, approved));
  for (const tag of tags) await page.route(`**/locales/${tag}.json`, (route) => json(route, FILES[tag]));
}

// The browser's own list of languages, in its order.
async function browserLanguages(page, languages) {
  await page.addInitScript((list) => {
    Object.defineProperty(navigator, 'languages', { get: () => list });
    Object.defineProperty(navigator, 'language', { get: () => list[0] });
  }, languages);
}

// A fake account service that keeps the account's language, as the server does.
async function fakeAccount(page, { language = null } = {}) {
  const account = { ...USER, language };
  const sent = [];
  await page.route(`${API}/session`, (route) => json(route, { data: { user: { ...account }, csrfToken: 'csrf-1' } }));
  await page.route(`${API}/journeys`, (route) => json(route, { data: { journeys: [] } }));
  await page.route(`${API}/account/language`, (route) => {
    const body = route.request().postDataJSON();
    sent.push({ method: route.request().method(), csrf: route.request().headers()['x-together-csrf'], body });
    if (!(body.unlessChosen && account.language)) account.language = body.language;
    return json(route, { data: { user: { ...account } } });
  });
  return { account, sent };
}

// Settings, from the welcome page or, once the ledger has been begun, from the ledger.
async function openSettings(page) {
  await expect(page.locator('body')).toHaveAttribute('data-surface', /^(welcome|ledger)$/);
  if (await page.locator('body').getAttribute('data-surface') === 'welcome') {
    await page.getByRole('button', { name: /Begin your ledger/ }).first().click();
    await expect(page.locator('#moment-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await page.getByRole('button', { name: 'Journey settings' }).click();
  await expect(page.locator('#settings-dialog')).toBeVisible();
}

test('while English is the only approved language, the Language row offers nothing else yet and the page is English, whatever the browser speaks', async ({ page }) => {
  await approve(page);
  await browserLanguages(page, ['hi-IN', 'bn-BD', 'es-MX']);
  const asked = [];
  page.on('request', (request) => { if (/\/locales\/(?!en\.json|languages\.json)/.test(request.url())) asked.push(request.url()); });
  await page.goto('/');
  await openSettings(page);
  // Always there (decision 160): every other language is listed as coming soon, and can't be chosen.
  await expect(page.locator('#language-settings')).toBeVisible();
  const choosable = await page.locator('#language-select option:not(:disabled)').evaluateAll((options) => options.map((option) => option.value));
  expect(choosable).toEqual(['', 'en']);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(await page.locator('body').getAttribute('lang')).toBeNull();
  expect(asked, 'no draft is ever fetched').toEqual([]);
});

test('a language appears once it is approved, in its own name and script, after "Follow my device"', async ({ page }) => {
  await approve(page, 'hi', 'bn', 'hi-Latn');
  await page.goto('/');
  await openSettings(page);
  const row = page.locator('#language-settings');
  await expect(row).toBeVisible();
  await expect(row.getByRole('heading', { name: english['common.language.title'] })).toBeVisible();
  const select = row.getByRole('combobox', { name: english['common.language.title'] });
  await expect(select).toHaveAccessibleDescription(english['common.language.note']);
  const options = await select.locator('option').evaluateAll((elements) => elements.map((option) => ({ value: option.value, text: option.textContent, lang: option.getAttribute('lang') })));
  expect(options).toEqual([
    { value: '', text: 'Follow my device', lang: null },
    { value: 'en', text: 'English', lang: 'en' },
    { value: 'hi', text: 'हिन्दी', lang: 'hi' },
    { value: 'bn', text: 'বাংলা', lang: 'bn' },
    { value: 'es-419', text: '\u2068Español (Latinoamérica)\u2069 · Coming soon', lang: 'es-419' },
    { value: 'hi-Latn', text: 'Hinglish (Hindi in Latin script)', lang: 'hi-Latn' },
  ]);
  await expect(select).toHaveValue('', { message: 'nobody has chosen, so the page follows the browser' });
});

test('before signing in, a choice is kept in this browser, switches the page and its lang, and survives a reload', async ({ page }) => {
  await approve(page, 'hi');
  await page.goto('/');
  await openSettings(page);
  await page.locator('#language-select').selectOption('hi');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  await expect(page.locator('#language-title')).toHaveText('भाषा');
  await expect(page.locator('#settings-dialog h3', { hasText: 'रूप' })).toBeVisible();
  // A sentence Hindi lacks still reads in English.
  await expect(page.locator('#theme-copy')).toHaveText(english['common.theme.note']);
  expect(await page.evaluate(() => localStorage.getItem('language'))).toBe('hi');
  expect(await page.evaluate(async () => (await import('/src/i18n/web.js')).t.locale), 'and every sentence the page writes follows it').toBe('hi');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  await openSettings(page);
  await expect(page.locator('#language-select')).toHaveValue('hi');

  // Back to following the browser, which is English here.
  await page.locator('#language-select').selectOption('');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#language-title')).toHaveText('Language');
  expect(await page.evaluate(() => localStorage.getItem('language'))).toBeNull();
});

test('signed in, choosing a language saves it to the account, and a reload reads it back from the account', async ({ page }) => {
  await approve(page, 'hi');
  const { account, sent } = await fakeAccount(page);
  await page.goto('/');
  await expect(page.locator('#account-button')).toHaveText('Account settings');
  await openSettings(page);
  await page.locator('#language-select').selectOption('hi');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  expect(sent).toEqual([{ method: 'PATCH', csrf: 'csrf-1', body: { language: 'hi' } }]);
  expect(account.language).toBe('hi');

  // A new browser, with nothing kept: the account says Hindi, so the page reads in Hindi.
  await page.evaluate(() => localStorage.removeItem('language'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  await openSettings(page);
  await expect(page.locator('#language-select')).toHaveValue('hi');
  expect(sent).toHaveLength(1);

  // "Follow my device" is saved as no choice, not as English.
  await page.locator('#language-select').selectOption('');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(sent.at(-1).body).toEqual({ language: null });
  expect(account.language).toBeNull();
});

test('a choice made before signing in carries into an account that has none', async ({ page }) => {
  await approve(page, 'hi');
  await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('language', 'hi'); sessionStorage.setItem('seeded', '1'); } });
  const { account, sent } = await fakeAccount(page, { language: null });
  await page.goto('/');
  await expect(page.locator('#account-button')).toHaveText('Account settings');
  await expect.poll(() => sent).toEqual([{ method: 'PATCH', csrf: 'csrf-1', body: { language: 'hi', unlessChosen: true } }]);
  expect(account.language).toBe('hi');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
});

test('an account\'s own choice wins over one made in this browser before signing in', async ({ page }) => {
  await approve(page, 'hi', 'bn');
  await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('language', 'hi'); sessionStorage.setItem('seeded', '1'); } });
  const { sent } = await fakeAccount(page, { language: 'bn' });
  await page.goto('/');
  await expect(page.locator('#account-button')).toHaveText('Account settings');
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  expect(sent, 'nothing is sent: the account already has a choice').toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('language'))).toBe('bn');
});

test('following the browser walks its whole list of languages and takes the first approved match', async ({ page }) => {
  await approve(page, 'bn');
  await browserLanguages(page, ['fr-FR', 'de-DE', 'bn-IN', 'en-US']);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await openSettings(page);
  await expect(page.locator('#language-title')).toHaveText('ভাষা');
  await expect(page.locator('#language-select')).toHaveValue('');
});

test('every Spanish browser reads Latin American Spanish, once it is approved', async ({ page }) => {
  await approve(page, 'es-419');
  await browserLanguages(page, ['es-ES']);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-419');
});

test('Hinglish is declared as hi-Latn, with no separate speech language (HINGLISH_STYLE §8.6)', async ({ page }) => {
  await approve(page, 'hi', 'hi-Latn');
  await browserLanguages(page, ['hi-Latn-IN', 'hi-IN']);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi-Latn');
  expect(await page.locator('body').getAttribute('lang')).toBeNull();
});

test('a language file that can\'t be read leaves the page in English, never blank', async ({ page }) => {
  await approve(page, 'hi');
  await page.route('**/locales/hi.json', (route) => route.fulfill({ status: 404, body: '' }));
  await browserLanguages(page, ['hi-IN']);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await openSettings(page);
  await expect(page.locator('#language-title')).toHaveText('Language');
});
