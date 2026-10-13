import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { IntlMessageFormat } from 'intl-messageformat';
import {
  approvedLanguageProblems, choosableLanguages, glossaryToTbx, isPreview, KEY_PATTERN, languageOf, listedLanguages, manifestProblems, messagesOf, notesOf, offeredLanguages,
  previewLanguageProblems, sourceProblems, translationProblems,
} from '../src/i18n/catalog.js';
import { collectFiles } from '../scripts/check-public-safety.mjs';
import { errorKey } from '../src/i18n/translator.js';
import { vendoredSource, VENDORED } from '../scripts/vendor-intl-messageformat.mjs';

// The translation files, the languages manifest and the glossary (docs/TRANSLATION.md).

const root = new URL('..', import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const fixture = (name) => json(`tests/fixtures/i18n/${name}`);
const manifest = json('locales/languages.json');
// The cases below are about the rules for each status, not about what the shipped manifest holds
// today, so they start from it with every translation back at draft and set what each one needs.
const draftManifest = {
  ...manifest,
  languages: manifest.languages.map((language) => (language.tag === manifest.source ? language : { ...language, status: 'draft', reviewer: null, approvedOn: null })),
};
const source = json('locales/en.json');

test('English, the source, is well formed: every key area.thing.element, every key with a note, every sentence parses', () => {
  assert.deepEqual(sourceProblems(source, IntlMessageFormat), []);
  assert.equal(source['@@locale'], 'en');
  assert.ok(Object.keys(messagesOf(source)).length > 0);
  assert.equal(Object.keys(notesOf(source)).length, Object.keys(messagesOf(source)).length);
});

test('the gate: every approved language has every key, no key English lacks, and the same placeholders', () => {
  const translations = Object.fromEntries(offeredLanguages(manifest)
    .filter((language) => language.tag !== manifest.source)
    .map((language) => [language.tag, existsSync(join(root, `locales/${language.tag}.json`)) ? json(`locales/${language.tag}.json`) : undefined]));
  assert.deepEqual(approvedLanguageProblems(manifest, source, translations, IntlMessageFormat), []);
  const previews = Object.fromEntries(choosableLanguages(manifest)
    .filter(isPreview)
    .map((language) => [language.tag, existsSync(join(root, `locales/${language.tag}.json`)) ? json(`locales/${language.tag}.json`) : undefined]));
  assert.deepEqual(previewLanguageProblems(manifest, source, previews, IntlMessageFormat), [], 'a language in preview keeps English\'s placeholders in what it holds');
});

test('the gate, proved on a fixture: an approved language passes only when it matches English exactly', () => {
  const fixtureManifest = fixture('languages.json');
  const fixtureSource = fixture('en.json');
  assert.deepEqual(manifestProblems(fixtureManifest), []);
  assert.deepEqual(sourceProblems(fixtureSource, IntlMessageFormat), []);
  const gate = (file) => approvedLanguageProblems(fixtureManifest, fixtureSource, { hi: file && fixture(file) }, IntlMessageFormat);

  assert.deepEqual(gate('hi.complete.json'), [], 'complete Hindi passes');
  assert.deepEqual(gate(undefined), ['hi: approved, but it has no translation file']);
  assert.deepEqual(gate('hi.missing-key.json'), ['hi: common.action.save is missing']);
  assert.deepEqual(gate('hi.extra-key.json'), ['hi: common.action.cancel is not in the source']);
  assert.deepEqual(gate('hi.dropped-placeholder.json'), ['hi: journey.leave.done drops the placeholder {name}']);
  assert.deepEqual(gate('hi.renamed-placeholder.json'), [
    'hi: journey.leave.done drops the placeholder {name}',
    'hi: journey.leave.done has a placeholder {naam} the source does not',
  ]);
  assert.deepEqual(gate('hi.changed-kind.json'), ['hi: journey.moments.count uses {count} as text, not plural']);
  const broken = gate('hi.broken.json');
  assert.equal(broken.length, 2, broken.join('\n'));
  assert.match(broken[0], /^hi: journey\.leave\.done (has a plural or select without an "other" branch|does not parse)/);
  assert.match(broken[1], /^hi: journey\.moments\.count does not parse/);
  // Bengali is in review and Hinglish a draft: neither is checked as approved, or offered.
  assert.deepEqual(offeredLanguages(fixtureManifest).map((language) => language.tag), ['en', 'hi']);
  assert.deepEqual(translationProblems(fixtureSource, { ...fixture('hi.complete.json'), '@@locale': 'bn' }, 'hi', IntlMessageFormat), ['its @@locale is "bn", not "hi"']);
});

test('the manifest: five languages, only approved ones offered, and every one falls back to English', () => {
  assert.deepEqual(manifestProblems(manifest), []);
  assert.deepEqual(manifest.languages.map((language) => language.tag), ['en', 'hi', 'bn', 'es-419', 'hi-Latn']);
  assert.deepEqual(offeredLanguages(manifest).map((language) => language.tag), ['en', 'hi', 'bn', 'es-419', 'hi-Latn'], 'all four translations were approved on Oct 13, 2026');
  assert.equal(languageOf(manifest, 'hi-Latn').fallback, 'en', 'Hinglish falls back to English, never to Hindi');
  for (const language of manifest.languages.filter((entry) => entry.tag !== 'en')) {
    assert.equal(language.status, 'approved', `${language.tag} is approved`);
    assert.equal(language.reviewer, 'Owner');
    assert.equal(language.approvedOn, '2026-10-13');
  }
  assert.equal(languageOf(manifest, 'bn').formatting.numberingSystem, 'beng', 'Bengali digits, the owner\'s choice (decision 170)');

  const approvedUnreviewed = { ...draftManifest, languages: draftManifest.languages.map((language) => (language.tag === 'hi' ? { ...language, status: 'approved' } : language)) };
  assert.deepEqual(manifestProblems(approvedUnreviewed), ['hi is approved with no reviewer', 'hi is approved with no approval date']);
  const hinglishToHindi = { ...manifest, languages: manifest.languages.map((language) => (language.tag === 'hi-Latn' ? { ...language, fallback: 'hi' } : language)) };
  assert.deepEqual(manifestProblems(hinglishToHindi), ['hi-Latn falls back to "hi"; every language falls back to the source, en']);
  const unknownStatus = { ...draftManifest, languages: draftManifest.languages.map((language) => (language.tag === 'bn' ? { ...language, status: 'live' } : language)) };
  assert.deepEqual(manifestProblems(unknownStatus), ['bn has the status "live"; it must be one of draft, in-review, preview, approved']);
});

// A preview (owner, Oct 12, 2026, decision 145): offered to be chosen by hand, marked so, and never
// matched to anyone's browser or phone. Draft and in-review languages are offered nowhere.
test('a preview can be chosen by hand but is never offered for a device to match, and a draft or one in review is neither', () => {
  const statuses = { hi: 'preview', bn: 'in-review', 'es-419': 'draft', 'hi-Latn': 'approved' };
  const mixed = {
    ...draftManifest,
    languages: draftManifest.languages.map((language) => (statuses[language.tag]
      ? { ...language, status: statuses[language.tag], ...(statuses[language.tag] === 'approved' ? { reviewer: 'A fluent reviewer', approvedOn: '2026-10-12' } : {}) }
      : language)),
  };
  assert.deepEqual(manifestProblems(mixed), [], 'a preview needs no reviewer or approval date');
  assert.deepEqual(offeredLanguages(mixed).map((language) => language.tag), ['en', 'hi-Latn']);
  assert.deepEqual(choosableLanguages(mixed).map((language) => language.tag), ['en', 'hi', 'hi-Latn']);
  assert.deepEqual(choosableLanguages(mixed).filter(isPreview).map((language) => language.tag), ['hi']);
  const datedPreview = { ...mixed, languages: mixed.languages.map((language) => (language.tag === 'hi' ? { ...language, approvedOn: '2026-10-12' } : language)) };
  assert.deepEqual(manifestProblems(datedPreview), ['hi has an approval date but is preview']);

  // A preview's file may lack sentences (they read in English), but may not break or add one.
  const source = fixture('en.json');
  assert.deepEqual(previewLanguageProblems(mixed, source, {}, IntlMessageFormat), ['hi: in preview, but it has no translation file']);
  assert.deepEqual(previewLanguageProblems(mixed, source, { hi: { '@@locale': 'hi' } }, IntlMessageFormat), []);
  assert.deepEqual(previewLanguageProblems(mixed, source, { hi: { '@@locale': 'hi', 'not.in.source': 'x' } }, IntlMessageFormat), ['hi: not.in.source is not in the source']);
});

test('every language in preview has its file, and every sentence in it passes the gate', () => {
  const previews = manifest.languages.filter(isPreview);
  const translations = Object.fromEntries(previews.map((language) => [language.tag, json(`locales/${language.tag}.json`)]));
  assert.deepEqual(previewLanguageProblems(manifest, source, translations, IntlMessageFormat), []);
});

test('the Language choice lists every language in the manifest: approved, in preview, or coming soon (decision 160)', () => {
  // As the manifest stands: every language is approved, so each may be chosen.
  assert.deepEqual(listedLanguages(manifest), [
    { tag: 'en', nativeName: 'English', listing: 'approved' },
    { tag: 'hi', nativeName: 'हिन्दी', listing: 'approved' },
    { tag: 'bn', nativeName: 'বাংলা', listing: 'approved' },
    { tag: 'es-419', nativeName: 'Español (Latinoamérica)', listing: 'approved' },
    { tag: 'hi-Latn', nativeName: 'Hinglish (Hindi in Latin script)', listing: 'approved' },
  ]);
  // With every translation still a draft, English may be chosen and every other language is on its way.
  assert.deepEqual(listedLanguages(draftManifest).map(({ tag, listing }) => [tag, listing]), [['en', 'approved'], ['hi', 'comingSoon'], ['bn', 'comingSoon'], ['es-419', 'comingSoon'], ['hi-Latn', 'comingSoon']]);
  const statuses = { hi: 'preview', bn: 'approved', 'es-419': 'in-review', 'hi-Latn': 'draft' };
  const mixed = { ...draftManifest, languages: draftManifest.languages.map((language) => (statuses[language.tag] ? { ...language, status: statuses[language.tag] } : language)) };
  assert.deepEqual(listedLanguages(mixed).map(({ tag, listing }) => [tag, listing]), [['en', 'approved'], ['hi', 'preview'], ['bn', 'approved'], ['es-419', 'comingSoon'], ['hi-Latn', 'comingSoon']], 'in the manifest\'s order, each as its status allows');
  // An app that doesn't carry a language's file yet can't read it, so lists it as coming soon.
  assert.deepEqual(listedLanguages(mixed, (tag) => tag !== 'bn').map(({ tag, listing }) => [tag, listing]), [['en', 'approved'], ['hi', 'preview'], ['bn', 'comingSoon'], ['es-419', 'comingSoon'], ['hi-Latn', 'comingSoon']]);
  // Whatever is listed as choosable is exactly what may be chosen, no more.
  assert.deepEqual(listedLanguages(mixed).filter(({ listing }) => listing !== 'comingSoon').map(({ tag }) => tag), choosableLanguages(mixed).map(({ tag }) => tag));
  assert.equal(source['common.language.comingSoon'], '{language} · Coming soon');
});

test('a language in preview may be chosen by hand, says so, and is never offered without being asked for (decision 145)', () => {
  const statuses = { hi: 'preview', bn: 'in-review', 'hi-Latn': 'preview' };
  const withPreview = { ...draftManifest, languages: draftManifest.languages.map((language) => (statuses[language.tag] ? { ...language, status: statuses[language.tag] } : language)) };
  assert.deepEqual(manifestProblems(withPreview), [], 'a preview needs no reviewer or approval date');
  assert.deepEqual(offeredLanguages(withPreview).map((language) => language.tag), ['en'], 'never matched from a device');
  assert.deepEqual(choosableLanguages(withPreview).map((language) => [language.tag, isPreview(language)]), [['en', false], ['hi', true], ['hi-Latn', true]], 'draft and in-review are never shown');
  const datedPreview = { ...withPreview, languages: withPreview.languages.map((language) => (language.tag === 'hi' ? { ...language, approvedOn: '2026-10-12' } : language)) };
  assert.deepEqual(manifestProblems(datedPreview), ['hi has an approval date but is preview']);
  assert.deepEqual(choosableLanguages(draftManifest).map((language) => language.tag), ['en'], 'with every translation a draft, only English may be chosen');
  assert.deepEqual(choosableLanguages(manifest).map((language) => language.tag), ['en', 'hi', 'bn', 'es-419', 'hi-Latn'], 'today: all five');

  // Its file may lack sentences, which read in English, but what it holds must keep English's placeholders.
  const fixtureSource = fixture('en.json');
  const previewManifest = { ...fixture('languages.json'), languages: fixture('languages.json').languages.map((language) => (language.tag === 'hi' ? { ...language, status: 'preview', reviewer: null, approvedOn: null } : language)) };
  const gate = (file) => previewLanguageProblems(previewManifest, fixtureSource, { hi: file && fixture(file) }, IntlMessageFormat);
  assert.deepEqual(gate('hi.complete.json'), []);
  assert.deepEqual(gate('hi.missing-key.json'), [], 'a missing sentence reads in English');
  assert.deepEqual(gate('hi.dropped-placeholder.json'), ['hi: journey.leave.done drops the placeholder {name}']);
  assert.deepEqual(gate(undefined), ['hi: in preview, but it has no translation file']);
});

test('the glossary holds the careful words, with a place for each language, and exports as TBX', () => {
  const glossary = json('locales/glossary.json');
  const languages = manifest.languages.map((language) => language.tag).filter((tag) => tag !== manifest.source);
  assert.deepEqual(glossary.languages, languages);
  for (const word of ['rests', 'another person', 'another place', 'journey', 'moment']) {
    assert.ok(glossary.terms.some((term) => term.term === word), word);
  }
  for (const term of glossary.terms) {
    assert.ok(term.id && term.term && term.definition && term.partOfSpeech, term.id);
    assert.ok(Array.isArray(term.avoid) && term.avoid.length, `${term.id} says what never to use`);
    assert.deepEqual(Object.keys(term.translations), languages, `${term.id} has a place for every language`);
  }
  const tbx = glossaryToTbx(glossary);
  assert.equal((tbx.match(/<termEntry /g) || []).length, glossary.terms.length);
  assert.equal((tbx.match(/<termEntry /g) || []).length, (tbx.match(/<\/termEntry>/g) || []).length);
  assert.match(tbx, /<langSet xml:lang="en"><tig><term>another person<\/term>/);
  const agreed = glossaryToTbx({ ...glossary, terms: [{ ...glossary.terms[0], translations: { hi: { term: 'विश्राम <करता> है', note: 'x & y' } } }] });
  assert.match(agreed, /<langSet xml:lang="hi"><tig><term>विश्राम &lt;करता&gt; है<\/term><note>x &amp; y<\/note><\/tig><\/langSet>/);
});

// Every key the web and the phone use is in English, and every key in English is used.
const KEY_LITERAL = /['"]([a-z][a-zA-Z0-9]*(?:\.[a-z][a-zA-Z0-9]*){2,})['"]/g;
const scanned = [
  'index.html',
  ...collectFiles(join(root, 'src')).map((path) => relative(root, path)).filter((path) => path.endsWith('.js') && !path.startsWith('src/vendor/')),
  ...collectFiles(join(root, 'apps/mobile/app')).map((path) => relative(root, path)),
  ...collectFiles(join(root, 'apps/mobile/src')).map((path) => relative(root, path)).filter((path) => /\.(tsx?|js)$/.test(path)),
];

test('every key in use is in English, and every English key is in use', () => {
  const keys = new Set(Object.keys(messagesOf(source)));
  const used = new Set();
  for (const path of scanned) {
    const text = read(path);
    for (const [, key] of text.matchAll(KEY_LITERAL)) if (keys.has(key)) used.add(key);
    for (const [, key] of text.matchAll(/\bt\(\s*'([^']+)'/g)) assert.ok(keys.has(key), `${path} uses ${key}, which locales/en.json does not have`);
    for (const [, key] of text.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)) assert.ok(keys.has(key), `${path} names ${key}, which locales/en.json does not have`);
  }
  // A server error's sentence is looked up by its code (errorKey), never written as a key: it is in
  // use while the server, or the web's own client, still answers with that code.
  const codes = new Set();
  for (const path of [...collectFiles(join(root, 'server')).map((file) => relative(root, file)).filter((file) => file.endsWith('.js')), 'src/api.js']) {
    for (const [, code] of read(path).matchAll(/(?:code: '|PlatformError\(\d+, ')([a-z_]+)'/g)) codes.add(code);
  }
  for (const key of keys) {
    const [area, group, name] = key.split('.');
    if (area === 'error' && [...codes].some((code) => errorKey(code, `${area}.${group}`) === `${area}.${group}.${name}`)) used.add(key);
  }
  assert.deepEqual([...keys].filter((key) => !used.has(key)), [], 'unused keys');
  for (const key of keys) assert.match(key, KEY_PATTERN);
});

test('web and phone read the same translation files, and there is no second copy', () => {
  const copies = collectFiles(root)
    .map((path) => relative(root, path))
    .filter((path) => /(^|\/)(en|hi|bn|es-419|hi-Latn)\.(json|arb)$/.test(path) && !path.startsWith('tests/fixtures/') && !path.startsWith('apps/mobile/ios/') && !path.startsWith('apps/mobile/android/'));
  assert.deepEqual(copies.sort(), ['locales/bn.json', 'locales/en.json', 'locales/es-419.json', 'locales/hi-Latn.json', 'locales/hi.json']);
  assert.match(read('src/i18n/web.js'), /new URL\(`\.\.\/\.\.\/locales\/\$\{name\}`, import\.meta\.url\)/);
  for (const name of ['bn', 'es-419', 'hi', 'hi-Latn']) {
    assert.match(read('apps/mobile/src/i18n/index.ts'), new RegExp(`from '\\.\\./\\.\\./\\.\\./\\.\\./locales/${name}\\.json';`), `the phone bundles ${name}`);
  }
  assert.match(read('apps/mobile/src/i18n/index.ts'), /import source from '\.\.\/\.\.\/\.\.\/\.\.\/locales\/en\.json';/);
  assert.match(read('apps/mobile/src/i18n/index.ts'), /from '\.\.\/\.\.\/\.\.\/\.\.\/src\/i18n\/translator\.js'/, 'the phone runs the web\'s own t()');
});

test('the moved sentences live only in English\'s file, not also in the markup or the screens', () => {
  const html = read('index.html');
  const dialog = html.slice(html.indexOf('<dialog id="settings-dialog">'), html.indexOf('<section id="sharing-settings"'));
  const rest = html.slice(html.indexOf('</section>', html.indexOf('<section id="sharing-settings"')), html.indexOf('<section id="leave-journey"'));
  for (const key of ['common.journeySettings.title', 'settings.storage.browserOnly', 'settings.backup.privacy', 'settings.reset.note', 'settings.privacy.note', 'common.theme.note']) {
    const english = messagesOf(source)[key];
    assert.ok(!dialog.includes(`>${english}<`) && !rest.includes(`>${english}<`), `index.html still writes "${english}"`);
  }
  assert.doesNotMatch(dialog + rest, /\saria-label="/, 'every label in Settings comes from a key');
  const history = read('apps/mobile/app/history.tsx');
  for (const english of ['Return-to conversations', 'Recorded changes', 'Conversation deleted.', 'server-authoritative', 'Nothing to return to yet']) {
    assert.ok(!history.includes(english), `history.tsx still writes "${english}"`);
  }
});

test('the web\'s copy of IntlMessageFormat is exactly what the installed package makes, at ES2020', async () => {
  assert.equal(readFileSync(VENDORED, 'utf8'), await vendoredSource(), 'run node scripts/vendor-intl-messageformat.mjs');
  const version = json('node_modules/intl-messageformat/package.json').version;
  assert.match(read('src/vendor/intl-messageformat.js'), new RegExp(`intl-messageformat ${version.replace(/\./g, '\\.')} \\(BSD-3-Clause\\)`));
  assert.doesNotMatch(read('src/vendor/intl-messageformat.js'), /static\s*\{/, 'no class static blocks, which Safari before 16.4 cannot read');
  assert.equal(json('package.json').devDependencies['intl-messageformat'], json('apps/mobile/package.json').dependencies['intl-messageformat'], 'web and phone run the same version');
});

test('the website ships every module the page imports, and the translation files', () => {
  const output = mkdtempSync(join(tmpdir(), 'together-ledger-site-'));
  try {
    execFileSync(process.execPath, [join(root, 'scripts/build-public-site.mjs'), '--out', output], { stdio: 'pipe' });
    const seen = new Set();
    const visit = (path) => {
      if (seen.has(path)) return;
      seen.add(path);
      assert.ok(existsSync(join(output, path)), `${path} is imported but not shipped`);
      for (const [, specifier] of read(path).matchAll(/(?:^|\n)\s*(?:import|export)\s[^;]*?from\s+'(\.[^']+)'/g)) visit(relative(root, join(root, dirname(path), specifier)));
    };
    visit('src/app.js');
    assert.ok(seen.has('src/i18n/web.js') && seen.has('src/vendor/intl-messageformat.js'));
    for (const path of ['locales/en.json', 'locales/languages.json']) {
      assert.equal(readFileSync(join(output, path), 'utf8'), read(path), `${path} ships unchanged`);
    }
    assert.ok(!readdirSync(join(output, 'locales')).includes('glossary.json'), 'the glossary is for translators, not the page');
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

test('the phone\'s History reads word for word as it did before it moved to keys', async () => {
  const { createTranslator } = await import('../src/i18n/translator.js');
  const { createFormatter } = await import('../src/i18n/format.js');
  const format = createFormatter(languageOf(manifest, 'en').formatting);
  const t = createTranslator({ locale: 'en', messages: messagesOf(source), MessageFormat: IntlMessageFormat, formatters: format.messageFormatters });
  const unmarked = (key, values) => t(key, values).replace(/[⁨⁩]/g, '');
  const when = '2026-10-01T13:33:11Z';
  const before = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(when));
  // What history.tsx wrote before, next to what it writes now.
  const pairs = [
    ['History', unmarked('history.screen.name')],
    ['Sign in and open a journey to see its history.', unmarked('history.screen.signedOut')],
    ['Home in Fall history', unmarked('history.screen.title', { journey: 'Home in Fall' })],
    ['Server-authoritative, account-attributed history. HMAC chaining makes database changes detectable; deleted records retain privacy-bounded tombstones.', unmarked('history.screen.lead')],
    ['Return-to conversations', unmarked('history.concerns.heading')],
    ['Start a return-to conversation', unmarked('history.concerns.start')],
    ['Open', unmarked('history.concern.status', { status: 'open' })],
    ['Resolved', unmarked('history.concern.status', { status: 'resolved' })],
    [`Updated ${before}`, unmarked('history.concern.updated', { time: format.dateTime(when) })],
    ['Updated Time not recorded', unmarked('history.concern.updated', { time: format.dateTime(null) ?? unmarked('common.time.notRecorded') })],
    ['Edit', unmarked('common.action.edit')],
    ['Delete', unmarked('common.action.delete')],
    ['Nothing to return to yet. Conversations you want to come back to together will appear here.', unmarked('history.concerns.empty')],
    ['Conversation deleted. The history keeps a tombstone.', unmarked('history.concern.deleted')],
    ['Recorded changes', unmarked('history.events.heading')],
    ['No recorded changes yet. Changes appear here as they happen. Activity from before the Event Manager began cannot be reconstructed.', unmarked('history.events.empty')],
    ['#12 · Added a moment', unmarked('history.event.heading', { sequence: 12, summary: 'Added a moment' })],
    ['#1234 · Added a moment', unmarked('history.event.heading', { sequence: 1234, summary: 'Added a moment' })],
    [`Asha · ${before}`, unmarked('history.event.byline', { actor: 'Asha', time: format.dateTime(when) })],
    ['$12.50 → none', unmarked('history.event.change', { before: '$12.50', after: 'none' })],
    ['No field-level value change was stored for this event.', unmarked('history.event.noChange')],
    ['Event ID e2 · Previous e1 · server-authoritative · Hash 3f9a1c0b77de…', unmarked('history.event.record', { id: 'e2', hasPrevious: 'yes', previous: 'e1', hasHash: 'yes', hash: '3f9a1c0b77de' })],
    ['Event ID e1 · Previous none · server-authoritative', unmarked('history.event.record', { id: 'e1', hasPrevious: 'no', previous: '', hasHash: 'no', hash: '' })],
  ];
  for (const [then, now] of pairs) assert.equal(now, then);
});
