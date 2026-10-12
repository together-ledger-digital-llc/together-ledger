/**
 * What this phone's JavaScript engine had before any polyfill, read before intl-polyfills.ts
 * adds anything, so the development report (intlReport) can say which pieces are its own.
 */
export const NATIVE_INTL = Object.freeze({
  PluralRules: typeof Intl.PluralRules === 'function',
  Locale: typeof Intl.Locale === 'function',
  NumberFormat: typeof Intl.NumberFormat === 'function',
  DateTimeFormat: typeof Intl.DateTimeFormat === 'function',
});
