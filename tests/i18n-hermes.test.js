import assert from 'node:assert/strict';
import test from 'node:test';
import { IntlMessageFormat } from 'intl-messageformat';
import { runProbe } from '../scripts/probe-hermes-intl.mjs';
import { createFormatter } from '../src/i18n/format.js';

// Intl on the phone (docs/TRANSLATION.md). Hermes V1, the engine React Native 0.86 runs, has
// Intl.Collator, DateTimeFormat, NumberFormat and getCanonicalLocales, and nothing else; on iOS,
// NumberFormat.prototype.formatToParts stops the app. Here Node is cut down to exactly that, and
// the phone's own polyfills (intl-polyfills.ts) and helpers are run inside it for the five
// languages. With HERMES set to a Hermes binary, the same probe also runs in the real engine.

const HERMES_SURFACE = `
for (const name of Object.getOwnPropertyNames(Intl)) {
  if (!['Collator', 'DateTimeFormat', 'NumberFormat', 'getCanonicalLocales'].includes(name)) delete Intl[name];
}
Intl.NumberFormat.prototype.formatToParts = function () { throw new Error('formatToParts is unimplemented on Apple platforms'); };
`;

const TAGS = { en: 'en', hi: 'hi', bn: 'bn', 'bn latn': 'bn', 'bn beng': 'bn', 'es-419': 'es-419', 'hi-Latn': 'hi-Latn' };
const COUNTS = [0, 1, 2, 5, 1000000];
const nativePlurals = (tag) => { const rules = new Intl.PluralRules(tag); return COUNTS.map((count) => rules.select(count)).join(' '); };

const probe = await runProbe(process.execPath, HERMES_SURFACE);

test('on an engine with only Hermes\'s Intl, the phone\'s polyfills add PluralRules and Locale, and nothing else', () => {
  assert.deepEqual(probe.native, { PluralRules: false, Locale: false, NumberFormat: true, DateTimeFormat: true });
  assert.deepEqual(probe.polyfilled, { PluralRules: true, Locale: true });
});

test('plural rules come out as CLDR has them, for all five languages', () => {
  for (const [name, tag] of Object.entries(TAGS)) assert.equal(probe.languages[name].plurals, nativePlurals(tag), name);
  assert.equal(probe.languages.hi.plurals, 'one one other other other', 'Hindi: 0 and 1 are singular');
  assert.equal(probe.languages.bn.plurals, 'one one other other other', 'Bengali: 0 and 1 are singular');
  assert.equal(probe.languages['es-419'].plurals, 'other one other other many', 'Spanish: a million is "many"');
  assert.equal(probe.languages['hi-Latn'].plurals, probe.languages.hi.plurals, 'Hinglish counts as Hindi does');
  assert.equal(probe.languages.en.sentence, 'other: 0 (0) | one: 1 (1) | other: 2 (2) | other: 5 (5) | other: 1,000,000 (1,000,000)');
  assert.equal(probe.languages.hi.sentence.split(' | ')[0], 'one: 0 (0)');
});

test('numbers, money and dates are written without formatToParts, and in the language\'s digits', () => {
  for (const [name, result] of Object.entries(probe.languages)) {
    for (const [what, value] of Object.entries(result)) assert.doesNotMatch(value, /^threw/, `${name} ${what}: ${value}`);
  }
  const outside = (name, settings) => createFormatter({ ...settings, device: settings.locale });
  const expected = {
    en: outside('en', { locale: 'en-US', regionalDates: true, numberingSystem: 'latn' }),
    'bn latn': outside('bn', { locale: 'bn', regionalDates: true, numberingSystem: 'latn' }),
    'bn beng': outside('bn', { locale: 'bn', regionalDates: true, numberingSystem: 'beng' }),
  };
  for (const [name, format] of Object.entries(expected)) {
    assert.equal(probe.languages[name].number, format.number(1234567.5), name);
    assert.equal(probe.languages[name].money, format.money(1234.5, 'USD'), name);
  }
  assert.equal(probe.languages.en.money, '$1,234.50');
  assert.match(probe.languages['bn latn'].date, /^12 .+ 2026, 3:04/);
  assert.match(probe.languages['bn beng'].number, /^[০-৯,.]+$/);
  assert.equal(probe.languages.en.person, '⁨আশা⁩ · 1,234.5', 'a Bengali name inside an English line is isolated');
  assert.ok(IntlMessageFormat, 'the same IntlMessageFormat the phone bundles');
});

// The real engine, when there is one to hand: the result of a run is in the PR that added this.
test('under a real Hermes binary, plurals and dates hold for all five languages', { skip: !process.env.HERMES && 'set HERMES to a Hermes binary built with Intl' }, async () => {
  const hermes = await runProbe(process.env.HERMES);
  assert.deepEqual(hermes.native, { PluralRules: false, Locale: false, NumberFormat: true, DateTimeFormat: true });
  assert.deepEqual(hermes.polyfilled, { PluralRules: true, Locale: true });
  for (const [name, tag] of Object.entries(TAGS)) assert.equal(hermes.languages[name].plurals, nativePlurals(tag), name);
  assert.match(hermes.languages.en.date, /^Oct 12, 2026, 3:04\sPM$/, 'ICU puts a narrow no-break space before PM');
  assert.match(hermes.languages['bn latn'].date, /^12 .+ 2026, 3:04/, 'Latin digits, though Hermes ignores numberingSystem');
  assert.match(hermes.languages['bn beng'].date, /^১২ .+ ২০২৬/);
});
