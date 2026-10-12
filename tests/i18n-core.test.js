import assert from 'node:assert/strict';
import test from 'node:test';
import { IntlMessageFormat } from 'intl-messageformat';
import { createFormatter, dateLocale, localeParts, withDigits } from '../src/i18n/format.js';
import { createTranslator, FSI, insertedNames, isolateText, PDI } from '../src/i18n/translator.js';
import { money } from '../src/model.js';

// The translation core (docs/TRANSLATION.md): t(), the formatting helper and isolation.

const english = {
  'journey.leave.done': '{gender, select, female {{name} left the journey.} other {{name} left the journey.}}',
  'journey.moments.count': '{count, plural, one {# moment} other {# moments}}',
  'common.action.save': 'Save',
  'history.event.heading': '#{sequence, number, ::group-off} · {summary}',
  'only.in.english': 'Only in English',
};
const hindi = {
  'journey.leave.done': '{gender, select, female {{name} ने यात्रा छोड़ दी।} male {{name} ने यात्रा छोड़ दिया।} other {{name} ने यात्रा छोड़ी।}}',
  'journey.moments.count': '{count, plural, one {# पल} other {# पल}}',
  'common.action.save': 'सहेजें',
  'history.event.heading': '#{sequence, number, ::group-off} · {summary}',
};

function translator(locale, messages, extra = {}) {
  const missing = [];
  const errors = [];
  const t = createTranslator({
    locale,
    messages,
    fallbacks: locale === 'en' ? [] : [{ locale: 'en', messages: english }],
    MessageFormat: IntlMessageFormat,
    onMissing: (key, language) => missing.push(`${language}:${key}`),
    onError: (key, language, error) => errors.push(`${language}:${key}:${error.constructor.name}`),
    ...extra,
  });
  return { t, missing, errors };
}

test('a person\'s own text inside a sentence is isolated, and a value a select chooses by is not', () => {
  const { t } = translator('hi', hindi);
  assert.equal(t('journey.leave.done', { gender: 'female', name: 'আশা' }), `${FSI}আশা${PDI} ने यात्रा छोड़ दी।`, 'a Bengali name in a Hindi sentence');
  assert.equal(t('journey.leave.done', { gender: 'male', name: 'Sam' }), `${FSI}Sam${PDI} ने यात्रा छोड़ दिया।`, 'select still sees "male"');
  assert.equal(t('journey.leave.done', { gender: 'unknown', name: 'Sam' }), `${FSI}Sam${PDI} ने यात्रा छोड़ी।`, 'anything else is "other"');
  assert.equal(isolateText('x'), '⁨x⁩');
  const ast = new IntlMessageFormat(hindi['journey.leave.done'], 'hi').getAst();
  assert.deepEqual([...insertedNames(ast)], ['name'], 'gender is chosen by, never wrapped');
});

test('plurals follow each language\'s own rules, and numbers inside a sentence keep its digits', () => {
  const { t: en } = translator('en', english);
  assert.equal(en('journey.moments.count', { count: 1 }), '1 moment');
  assert.equal(en('journey.moments.count', { count: 0 }), '0 moments');
  const { t: hi } = translator('hi', { 'x.y.z': '{count, plural, one {one} other {other}}' });
  assert.equal(hi('x.y.z', { count: 0 }), 'one', 'in Hindi, 0 takes the singular, as 1 does');
  assert.equal(hi('x.y.z', { count: 2 }), 'other');
  const { t: es } = translator('es-419', { 'x.y.z': '{count, plural, one {one} many {many} other {other}}' });
  assert.equal(es('x.y.z', { count: 1000000 }), 'many', 'Spanish has a "many" for a million');
  const { t: hinglish } = translator('hi-Latn', { 'x.y.z': '{count, plural, one {ek} other {kai}}' });
  assert.equal(hinglish('x.y.z', { count: 0 }), 'ek', 'Hinglish counts as Hindi does');

  const bengali = createFormatter({ locale: 'bn', numberingSystem: 'beng' });
  const { t: bn } = translator('bn', { 'history.event.heading': '#{sequence, number, ::group-off} · {summary}' }, { formatters: bengali.messageFormatters });
  assert.equal(bn('history.event.heading', { sequence: 1234, summary: 'কিছু' }), `#১২৩৪ · ${FSI}কিছু${PDI}`);
  const latinBengali = createFormatter({ locale: 'bn', numberingSystem: 'latn' });
  const { t: bnLatn } = translator('bn', { 'history.event.heading': '#{sequence, number, ::group-off} · {summary}' }, { formatters: latinBengali.messageFormatters });
  assert.equal(bnLatn('history.event.heading', { sequence: 1234, summary: 'x' }), `#1234 · ${FSI}x${PDI}`);
});

