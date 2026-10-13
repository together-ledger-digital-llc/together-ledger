// The language choice on the welcome page, and languages in preview (102A, docs/TRANSLATION.md).
//
// The choice is always there, English alone included, and lists every language in the manifest
// (owner, Oct 12, 2026, decision 160). A preview is offered by hand only, with the word Preview
// beside its name; a browser set to it stays in English until the language is approved (decision
// 145). A draft or a language in review says Coming soon and can't be chosen. Statuses are set
// here by answering locales/languages.json, as the manifest would hold them.

import { readFileSync } from 'node:fs';
import { test, expect } from './browser-test.js';

const manifest = JSON.parse(readFileSync(new URL('../locales/languages.json', import.meta.url), 'utf8'));
const english = JSON.parse(readFileSync(new URL('../locales/en.json', import.meta.url), 'utf8'));

// Test sentences only: just enough of each language to see the page switch to it.
const FILES = {
  hi: { '@@locale': 'hi', 'common.welcome.eyebrow': 'देखभाल से रखी साझा यात्रा', 'common.language.title': 'भाषा' },
  bn: { '@@locale': 'bn', 'common.welcome.eyebrow': 'যত্নে রাখা একসাথে পথচলা' },
  'es-419': { '@@locale': 'es-419', 'common.welcome.eyebrow': 'Un viaje compartido, cuidado' },
  'hi-Latn': { '@@locale': 'hi-Latn', 'common.welcome.eyebrow': 'Ek saath ka safar, pyaar se sambhala' },
};

const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

async function withStatuses(page, statuses) {
  // A language not named here is a draft, whatever the shipped manifest says today: these tests are
  // about what each status does, not about which languages have been approved so far.
  const languages = manifest.languages.map((language) => {
    if (language.tag === manifest.source) return language;
    const status = statuses[language.tag] || 'draft';
    return { ...language, status, reviewer: null, approvedOn: null, ...(status === 'approved' ? { reviewer: 'A fluent reviewer', approvedOn: '2026-10-12' } : {}) };
  });
  await page.route('**/locales/languages.json', (route) => json(route, { ...manifest, languages }));
  const fetched = [];
  for (const tag of Object.keys(FILES)) {
    await page.route(`**/locales/${tag}.json`, (route) => { fetched.push(tag); return json(route, FILES[tag]); });
  }
  return fetched;
}

async function browserLanguages(page, languages) {
  await page.addInitScript((list) => {
    Object.defineProperty(navigator, 'languages', { get: () => list });
    Object.defineProperty(navigator, 'language', { get: () => list[0] });
  }, languages);
}

// Begins a ledger and closes the moment form it opens. The form opens on the next animation frame,
// so Escape waits for it, as tests/browser-language.spec.js does.
async function beginLedger(page) {
  await page.locator('[data-begin-ledger]').filter({ visible: true }).first().click();
  await expect(page.locator('#moment-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#moment-dialog')).toBeHidden();
}

const optionsOf = (select) => select.locator('option').evaluateAll((elements) => elements.map((option) => ({ value: option.value, text: option.textContent, lang: option.getAttribute('lang'), disabled: option.disabled })));

test('with English the only language that may be chosen, the choice is still there, and every other language is coming soon', async ({ page }) => {
  const fetched = await withStatuses(page, {});
  await page.goto('/');
  await expect(page.locator('#welcome-title')).toBeVisible();
  const select = page.locator('#welcome-language').getByRole('combobox', { name: english['common.language.title'] });
  await expect(select).toBeVisible();
  // Each name is isolated (U+2068 … U+2069), as every inserted value is, so it lays out on its own.
  expect(await optionsOf(select)).toEqual([
    { value: '', text: english['common.language.followDevice'], lang: null, disabled: false },
    { value: 'en', text: 'English', lang: 'en', disabled: false },
    { value: 'hi', text: '\u2068हिन्दी\u2069 · Coming soon', lang: 'hi', disabled: true },
    { value: 'bn', text: '\u2068বাংলা\u2069 · Coming soon', lang: 'bn', disabled: true },
    { value: 'es-419', text: '\u2068Español (Latinoamérica)\u2069 · Coming soon', lang: 'es-419', disabled: true },
    { value: 'hi-Latn', text: '\u2068Hinglish (Hindi in Latin script)\u2069 · Coming soon', lang: 'hi-Latn', disabled: true },
  ]);
  await expect(select).toHaveValue('');

  // Settings' Language row is there too, and lists exactly the same.
  await beginLedger(page);
  await page.getByRole('button', { name: 'Journey settings' }).click();
  await expect(page.locator('#language-settings')).toBeVisible();
  expect(await optionsOf(page.locator('#language-select'))).toEqual(await optionsOf(page.locator('#welcome-language-select')));
  expect(fetched, 'a language coming soon is never fetched').toEqual([]);
});

