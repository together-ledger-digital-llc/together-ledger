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

// 103A: the language choice on the welcome and in Settings, with languages in preview
// (decision 145), and type that follows the language without the app starting again.

const manifest = JSON.parse(await readFile(new URL('../locales/languages.json', import.meta.url), 'utf8'));
const { choosableLanguages } = await import('../src/i18n/catalog.js');
const screens = await importMobile('src/shell/screens.ts');
const withStatus = (statuses) => ({ ...manifest, languages: manifest.languages.map((language) => (statuses[language.tag] ? { ...language, status: statuses[language.tag] } : language)) });

test('the choice lists "Follow my device", then each language in its own name and script; Preview only beside one in preview', () => {
  const offered = choosableLanguages(withStatus({ hi: 'preview', bn: 'approved', 'es-419': 'in-review', 'hi-Latn': 'preview' }));
  assert.deepEqual(screens.languageOptions(offered), [
    { choice: null, label: 'Follow my device', preview: false },
    { choice: 'en', label: 'English', lang: 'en', preview: false },
    { choice: 'hi', label: 'हिन्दी', lang: 'hi', preview: true },
    { choice: 'bn', label: 'বাংলা', lang: 'bn', preview: false },
    { choice: 'hi-Latn', label: 'Hinglish (Hindi in Latin script)', lang: 'hi-Latn', preview: true },
  ], 'a draft or one in review is never shown; each is named in its own script, never translated');
});

test('the choice appears only once there is more than English: today nothing changes for anyone', async () => {
  assert.equal(screens.languageChoiceShown(choosableLanguages(manifest)), false, 'English only, as the manifest stands');
  assert.equal(screens.languageChoiceShown(choosableLanguages(withStatus({ hi: 'preview' }))), true, 'one language in preview is enough');
  assert.equal(screens.languageChoiceShown(choosableLanguages(withStatus({ bn: 'draft', hi: 'in-review' }))), false);
  const welcome = await read('app/index.tsx');
  assert.match(welcome, /\{languageChoiceShown\(offered\) \? <LanguageControl \/> : null\}/);
  assert.ok(welcome.indexOf('<LanguageControl />') < welcome.indexOf("t('common.welcome.eyebrow')"), 'small, at the top of the welcome, before anything to read');
  const settings = await read('app/settings.tsx');
  assert.match(settings, /languages: languageChoiceShown\(offered\)/);
  assert.match(settings, /<SettingsHeading>\{t\('common\.language\.title'\)\}<\/SettingsHeading>\s*<LanguageList \/>\s*<Body>\{t\('common\.language\.note'\)\}<\/Body>/, 'a Language section, under its own word, with the web\'s note');
});

test('each language is read in its own language, a preview is said as one, and choosing saves through the provider', async () => {
  const choice = await read('src/components/language-choice.tsx');
  assert.match(choice, /accessibilityLanguage=\{option\.lang\}/, 'a screen reader says हिन्दी in Hindi');
  assert.match(choice, /accessibilityLabel=\{option\.preview \? t\('common\.language\.previewSpoken', \{ language: option\.label \}\) : option\.label\}/);
  assert.match(choice, /\{option\.preview \? \(\s*<Text[^>]*>\{preview\}<\/Text>\s*\) : null\}/, 'the word Preview is drawn only beside a language in preview');
  assert.match(choice, /accessibilityRole="radio"\s+accessibilityState=\{\{ checked: chosen \}\}/);
  assert.match(choice, /targetSize/, 'every choice is a 44-point target');
  assert.match(choice, /choose\(next\)\.catch\(\(error: unknown\) => showStatus\(accountMessage\(error\)\)\)/, 'an account that can\'t be reached says so, and nothing changes');
  const english = JSON.parse(await readFile(new URL('../locales/en.json', import.meta.url), 'utf8'));
  assert.equal(english['common.language.preview'], 'Preview');
});

test('a phone set to a language in preview is never switched to it; choosing it by hand is (decision 145)', async () => {
  const i18n = await read('src/i18n/index.ts');
  assert.match(i18n, /resolveLanguage\(\{ choice, deviceLanguages: devices, offered: offeredTags, choosable: choosableTags, source: manifest\.source \}\)/);
  assert.match(i18n, /export const readLanguageChoice = \(value: unknown\): string \| null => readChoice\(value, choosableTags\);/, 'a saved preview choice is read back');
});

