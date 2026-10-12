/**
 * The phone's translations: this app's wiring of the shared core in src/i18n (the web's too) to
 * the same translation files the web reads, locales/*.json, bundled into the app. Nothing is
 * fetched at runtime. See docs/TRANSLATION.md.
 *
 *   t('history.screen.title', { journey: name })   a sentence, a person's own text isolated
 *   format.dateTime(value)                          a date for the active language, or null
 */
import './intl-polyfills';
import { IntlMessageFormat } from 'intl-messageformat';
import source from '../../../../locales/en.json';
import manifest from '../../../../locales/languages.json';
import { languageOf, messagesOf } from '../../../../src/i18n/catalog.js';
import { createFormatter, deviceLocale } from '../../../../src/i18n/format.js';
import { createTranslator } from '../../../../src/i18n/translator.js';
import { NATIVE_INTL } from './intl-native';

type Formatting = { locale: string; regionalDates: boolean; numberingSystem: string | null };
export type MessageValues = Record<string, string | number | Date | null | undefined>;

// Always the source language for now. The Language preference (101B) chooses another, and only
// ever one that offeredLanguages(manifest) lists.
const active: string = manifest.source;
const formatting = (languageOf(manifest, active) as { formatting: Formatting }).formatting;
const catalogs: Record<string, Record<string, string>> = { [manifest.source]: messagesOf(source) };

// The pseudo-language, for testing layouts (docs/TRANSLATION.md): start a development server with
// EXPO_PUBLIC_I18N_PSEUDO=1 npx expo start. Never a setting, a language or a screen of its own. A
// release build compiles __DEV__ to false, so Metro drops this branch and the file it requires.
if (__DEV__ && process.env.EXPO_PUBLIC_I18N_PSEUDO === '1') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { pseudoMessages, PSEUDO_LOCALE } = require('../../../../src/i18n/pseudo.js') as typeof import('../../../../src/i18n/pseudo.js');
  catalogs[active] = pseudoMessages(catalogs[active]);
  console.info(`[i18n] Showing the pseudo-language (${PSEUDO_LOCALE}), for testing layouts only.`);
}

export const format = createFormatter(formatting);

const translate = createTranslator({
  locale: active,
  messages: catalogs[active],
  fallbacks: active === manifest.source ? [] : [{ locale: manifest.source, messages: catalogs[manifest.source] }],
  MessageFormat: IntlMessageFormat,
  formatters: format.messageFormatters,
  onMissing: __DEV__ ? (key: string, locale: string) => console.warn(`[i18n] "${key}" is missing in ${locale}; showing English.`) : undefined,
  onError: __DEV__ ? (key: string, locale: string, error: unknown) => console.warn(`[i18n] "${key}" in ${locale} did not format:`, error) : undefined,
});

/** The sentence for key in the active language, falling back to English. */
export function t(key: string, values?: MessageValues): string {
  return translate(key, values);
}

const LANGUAGES = ['en', 'hi', 'bn', 'es-419', 'hi-Latn'];

/**
 * What Intl this phone has and what it writes, for the five languages: which pieces are the
 * engine's own and which are polyfilled, the plural category of 0, 1, 2 and 5, a number, an
 * amount of money and a date. Printed once in development, so a build day can read it off a real
 * iPhone and a real Android phone.
 */
export function intlReport() {
  const when = new Date(Date.UTC(2026, 9, 12, 15, 4));
  const samples = Object.fromEntries(LANGUAGES.map((tag) => {
    const own = (languageOf(manifest, tag) as { formatting: Formatting } | undefined)?.formatting;
    const helper = own ? createFormatter(own) : format;
    let plurals: string;
    try {
      const rules = new Intl.PluralRules(tag);
      plurals = [0, 1, 2, 5].map((count) => `${count}:${rules.select(count)}`).join(' ');
    } catch (error) {
      plurals = `failed: ${String(error)}`;
    }
    return [tag, { plurals, number: helper.number(1234567.5), money: helper.money(1234.5, 'USD'), date: helper.dateTime(when) }];
  }));
  return {
    native: NATIVE_INTL,
    polyfilled: {
      PluralRules: Boolean((Intl.PluralRules as unknown as { polyfilled?: boolean }).polyfilled),
      Locale: Boolean((Intl.Locale as unknown as { polyfilled?: boolean } | undefined)?.polyfilled),
    },
    device: deviceLocale(),
    samples,
  };
}

if (__DEV__) console.info('[i18n] Intl on this phone:', JSON.stringify(intlReport(), null, 2));