test('a missing sentence falls back to English and says so once; one missing everywhere shows its key', () => {
  const { t, missing } = translator('hi', hindi);
  assert.equal(t('only.in.english'), 'Only in English');
  t('only.in.english');
  assert.deepEqual(missing, ['hi:only.in.english'], 'warned once, not on every render');
  assert.equal(t('nowhere.at.all'), 'nowhere.at.all');
  assert.ok(missing.includes('hi:nowhere.at.all'));
  assert.equal(t.has('only.in.english'), true);
  assert.equal(t.has('nowhere.at.all'), false);
});

test('Hinglish falls back to English, never to Hindi', () => {
  const t = createTranslator({
    locale: 'hi-Latn',
    messages: { 'common.action.save': 'Save karo' },
    fallbacks: [{ locale: 'en', messages: english }],
    MessageFormat: IntlMessageFormat,
  });
  assert.equal(t('only.in.english'), 'Only in English');
  assert.equal(t('common.action.save'), 'Save karo');
});

test('a sentence that cannot be formatted falls back to English rather than breaking the screen', () => {
  const { t, errors } = translator('hi', { ...hindi, 'common.action.save': 'सहेजें {broken' });
  assert.equal(t('common.action.save'), 'Save');
  assert.equal(errors.length, 1);
});

test('t.parts gives the web each person\'s text on its own, for a <bdi>', () => {
  const { t } = translator('en', english);
  assert.deepEqual(t.parts('journey.leave.done', { gender: 'other', name: 'Asha' }), [{ isolated: 'Asha' }, ' left the journey.']);
  assert.deepEqual(t.parts('common.action.save'), ['Save']);
});

test('digits are rewritten only into a numbering system the helper knows', () => {
  assert.equal(withDigits('12 Oct 2026, 3:04', 'beng'), '১২ Oct ২০২৬, ৩:০৪');
  assert.equal(withDigits('১২ অক্টো, ২০২৬', 'latn'), '12 অক্টো, 2026');
  assert.equal(withDigits('१२', 'latn'), '12');
  assert.equal(withDigits('12', 'nonsense'), '12');
  assert.deepEqual(localeParts('hi-Latn-IN-u-nu-latn'), { language: 'hi', script: 'Latn', region: 'IN' });
  assert.deepEqual(localeParts('en_GB'), { language: 'en', script: '', region: 'GB' });
});

test('dates keep the person\'s region within the language; numbers and money keep the language\'s own locale', () => {
  const english = { locale: 'en-US', regionalDates: true };
  assert.equal(dateLocale(english, 'en-GB'), 'en-GB');
  assert.equal(dateLocale(english, 'en-IN'), 'en-IN');
  assert.equal(dateLocale(english, 'hi-IN'), 'en-IN', 'English on a Hindi phone: English words, Indian order');
  assert.equal(dateLocale(english, 'fr'), 'en-US');
  assert.equal(dateLocale({ locale: 'en-US', regionalDates: false }, 'en-GB'), 'en-US');
  assert.equal(dateLocale({ locale: 'bn', regionalDates: true }, 'bn-IN'), 'bn-IN');
  assert.equal(dateLocale({ locale: 'en-IN', regionalDates: true }, 'hi-IN'), 'en-IN', 'Hinglish on a Hindi phone stays in Latin script');
  assert.equal(dateLocale({ locale: 'es-419', regionalDates: true }, 'es-MX'), 'es-MX');

  const helper = createFormatter({ locale: 'en-US', regionalDates: true, numberingSystem: 'latn', device: 'en-GB' });
  assert.equal(helper.money(1250, 'USD'), '$1,250.00', 'money stays as en-US writes it, on a British phone too');
  assert.equal(helper.number(1234567.5), '1,234,567.5');
  assert.equal(helper.dateTime('2026-10-12T15:04:00Z', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }), '12 Oct 2026, 15:04');
  assert.equal(helper.dateTime('not a date'), null);
  assert.equal(helper.dateTime(''), null);
});

