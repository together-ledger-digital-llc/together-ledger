/**
 * The Intl the phone is missing, and nothing more (docs/TRANSLATION.md, "Intl on the phone").
 *
 * Hermes, the engine React Native 0.86 runs (Hermes V1, 250829098.0.17), has Intl.Collator,
 * Intl.DateTimeFormat, Intl.NumberFormat and Intl.getCanonicalLocales on iOS and Android, and
 * nothing else: no PluralRules, so no ICU plural can choose "one" or "other"; and no Locale,
 * which the PluralRules polyfill uses to match a language. Both come from FormatJS, with plural
 * data for the five languages' plural rules: en, hi (Hindi and Hinglish), bn and es (es-419).
 * Each polyfill checks first, and adds itself only where the engine has none; each locale-data
 * file does nothing when PluralRules is the engine's own.
 *
 * Numbers and dates stay the engine's own. Two of its gaps are handled in src/i18n/format.js
 * rather than polyfilled: on iOS it ignores the numberingSystem option, so the helper writes
 * the digits itself; and on iOS NumberFormat.prototype.formatToParts stops the app
 * (llvm_unreachable), so nothing ever calls it.
 */
import './intl-native';
import '@formatjs/intl-locale/polyfill.js';
import '@formatjs/intl-pluralrules/polyfill.js';
import '@formatjs/intl-pluralrules/locale-data/en.js';
import '@formatjs/intl-pluralrules/locale-data/hi.js';
import '@formatjs/intl-pluralrules/locale-data/bn.js';
import '@formatjs/intl-pluralrules/locale-data/es.js';
