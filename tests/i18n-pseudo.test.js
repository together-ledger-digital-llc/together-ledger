import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { IntlMessageFormat } from 'intl-messageformat';
import { messagesOf, placeholdersOf, messageProblems } from '../src/i18n/catalog.js';
import { PSEUDO_EXPANSION, PSEUDO_LOCALE, pseudoLocalize, pseudoMessages, pseudoProblems } from '../src/i18n/pseudo.js';
import { createTranslator } from '../src/i18n/translator.js';

// The pseudo-language (docs/TRANSLATION.md): every English sentence longer, accented and in
// brackets, with its placeholders, plurals, selects and tags exactly as they were.

const root = new URL('..', import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), 'utf8');
const source = JSON.parse(read('locales/en.json'));
const english = messagesOf(source);
const parse = (message) => new IntlMessageFormat(message, 'en', undefined, { ignoreTag: true }).getAst();

test('every key in locales/en.json keeps its placeholders, plurals, selects and tags in the pseudo-language', () => {
  assert.deepEqual(pseudoProblems(english, IntlMessageFormat), []);
  for (const [key, message] of Object.entries(english)) {
    // The same gate an approved translation passes: nothing dropped, added, renamed or changed kind.
    assert.deepEqual(messageProblems(key, pseudoLocalize(message), 'en', IntlMessageFormat, placeholdersOf(parse(message))), [], key);
  }
});

test('the check fails when a placeholder, plural, select or tag is lost, renamed or changed', () => {
  const tricky = {
    'fixture.tag.bold': 'Hello <b>{name}</b>, welcome back.',
    'fixture.plural.count': '{count, plural, =0 {No moments} one {# moment} other {# moments}}',
    'fixture.select.status': '{status, select, open {Open} other {Resolved}}',
  };
  assert.deepEqual(pseudoProblems(tricky, IntlMessageFormat), []);
  const broken = (change) => (message) => change(pseudoLocalize(message));
  const renamed = pseudoProblems(tricky, IntlMessageFormat, broken((message) => message.replace('{name}', '{ñámé}')));
  assert.equal(renamed.length, 1);
  assert.match(renamed[0], /^fixture\.tag\.bold lost, renamed or changed a placeholder/);
  assert.match(pseudoProblems(tricky, IntlMessageFormat, broken((message) => message.replace('<b>', '<strong>').replace('</b>', '</strong>')))[0], /^fixture\.tag\.bold changed an HTML tag/);
  assert.match(pseudoProblems(tricky, IntlMessageFormat, broken((message) => message.replace(' one {', ' few {')))[0], /^fixture\.plural\.count lost, renamed or changed/);
  assert.match(pseudoProblems(tricky, IntlMessageFormat, broken((message) => message.replace('one {# ', 'one {')))[0], /^fixture\.plural\.count lost, renamed or changed/);
  assert.match(pseudoProblems(tricky, IntlMessageFormat, broken((message) => message.replace('select', 'plural')))[0], /^fixture\.select\.status lost, renamed or changed/);
  assert.match(pseudoProblems(tricky, IntlMessageFormat, broken((message) => message.replace('{count, plural,', '{count plural')))[0], /^fixture\.plural\.count does not parse/);
  assert.deepEqual(pseudoProblems(tricky, IntlMessageFormat, (message) => message), [
    'fixture.tag.bold is not in brackets', 'fixture.tag.bold is no longer than English', 'fixture.tag.bold has an unaccented letter',
    'fixture.plural.count is not in brackets', 'fixture.plural.count is no longer than English', 'fixture.plural.count has an unaccented letter',
    'fixture.select.status is not in brackets', 'fixture.select.status is no longer than English', 'fixture.select.status has an unaccented letter',
  ], 'English itself is not a pseudo-language');
});

test('only the words change: arguments, number skeletons, offsets, #, quoting and entities are copied', () => {
  assert.equal(pseudoLocalize('Backup and restore'), '[Bááçķúp ááñď ŕééšťóóŕé]');
  assert.equal(pseudoLocalize('{journey} history'), '[{journey} ĥííšťóóŕý]');
  assert.equal(pseudoLocalize('#{sequence, number, ::group-off} · {summary}'), '[#{sequence, number, ::group-off} · {summary}]');
  assert.equal(pseudoLocalize('{n, plural, offset:1 =0 {nobody} other {# others}}'), '[{n, plural, offset:1 =0 {ñóóbóďý} other {# óóťĥééŕš}}]');
  assert.equal(pseudoLocalize("It's '{literal}' &amp; <i>more</i>"), "[Íť'š '{ľííťééŕááľ}' &amp; <i>móóŕé</i>]");
  assert.equal(pseudoLocalize(''), '[]');
});

