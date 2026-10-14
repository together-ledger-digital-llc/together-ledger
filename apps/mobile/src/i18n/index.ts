/**
 * The phone's translations: this app's wiring of the shared core in src/i18n (the web's too) to
 * the same translation files the web reads, locales/*.json, bundled into the app. Nothing is
 * fetched at runtime. See docs/TRANSLATION.md.
 *
 *   t('history.screen.title', { journey: name })   a sentence, a person's own text isolated
 *   format.dateTime(value)                          a date for the active language, or null
 */
import './intl-polyfills';
import { getLocales } from 'expo-localization';
import { IntlMessageFormat } from 'intl-messageformat';
import source from '../../../../locales/en.json';
import bn from '../../../../locales/bn.json';
import es419 from '../../../../locales/es-419.json';
import hi from '../../../../locales/hi.json';
import hiLatn from '../../../../locales/hi-Latn.json';
import manifest from '../../../../locales/languages.json';
import { choosableLanguages, isPreview, languageOf, listedLanguages, messagesOf, offeredLanguages } from '../../../../src/i18n/catalog.js';
import { createFormatter, deviceLocale } from '../../../../src/i18n/format.js';
import { readChoice, resolveLanguage, speechLanguage } from '../../../../src/i18n/language-choice.js';
import { createTranslator } from '../../../../src/i18n/translator.js';
import { savedLanguageNow } from '../storage/phone-storage';
import { NATIVE_INTL } from './intl-native';
import { setFormatter, setTranslator, t as sentence } from './sentences.js';

type Formatting = { locale: string; regionalDates: boolean; numberingSystem: string | null };
export type MessageValues = Record<string, string | number | Date | null | undefined>;

// Every language file the app carries. Metro bundles only what is imported by name, so a
// language is added here as its file is written (105–109); it is offered only once the manifest
// also marks it approved, or in preview (chosen by hand only).
const BUNDLED: Record<string, Record<string, unknown>> = { [manifest.source]: source, hi, bn, 'es-419': es419, 'hi-Latn': hiLatn };
const catalogs: Record<string, Record<string, string>> = Object.fromEntries(Object.entries(BUNDLED).map(([tag, arb]) => [tag, messagesOf(arb)]));

// The pseudo-language, for testing layouts (docs/TRANSLATION.md): start a development server with
// EXPO_PUBLIC_I18N_PSEUDO=1 npx expo start. Never a setting, a language or a screen of its own. A
// release build compiles __DEV__ to false, so Metro drops this branch and the file it requires.
// It stands in for English, and the phone reads in it whatever language is chosen.
let pseudo = false;
if (__DEV__ && process.env.EXPO_PUBLIC_I18N_PSEUDO === '1') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { pseudoMessages, PSEUDO_LOCALE } = require('../../../../src/i18n/pseudo.js') as typeof import('../../../../src/i18n/pseudo.js');
  pseudo = true;
  catalogs[manifest.source] = pseudoMessages(catalogs[manifest.source]);
  console.info(`[i18n] Showing the pseudo-language (${PSEUDO_LOCALE}), for testing layouts only.`);
}

export type OfferedLanguage = { tag: string; nativeName: string; preview: boolean };

/**
 * The languages that may be chosen by hand, carried in the app: each approved language, then each
 * in preview (decision 145), which the Language choice marks with the word Preview.
 */
export const OFFERED_LANGUAGES: readonly OfferedLanguage[] = choosableLanguages(manifest)
  .filter((language: { tag: string }) => language.tag in catalogs)
  .map((language: { tag: string; nativeName: string; status: string }) => ({ tag: language.tag, nativeName: language.nativeName, preview: isPreview(language) }));
const choosableTags = OFFERED_LANGUAGES.map((language) => language.tag);

export type ListedLanguage = { tag: string; nativeName: string; listing: 'approved' | 'preview' | 'comingSoon' };

/**
 * Every language in the manifest, as the Language choice lists it (decision 160): approved ones
 * and previews the app carries may be chosen; drafts, languages in review and any the app doesn't
 * carry yet are listed as coming soon, and can't be chosen.
 */