test('a language coming soon can\'t be chosen, from the welcome or from Settings', async ({ page }) => {
  const fetched = await withStatuses(page, { hi: 'draft', bn: 'in-review' });
  let sent = 0;
  page.on('request', (request) => { if (request.url().includes('/account/language')) sent += 1; });
  await page.goto('/');
  // By keyboard, the arrows move only between the choices that may be made (on a Mac they open
  // the menu instead, which changes nothing until a choice is made).
  const welcome = page.locator('#welcome-language-select');
  await welcome.focus();
  for (let step = 0; step < 6; step += 1) {
    await page.keyboard.press('ArrowDown');
    expect(['', 'en']).toContain(await welcome.inputValue());
  }
  await page.keyboard.press('Escape');
  await welcome.selectOption('');
  // Set by a script anyway, it changes nothing: the page stays as it was and the menu goes back.
  await welcome.selectOption('hi', { force: true });
  await expect(welcome).toHaveValue('');
  await beginLedger(page);
  await page.getByRole('button', { name: 'Journey settings' }).click();
  await page.locator('#language-select').selectOption('bn', { force: true });
  await expect(page.locator('#language-select')).toHaveValue('');
  expect(fetched, 'never fetched').toEqual([]);
  expect(sent, 'never sent').toBe(0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(await page.evaluate(() => localStorage.getItem('language'))).toBeNull();
});

test('the welcome page offers approved languages plainly, previews marked Preview, and drafts and languages in review as coming soon', async ({ page }) => {
  await withStatuses(page, { hi: 'preview', bn: 'in-review', 'es-419': 'approved', 'hi-Latn': 'draft' });
  await page.goto('/');
  const choice = page.locator('#welcome-language');
  await expect(choice).toBeVisible();
  // It is the first thing on the page that can be changed, before the welcome's own heading.
  const first = await page.evaluate(() => [...document.querySelectorAll('main select, main button, main a')].find((element) => element.offsetParent)?.id);
  expect(first).toBe('welcome-language-select');
  const select = choice.getByRole('combobox', { name: english['common.language.title'] });
  expect(await optionsOf(select)).toEqual([
    { value: '', text: english['common.language.followDevice'], lang: null, disabled: false },
    { value: 'en', text: 'English', lang: 'en', disabled: false },
    { value: 'hi', text: '\u2068हिन्दी\u2069 · Preview', lang: 'hi', disabled: false },
    { value: 'bn', text: '\u2068বাংলা\u2069 · Coming soon', lang: 'bn', disabled: true },
    { value: 'es-419', text: 'Español (Latinoamérica)', lang: 'es-419', disabled: false },
    { value: 'hi-Latn', text: '\u2068Hinglish (Hindi in Latin script)\u2069 · Coming soon', lang: 'hi-Latn', disabled: true },
  ]);
  await expect(select).toHaveValue('');

  // Settings' Language row lists exactly the same.
  await beginLedger(page);
  await page.getByRole('button', { name: 'Journey settings' }).click();
  expect(await optionsOf(page.locator('#language-select'))).toEqual(await optionsOf(page.locator('#welcome-language-select')));
});

test('a browser set to a preview language stays in English, and does not even fetch it', async ({ page }) => {
  const fetched = await withStatuses(page, { hi: 'preview' });
  await browserLanguages(page, ['hi-IN', 'hi']);
  await page.goto('/');
  await expect(page.locator('#welcome-language')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.welcome-hero .welcome-eyebrow')).toHaveText(english['common.welcome.eyebrow']);
  expect(fetched).toEqual([]);
});

test('a browser set to a preview goes on to the next approved language in its list', async ({ page }) => {
  await withStatuses(page, { hi: 'preview', bn: 'approved' });
  await browserLanguages(page, ['hi-IN', 'bn-BD']);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
});

test('a preview chosen by hand on the welcome page switches the page, is kept, and Settings shows the same choice', async ({ page }) => {
  await withStatuses(page, { hi: 'preview' });
  await page.goto('/');
  await page.locator('#welcome-language-select').selectOption('hi');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  await expect(page.locator('.welcome-hero .welcome-eyebrow')).toHaveText(FILES.hi['common.welcome.eyebrow']);
  // A sentence the preview lacks reads in English.
  await expect(page.locator('#welcome-title')).toHaveText(english['common.welcome.headline'].replace('{together}', english['common.welcome.headlineTogether']));
  expect(await page.evaluate(() => localStorage.getItem('language'))).toBe('hi');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  await expect(page.locator('#welcome-language-select')).toHaveValue('hi');
  await beginLedger(page);
  await page.getByRole('button', { name: 'Journey settings' }).click();
  await expect(page.locator('#language-select')).toHaveValue('hi');

  // Back to following the browser, which is English here.
  await page.locator('#language-select').selectOption('');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('once the language is approved, the same browser reads in it without choosing, and Preview is gone', async ({ page }) => {
  await withStatuses(page, { hi: 'approved' });
  await browserLanguages(page, ['hi-IN']);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  expect((await optionsOf(page.locator('#welcome-language-select'))).map((option) => option.text)).toEqual([english['common.language.followDevice'], 'English', 'हिन्दी', '\u2068বাংলা\u2069 · Coming soon', '\u2068Español (Latinoamérica)\u2069 · Coming soon', '\u2068Hinglish (Hindi in Latin script)\u2069 · Coming soon']);
});

test('a choice kept for a language no longer in preview or approved is dropped, and the page follows the browser', async ({ page }) => {
  await withStatuses(page, { hi: 'in-review' });
  await page.addInitScript(() => localStorage.setItem('language', 'hi'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#welcome-language-select')).toHaveValue('');
  expect((await optionsOf(page.locator('#welcome-language-select'))).find((option) => option.value === 'hi')).toMatchObject({ disabled: true, text: '\u2068हिन्दी\u2069 · Coming soon' });
});

// #420: the × that closes Settings keeps its full 44px, at every width and in the test language.
for (const [label, width, query] of [['320px, English', 320, ''], ['320px, the pseudo-language', 320, '?pseudo'], ['desktop, the pseudo-language', 1280, '?pseudo'], ['desktop, English', 1280, '']]) {
  test(`at ${label}, the × that closes Settings is 44px wide and 44px high`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/${query}`);
    await beginLedger(page);
    await page.locator('#settings-button').click();
    const close = page.locator('#settings-dialog [data-close-settings]');
    await expect(close).toBeVisible();
    const box = await close.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });
}