test('a change of language loads its script\'s serif first, then changes the words and the type together', async () => {
  const provider = await read('src/i18n/language-provider.tsx');
  assert.match(provider, /loadScriptFonts\(scriptOf\(wanted\)\)\.catch\(\(\) => \{\}\)\.then\(\(\) => \{ if \(live\) setActive\(wanted\); \}\);/);
  assert.match(provider, /setActiveLanguage\(active\);\s*setActiveScript\(scriptOf\(active\)\);/, 'set as the provider draws, before any screen does');
  for (const screen of ['app/index.tsx', 'app/settings.tsx', 'app/account.tsx', 'app/register.tsx', 'app/ledger.tsx', 'app/moment.tsx', 'app/history.tsx']) {
    assert.match(await read(screen), /useLanguage\(\)/, `${screen} redraws when the language changes`);
  }
  assert.match(await read('app/_layout.tsx'), /function ThemedStack\(\) \{[\s\S]*?useLanguage\(\);/, 'and so do every title and back button');
});

// fonts.ts as the app runs it, with the font files, expo-font and the opening language stood in for.
async function fontsWith({ opening = 'en', loaded = new Set() } = {}) {
  const asModule = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  const url = new URL('src/theme/fonts.ts', mobile);
  let source = ts.transpileModule(await readFile(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const [, name, from] of source.matchAll(/import \{ (\w+) \} from '(@expo-google-fonts\/[^']+)';/g)) source = source.replace(`from '${from}'`, `from '${asModule(`export const ${name} = '${name}.ttf';`)}'`);
  globalThis.fontStub = { loaded, asked: [] };
  source = source
    .replace("from 'expo-font'", `from '${asModule('export const isLoaded = (name) => globalThis.fontStub.loaded.has(name); export async function loadAsync(map) { globalThis.fontStub.asked.push(...Object.keys(map)); for (const name of Object.keys(map)) globalThis.fontStub.loaded.add(name); }')}'`)
    .replace("from '../i18n'", `from '${asModule(`export const language = ${JSON.stringify(opening)};`)}'`)
    .replace("from './scripts'", `from '${asModule(ts.transpileModule(await readFile(new URL('src/theme/scripts.ts', mobile), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText)}'`);
  return import(`${asModule(source)}#${Math.random()}`);
}

test('the type follows the active script: Tiro and its spacing only once its file is in memory', async () => {
  const fonts = await fontsWith();
  assert.deepEqual(Object.keys(fonts.fontSources), ['Gelasio_400Regular', 'Gelasio_400Regular_Italic', 'Gelasio_700Bold'], 'English opens with Gelasio alone');
  const styles = fonts.scriptStyles(() => ({ headline: { fontSize: 40, lineHeight: fonts.leading(40, 44), letterSpacing: fonts.tracking(1.9) } }));
  assert.deepEqual(styles.headline, { fontSize: 40, lineHeight: 44, letterSpacing: 1.9 });
  assert.equal(fonts.fonts.serif.fontFamily, 'Gelasio_400Regular');

  fonts.setActiveScript('Deva');
  assert.equal(fonts.activeScript(), 'Latn', 'Devanagari is never set without its serif');
  assert.equal(fonts.fonts.serif.fontFamily, 'Gelasio_400Regular');

  await fonts.loadScriptFonts('Deva');
  assert.deepEqual(globalThis.fontStub.asked, ['TiroDevanagariHindi_400Regular'], 'only the script\'s own file is read');
  fonts.setActiveScript('Deva');
  assert.equal(fonts.activeScript(), 'Deva');
  assert.equal(fonts.fonts.serif.fontFamily, 'TiroDevanagariHindi_400Regular');
  assert.equal(fonts.fonts.serifItalic.fontFamily, 'TiroDevanagariHindi_400Regular', 'no italic in Devanagari');
  assert.equal(fonts.fonts.serifBold.fontFamily, 'Gelasio_700Bold', 'the brand stays Latin');
  assert.deepEqual(styles.headline, { fontSize: 40, lineHeight: 54, letterSpacing: 0 }, 'the same style, redrawn with room for the marks and no tracking');

  fonts.setActiveScript('Latn');
  assert.deepEqual(styles.headline, { fontSize: 40, lineHeight: 44, letterSpacing: 1.9 }, 'and back again, made once per script');
  await fonts.loadScriptFonts('Latn');
  assert.deepEqual(globalThis.fontStub.asked, ['TiroDevanagariHindi_400Regular'], 'Latin has nothing more to load');
});

test('a phone that opens in Bengali loads Tiro Bangla before its first screen', async () => {
  const fonts = await fontsWith({ opening: 'bn', loaded: new Set(['TiroBangla_400Regular']) });
  assert.deepEqual(Object.keys(fonts.fontSources), ['Gelasio_400Regular', 'Gelasio_400Regular_Italic', 'Gelasio_700Bold', 'TiroBangla_400Regular']);
  assert.equal(fonts.activeScript(), 'Beng');
  assert.equal(fonts.fonts.serif.fontFamily, 'TiroBangla_400Regular');
  assert.equal(fonts.leading(40, 44), 52);
});