export const LISTED_LANGUAGES: readonly ListedLanguage[] = listedLanguages(manifest, (tag: string) => tag in catalogs);
// What the phone's own languages may be matched to: approved languages only. A preview is never
// reached from the phone, only chosen by hand.
const offeredTags = offeredLanguages(manifest).map((language: { tag: string }) => language.tag).filter((tag: string) => tag in catalogs);

/**
 * The phone's own languages, in its order of preference: the whole list, not only the first.
 * Android 14 and later can name "Hindi (Latin)", hi-Latn-IN, which is Hinglish.
 */
export function deviceLanguages(): string[] {
  try {
    return getLocales().map((locale) => locale.languageTag).filter(Boolean);
  } catch {
    return [deviceLocale()].filter(Boolean);
  }
}

/** A saved or account choice, read back: a tag that may be chosen, or null for "Follow my device". */
export const readLanguageChoice = (value: unknown): string | null => readChoice(value, choosableTags);

/** The language to read in, for a choice (a tag, or null to follow the phone's own languages). */
export const resolveActiveLanguage = (choice: string | null, devices: readonly string[] = deviceLanguages()): string => (
  pseudo ? manifest.source : resolveLanguage({ choice, deviceLanguages: devices, offered: offeredTags, choosable: choosableTags, source: manifest.source })
);

let active: string = manifest.source;
let ready = false;

/** The dates, numbers and money of the active language. */
export let format = createFormatter((languageOf(manifest, active) as { formatting: Formatting }).formatting);
setFormatter(format);

/** Makes tag the active language; anything that may not be chosen is English. */
export function setActiveLanguage(tag: string): string {
  const next = choosableTags.includes(tag) ? tag : manifest.source;
  if (ready && next === active) return active;
  ready = true;
  active = next;
  format = createFormatter((languageOf(manifest, next) as { formatting: Formatting }).formatting);
  setFormatter(format);
  setTranslator(createTranslator({
    locale: next,
    messages: catalogs[next],
    fallbacks: next === manifest.source ? [] : [{ locale: manifest.source, messages: catalogs[manifest.source] }],
    MessageFormat: IntlMessageFormat,
    formatters: format.messageFormatters,
    onMissing: __DEV__ ? (key: string, locale: string) => console.warn(`[i18n] "${key}" is missing in ${locale}; showing English.`) : undefined,
    onError: __DEV__ ? (key: string, locale: string, error: unknown) => console.warn(`[i18n] "${key}" in ${locale} did not format:`, error) : undefined,
  }));
  return active;
}

/** The active language's tag. */
export const activeLanguage = (): string => active;

/**
 * The language VoiceOver is asked to speak the active language in (iOS's accessibilityLanguage),
 * or undefined to leave the voice to VoiceOver. Hinglish asks for none until the owner's device
 * check (docs/HINGLISH_STYLE.md §8.6); the one place that is decided is SPEECH_LANGUAGES in
 * src/i18n/language-choice.js. Android's TalkBack takes no language from the app.
 */
export const speechLanguageOf = (tag: string): string | undefined => speechLanguage(tag) ?? undefined;

// The app opens in the language saved on this phone (a copy of the account's, once signed in),
// or else in the first of the phone's own languages it offers.
setActiveLanguage(resolveActiveLanguage(readLanguageChoice(savedLanguageNow())));

/**
 * The language the app opened in: the type the app loads before its first screen
 * (src/theme/fonts.ts). A change while the app is open loads its script's type then, and the
 * Language preference switches the words and the type together (language-provider.tsx).
 */
export const language = activeLanguage();

/** The sentence for key in the active language, falling back to English (./sentences.js). */
export function t(key: string, values?: MessageValues): string {
  return sentence(key, values);
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
    deviceLanguages: deviceLanguages(),
    active,
    samples,
  };
}

if (__DEV__) console.info('[i18n] Intl on this phone:', JSON.stringify(intlReport(), null, 2));