test('a pseudo sentence is about 30% longer than English, accented and bracketed', () => {
  const letters = (text) => (text.match(/\p{L}/gu) || []).length;
  const sentences = Object.values(english).filter((message) => !message.includes('{') && message.length > 40);
  assert.ok(sentences.length > 10);
  for (const message of sentences) {
    const ratio = letters(pseudoLocalize(message)) / letters(message);
    assert.ok(ratio >= 1 + PSEUDO_EXPANSION - 0.05 && ratio <= 1 + PSEUDO_EXPANSION + 0.05, `${ratio.toFixed(2)}: ${message}`);
  }
  const pseudo = pseudoMessages(english);
  assert.deepEqual(Object.keys(pseudo), Object.keys(english));
  for (const message of Object.values(pseudo)) assert.match(message, /^\[[\s\S]*\]$/);
});

test('the pseudo-language still formats with the same values: plurals choose, selects choose, values come through untouched', () => {
  const t = createTranslator({ locale: 'en', messages: pseudoMessages(english), MessageFormat: IntlMessageFormat });
  assert.equal(t('history.screen.title', { journey: 'Home in Fall' }), '[⁨Home in Fall⁩ ĥííšťóóŕý]');
  assert.equal(t('history.concern.status', { status: 'open' }), '[Óópéñ]');
  assert.equal(t('history.concern.status', { status: 'resolved' }), '[Ŕééšóóľvéď]');
  assert.equal(t('history.event.heading', { sequence: 1234, summary: 'Added a moment' }), '[#1234 · ⁨Added a moment⁩]');
  assert.equal(
    t('history.event.record', { id: 'e2', hasPrevious: 'yes', previous: 'e1', hasHash: 'yes', hash: '3f9a1c0b77de' }),
    '[Éévéñť ÍíĎ ⁨e2⁩ · Pŕéévííóúš ⁨e1⁩ · šééŕvééŕ-ááúúťĥóóŕííťáťívé · Ĥáášĥ ⁨3f9a1c0b77de⁩…]',
  );
  assert.equal(t('history.event.record', { id: 'e1', hasPrevious: 'no', previous: '', hasHash: 'no', hash: '' }), '[Éévéñť ÍíĎ ⁨e1⁩ · Pŕéévííóúš ñóóñé · šééŕvééŕ-ááúúťĥóóŕííťáťívé]');
  const plural = createTranslator({ locale: 'en', messages: pseudoMessages({ 'fixture.moments.count': '{count, plural, one {# moment} other {# moments}}' }), MessageFormat: IntlMessageFormat });
  assert.equal(plural('fixture.moments.count', { count: 1 }), '[1 móóméñť]');
  assert.equal(plural('fixture.moments.count', { count: 5 }), '[5 móómééñťš]');
});

test('it is for testing only: never in the manifest, never offered, and never shipped', () => {
  const manifest = JSON.parse(read('locales/languages.json'));
  assert.ok(!manifest.languages.some((language) => language.tag === PSEUDO_LOCALE || /pseudo/i.test(language.name)), 'not in the languages manifest');
  assert.ok(!existsSync(join(root, `locales/${PSEUDO_LOCALE}.json`)), 'no translation file');
  // The web's production build leaves the file out, and so does the server's image.
  const output = mkdtempSync(join(tmpdir(), 'together-ledger-site-'));
  try {
    execFileSync(process.execPath, [join(root, 'scripts/build-public-site.mjs'), '--out', output], { stdio: 'pipe' });
    assert.ok(existsSync(join(output, 'src/i18n/web.js')));
    assert.ok(!existsSync(join(output, 'src/i18n/pseudo.js')), 'the website does not ship the pseudo-language');
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
  assert.ok(read('.dockerignore').split('\n').includes('src/i18n/pseudo.js'), 'the server image does not carry it');
  // The switches: a development server only, never a setting, a language, a page or a screen.
  const web = read('src/i18n/web.js');
  assert.match(web, /const pseudo = development && new URLSearchParams\(globalThis\.location\.search\)\.has\('pseudo'\);/);
  assert.match(web, /if \(pseudo\) \{\n\s+const \{ pseudoMessages, PSEUDO_LOCALE \} = await import\('\.\/pseudo\.js'\);/);
  assert.doesNotMatch(web, /^import .*pseudo/m, 'never a static import, which would load it everywhere');
  const phone = read('apps/mobile/src/i18n/index.ts');
  assert.match(phone, /if \(__DEV__ && process\.env\.EXPO_PUBLIC_I18N_PSEUDO === '1'\) \{\n[^\n]*\n\s+const \{ pseudoMessages, PSEUDO_LOCALE \} = require\('\.\.\/\.\.\/\.\.\/\.\.\/src\/i18n\/pseudo\.js'\)/);
  assert.doesNotMatch(phone, /^import .*pseudo/m);
  for (const path of ['src/app.js', 'index.html', 'src/store.js']) assert.doesNotMatch(read(path), /pseudo/i, `${path} has no pseudo-language setting`);
  for (const path of ['apps/mobile/app.config.js', 'apps/mobile/eas.json']) assert.doesNotMatch(read(path), /PSEUDO/, `${path} never builds with it`);
});
