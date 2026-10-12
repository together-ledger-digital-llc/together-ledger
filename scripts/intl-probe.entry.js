// What the phone's Intl does with the five languages, run inside whatever engine loads it: the
// phone's own polyfills (apps/mobile/src/i18n/intl-polyfills.ts), then plurals, a plural
// sentence, numbers, money and a date, each through the shared helpers. Bundled and run by
// scripts/probe-hermes-intl.mjs and tests/i18n-hermes.test.js.
import '../apps/mobile/src/i18n/intl-polyfills.ts';
import { IntlMessageFormat } from 'intl-messageformat';
import manifest from '../locales/languages.json';
import { NATIVE_INTL } from '../apps/mobile/src/i18n/intl-native.ts';
import { languageOf } from '../src/i18n/catalog.js';
import { createFormatter } from '../src/i18n/format.js';
import { createTranslator } from '../src/i18n/translator.js';

const COUNTS = [0, 1, 2, 5, 1000000];
const when = new Date(Date.UTC(2026, 9, 12, 15, 4));
const attempt = (fn) => { try { return fn(); } catch (error) { return `threw: ${error && error.message}`; } };

const languages = {};
for (const tag of ['en', 'hi', 'bn', 'es-419', 'hi-Latn']) {
  const formatting = languageOf(manifest, tag).formatting;
  const variants = tag === 'bn' ? { bn: formatting, 'bn latn': { ...formatting, numberingSystem: 'latn' }, 'bn beng': { ...formatting, numberingSystem: 'beng' } } : { [tag]: formatting };
  for (const [name, settings] of Object.entries(variants)) {
    const format = createFormatter({ ...settings, device: settings.locale });
    const t = createTranslator({
      locale: tag,
      messages: { 'probe.count.sentence': '{count, plural, one {one: # (#)} other {other: # (#)}}', 'probe.person.sentence': '{name} · {n, number}' },
      MessageFormat: IntlMessageFormat,
      formatters: format.messageFormatters,
    });
    languages[name] = {
      plurals: attempt(() => { const rules = new Intl.PluralRules(tag); return COUNTS.map((count) => rules.select(count)).join(' '); }),
      sentence: attempt(() => COUNTS.map((count) => t('probe.count.sentence', { count })).join(' | ')),
      person: attempt(() => t('probe.person.sentence', { name: 'আশা', n: 1234.5 })),
      number: attempt(() => format.number(1234567.5)),
      money: attempt(() => format.money(1234.5, 'USD')),
      date: attempt(() => format.dateTime(when, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })),
    };
  }
}

const result = {
  native: NATIVE_INTL,
  polyfilled: { PluralRules: Boolean(Intl.PluralRules && Intl.PluralRules.polyfilled), Locale: Boolean(Intl.Locale && Intl.Locale.polyfilled) },
  languages,
};
(typeof print === 'function' ? print : console.log)(JSON.stringify(result));
