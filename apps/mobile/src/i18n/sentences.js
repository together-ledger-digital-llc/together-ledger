// The phone's t(), as a plain module any file can import, the helpers kept free of React
// included (src/journey/*, src/shell/*, src/auth/*...). index.ts installs the active language's
// translator here whenever the language changes, so every sentence is read at the moment it is
// drawn and a change takes effect at once. Until then it is English, read from the same
// locales/en.json: that is what a helper imported on its own (as the tests import them) says.
// See docs/TRANSLATION.md.
import { IntlMessageFormat } from 'intl-messageformat';
import source from '../../../../locales/en.json' with { type: 'json' };
import { messagesOf } from '../../../../src/i18n/catalog.js';
import { createTranslator, errorKey } from '../../../../src/i18n/translator.js';

/** @typedef {Record<string, string | number | Date | null | undefined>} MessageValues */
/** @typedef {((key: string, values?: MessageValues) => string) & { has: (key: string) => boolean, parts: Function }} Translator */

/** @type {Translator | null} */
let translate = null;

/** @returns {Translator} */
function english() {
  return createTranslator({ locale: 'en', messages: messagesOf(source), MessageFormat: IntlMessageFormat });
}

/**
 * Makes next the translator every sentence is read through. Called by index.ts only.
 * @param {Translator} next
 */
export function setTranslator(next) {
  translate = next;
}

/**
 * The sentence for key in the active language, falling back to English. A person's own text
 * inserted as a value (a name, a journey) is isolated.
 * @param {string} key
 * @param {MessageValues} [values]
 * @returns {string}
 */
export function t(key, values) {
  translate ??= english();
  return translate(key, values);
}

/**
 * A sentence in pieces, for one whose part is drawn differently (the welcome's italic "together."):
 * each piece is a string of the sentence's own words, or { value } where a value was inserted, in
 * the order the active language puts them.
 * @param {string} key
 * @param {MessageValues} [values]
 * @returns {(string | { value: string })[]}
 */
export function sentenceParts(key, values) {
  translate ??= english();
  return /** @type {any} */ (translate).parts(key, values, (/** @type {string} */ text) => ({ value: text }));
}

/**
 * Whether the active language, or English, has a sentence for key.
 * @param {string} key
 */
export function hasSentence(key) {
  translate ??= english();
  return translate.has(key);
}

/**
 * A server error in the active language, by its code (docs/TRANSLATION.md, "Server errors"). A
 * code whose sentence differs from screen to screen is read under its screen's own area first,
 * such as error.signIn.invalidCredentials; then the phone's own codes, under mobile.error (no
 * connection, the service not answering); then the account client's, under error.client, which
 * the web shares; then error.server; and only then in the server's own
 * words, for a code with no sentence yet. fallback is for an error with neither.
 * @param {unknown} error
 * @param {string} fallback
 * @param {string} [area]
 * @returns {string}
 */
export function serverError(error, fallback, area) {
  const found = /** @type {{ code?: unknown, message?: unknown } | null} */ (error && typeof error === 'object' ? error : null);
  const code = typeof found?.code === 'string' ? found.code : '';
  for (const where of [area, 'mobile.error', 'error.client', 'error.server']) {
    if (code && where && hasSentence(errorKey(code, where))) return t(errorKey(code, where));
  }
  if (typeof found?.message === 'string' && found.message) return found.message;
  return fallback;
}