test('English money and dates read exactly as they did before the helper', () => {
  const helper = createFormatter({ locale: 'en-US', regionalDates: true, numberingSystem: 'latn' });
  for (const cents of [0, 5, 1250, 123456789, -400]) assert.equal(helper.money(cents / 100, 'USD'), money(cents), `${cents} cents`);
  assert.equal(helper.money(12.5, 'NOT-A-CURRENCY'), money(1250, 'NOT-A-CURRENCY'));
  assert.equal(helper.money(12.5, ''), money(1250, ''));
  // History's dates used the device's own locale, with no locale named; for an English device the
  // helper writes the same.
  const before = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  for (const device of ['en-US', 'en-GB', 'en-IN', 'en-AU']) {
    const ours = createFormatter({ locale: 'en-US', regionalDates: true, numberingSystem: 'latn', device });
    const theirs = (value) => new Intl.DateTimeFormat(device, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
    assert.equal(ours.dateTime('2026-10-01T13:33:11Z'), theirs('2026-10-01T13:33:11Z'), device);
  }
  assert.equal(createFormatter({ locale: 'en-US', regionalDates: true, numberingSystem: 'latn' }).dateTime('2026-10-01T13:33:11Z'), before('2026-10-01T13:33:11Z'), 'this machine\'s own locale');
});

test('the helper writes the language\'s digits even where the engine ignores numberingSystem, and never calls formatToParts', () => {
  // Hermes on iOS: numberingSystem is dropped, the locale's default digits are used, and
  // NumberFormat.prototype.formatToParts stops the app.
  const strip = (options = {}) => { const { numberingSystem, ...rest } = options; return rest; };
  const iosLike = {
    NumberFormat: class extends Intl.NumberFormat {
      constructor(locale, options) { super(locale, strip(options)); }
      formatToParts() { throw new Error('formatToParts is unimplemented on Apple platforms'); }
    },
    DateTimeFormat: class extends Intl.DateTimeFormat {
      constructor(locale, options) { super(locale, strip(options)); }
      formatToParts() { throw new Error('not on this engine'); }
    },
    PluralRules: Intl.PluralRules,
  };
  const bnLatin = createFormatter({ locale: 'bn', numberingSystem: 'latn', regionalDates: true, device: 'bn-BD', IntlApi: iosLike });
  assert.equal(new iosLike.NumberFormat('bn', { numberingSystem: 'latn' }).format(12), '১২', 'the engine itself writes Bengali digits');
  assert.equal(bnLatin.number(1234), '1,234');
  assert.match(bnLatin.dateTime('2026-10-12T15:04:00Z', { dateStyle: 'medium', timeZone: 'UTC' }), /^12 .+ 2026$/);
  const bnBengali = createFormatter({ locale: 'bn', numberingSystem: 'beng', IntlApi: iosLike });
  assert.equal(bnBengali.number(12), '১২');
  const t = createTranslator({ locale: 'bn', messages: { 'a.b.c': '{n, number} · {d, date, medium}' }, MessageFormat: IntlMessageFormat, formatters: bnLatin.messageFormatters });
  assert.match(t('a.b.c', { n: 1234, d: new Date(Date.UTC(2026, 9, 12, 12)) }), /^1,234 · 12 .+ 2026$/);
});

test('a server error is translated by its code, with the server\'s English only as the fallback', async () => {
  const { errorKey, errorMessage } = await import('../src/i18n/translator.js');
  assert.equal(errorKey('store_unavailable'), 'error.server.storeUnavailable');
  assert.equal(errorKey('rate_limit_exceeded'), 'error.server.rateLimitExceeded');
  const t = createTranslator({ locale: 'hi', messages: { 'error.server.rateLimitExceeded': 'कुछ देर बाद फिर कोशिश करें।' }, MessageFormat: IntlMessageFormat });
  assert.equal(errorMessage(t, { code: 'rate_limit_exceeded', message: 'Too many requests.' }), 'कुछ देर बाद फिर कोशिश करें।');
  assert.equal(errorMessage(t, { code: 'store_unavailable', message: 'The store is unavailable.' }), 'The store is unavailable.');
  assert.equal(errorMessage(t, null, 'Something went wrong.'), 'Something went wrong.');
});
