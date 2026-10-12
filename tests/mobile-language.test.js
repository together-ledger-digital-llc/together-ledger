// The Language preference on the phone (101B). The phone's Language row comes in 103; this is what
// it will stand on: the choice kept on the phone before signing in, carried into the account at
// sign-in unless the account has its own, the phone's whole list of languages, and the language
// VoiceOver is asked to speak. The matching rules themselves are in tests/i18n-language-choice.test.js.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const mobile = new URL('../apps/mobile/', import.meta.url);
const read = (path) => readFile(new URL(path, mobile), 'utf8');

async function importMobile(path) {
  const url = new URL(path, mobile);
  const source = await readFile(url, 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  const linked = outputText.replace(/from '(\.[^']+\.js)'/g, (_, specifier) => `from '${new URL(specifier, url).href}'`);
  return import(`data:text/javascript;base64,${Buffer.from(linked).toString('base64')}`);
}

const { createPhoneStore, LANGUAGE_KEY, THEME_KEY } = await importMobile('src/storage/ledger-store.ts');
const { createAccountClient } = await importMobile('src/api/client.ts');

function phoneStorage(seed = {}, { failReads = false } = {}) {
  const values = new Map(Object.entries(seed));
  return {
    values,
    getItem: async (key) => { if (failReads) throw new Error('blocked'); return values.get(key) ?? null; },
    setItem: async (key, value) => { values.set(key, String(value)); },
    removeItem: async (key) => { values.delete(key); },
  };
}

test('before signing in, a choice is kept on this phone under the web\'s own key, and nothing saved is "Follow my device"', async () => {
  assert.equal(LANGUAGE_KEY, 'language', 'the key src/i18n/web.js keeps it under, as the theme shares THEME_KEY');
  assert.notEqual(LANGUAGE_KEY, THEME_KEY);
  const phone = phoneStorage();
  assert.equal(await createPhoneStore(phone).loadLanguage(), null, 'nothing chosen');
  await createPhoneStore(phone).saveLanguage('hi');
  assert.equal(phone.values.get(LANGUAGE_KEY), 'hi');
  assert.equal(await createPhoneStore(phone).loadLanguage(), 'hi', 'a fresh launch reads it back');
  await createPhoneStore(phone).saveLanguage(null);
  assert.equal(phone.values.has(LANGUAGE_KEY), false, 'following the phone again keeps nothing');
  assert.equal(await createPhoneStore(phoneStorage({ [LANGUAGE_KEY]: 'hi' }, { failReads: true })).loadLanguage(), null, 'a blocked store follows the phone, and still renders');
});

test('the client saves a choice to the signed-in account, and asks the server to carry one only into an account without its own', async () => {
  const calls = [];
  const tokens = { read: async () => ({ token: 'access-1', tokenExpiresAt: '2026-11-01T00:00:00.000Z', refreshToken: 'r', refreshTokenExpiresAt: '2026-12-01T00:00:00.000Z' }), write: async () => {}, clear: async () => {} };
  const client = createAccountClient({ base: () => '/api/v1', tokens, fetch: async (url, init) => {
    calls.push({ url, method: init.method, auth: init.headers.Authorization, body: JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => ({ data: { user: { id: 'u1', language: 'bn' } } }) };
  } });
  assert.deepEqual(await client.setLanguage('hi'), { id: 'u1', language: 'bn' }, 'the account as it now stands');
  await client.setLanguage(null);
  await client.setLanguage('hi', { unlessChosen: true });
  assert.deepEqual(calls, [
    { url: '/api/v1/account/language', method: 'PATCH', auth: 'Bearer access-1', body: { language: 'hi' } },
    { url: '/api/v1/account/language', method: 'PATCH', auth: 'Bearer access-1', body: { language: null } },
    { url: '/api/v1/account/language', method: 'PATCH', auth: 'Bearer access-1', body: { language: 'hi', unlessChosen: true } },
  ]);
});

test('the saved choice is read with the theme before the first screen, and the provider carries it at sign-in', async () => {
  const layout = await read('app/_layout.tsx');
  assert.match(layout, /<LanguageProvider initialChoice=\{stored\.language\} onChoiceChange=\{saveLanguage\}>/);
  assert.ok(layout.indexOf('<SessionProvider>') < layout.indexOf('<LanguageProvider'), 'inside the session, which it reads');
  assert.ok(layout.indexOf('<LanguageProvider') < layout.indexOf('<ThemedStack />'), 'around every screen');

  const provider = await read('src/i18n/language-provider.tsx');
  assert.match(provider, /client\.setLanguage\(choice, \{ unlessChosen: true \}\)/, 'a carry never overwrites the account\'s own choice');
  assert.match(provider, /if \(!signedInAs \|\| accountLanguage !== null \|\| !choice\) return;/, 'only into an account with no choice, and only a choice made');
  assert.match(provider, /if \(signedInAs && accountChoice && accountChoice !== choice\) setChoice\(accountChoice\);/, 'signed in, the account\'s choice wins');
  assert.match(provider, /setActiveLanguage\(active\);/);
});

test('the phone walks its whole list of languages, and offers only what is approved and carried', async () => {
  const i18n = await read('src/i18n/index.ts');
  assert.match(i18n, /import \{ getLocales \} from 'expo-localization';/);
  assert.match(i18n, /getLocales\(\)\.map\(\(locale\) => locale\.languageTag\)/, 'every language, in the phone\'s order');
  assert.match(i18n, /choosableLanguages\(manifest\)\s*\.filter\(\(language: \{ tag: string \}\) => language\.tag in catalogs\)/, 'chosen by hand: approved, or in preview');
  assert.match(i18n, /const offeredTags = offeredLanguages\(manifest\)\.map\(\(language: \{ tag: string \}\) => language\.tag\)\.filter\(\(tag: string\) => tag in catalogs\);/, 'matched from the phone: approved only (decision 145)');
  assert.match(i18n, /resolveLanguage\(\{ choice, deviceLanguages: devices, offered: offeredTags, choosable: choosableTags, source: manifest\.source \}\)/);
  assert.match(i18n, /from '\.\.\/\.\.\/\.\.\/\.\.\/src\/i18n\/language-choice\.js'/, 'the web\'s own rules, never a second copy');
  const provider = await read('src/i18n/language-provider.tsx');
  assert.match(provider, /const locales = useLocales\(\);/, 'and follows the phone if its languages change while the app is open');
});

test('VoiceOver is asked to speak the active language, and Hinglish asks for no voice of its own', async () => {
  const i18n = await read('src/i18n/index.ts');
  assert.match(i18n, /export const speechLanguageOf = \(tag: string\): string \| undefined => speechLanguage\(tag\) \?\? undefined;/, 'decided once, in src/i18n/language-choice.js');
  const ui = await read('src/components/ui.tsx');
  assert.match(ui, /<SafeAreaView edges=\{edges\} accessibilityLanguage=\{speech\}/, 'every screen built on Screen');
});

test('the app opens in the saved language, read at once, so its first screen and its type are already in it', async () => {
  const storage = await read('src/storage/phone-storage.ts');
  assert.match(storage, /return Storage\.getItemSync\(LANGUAGE_KEY\) \|\| null;/, 'only the phone storage file touches SQLite');
  const i18n = await read('src/i18n/index.ts');
  assert.match(i18n, /setActiveLanguage\(resolveActiveLanguage\(readLanguageChoice\(savedLanguageNow\(\)\)\)\);\s*(?:\/\*\*[\s\S]*?\*\/\s*)?export const language = activeLanguage\(\);/, 'what src/theme/fonts.ts sets type for');
});
