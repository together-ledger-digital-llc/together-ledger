// The translation core: t(). Plain JavaScript with no imports, so a web page, a React Native app
// and Node's test runner load this same file, and another app can copy it without changing a line.
// See docs/TRANSLATION.md.
//
// Sentences are ICU MessageFormat, formatted by FormatJS's IntlMessageFormat, which the caller
// passes in: the web loads a bundled copy of it and the phone imports the package, so this file
// never names either.

/** First Strong Isolate and Pop Directional Isolate: Unicode's marks for "this is a separate run". */
export const FSI = '⁨';
export const PDI = '⁩';

/** A person's own text, marked so it lays itself out on its own, whatever script surrounds it. */
export function isolateText(text) {
  return `${FSI}${text}${PDI}`;
}

// IntlMessageFormat's element types (its TYPE enum): an argument is {name}, a select is
// {name, select, ...}. Written out here rather than imported, so this file needs nothing.
const ARGUMENT = 1;
const SELECT = 5;
const PLURAL = 6;
const TAG = 8;

/**
 * The names a message inserts as plain text ({name}), minus any it also chooses by
 * ({name, select, ...}): a select must see the value exactly as given, never wrapped.
 */
export function insertedNames(ast) {
  const inserted = new Set();
  const chosenBy = new Set();
  const walk = (elements) => {
    for (const element of elements) {
      if (element.type === ARGUMENT) inserted.add(element.value);
      if (element.type === SELECT) chosenBy.add(element.value);
      if (element.type === SELECT || element.type === PLURAL) Object.values(element.options).forEach((option) => walk(option.value));
      if (element.type === TAG) walk(element.children);
    }
  };
  walk(ast);
  for (const name of chosenBy) inserted.delete(name);
  return inserted;
}

/**
 * createTranslator({ locale, messages, fallbacks, MessageFormat, ... }) → t
 *
 *   locale       the language the messages are written in, e.g. 'hi'. It picks the plural rules.
 *   messages     { key: 'ICU message' } for that language.
 *   fallbacks    [{ locale, messages }], tried in order for a key the language lacks. Usually
 *                just the source language: a missing sentence reads in English, never blank.
 *   MessageFormat   the IntlMessageFormat class.
 *   formatters   optional { getNumberFormat, getDateTimeFormat, getPluralRules }, so numbers
 *                and dates inside a sentence come out exactly as the formatting helper writes
 *                them (createFormatter().messageFormatters).
 *   formats      optional named formats, e.g. { date: { full: { dateStyle: 'long' } } }.
 *   isolate      how a person's own text is marked inside a sentence. Defaults to isolateText.
 *   onMissing(key, locale)       a key fell back, or is missing everywhere. Warn in development.
 *   onError(key, locale, error)  a sentence failed to format (a missing value, a broken
 *                translation). The next language in line is tried.
 *
 * t(key, values) returns the sentence as a string. t.parts(key, values, wrap) returns an array
 * of strings and wrap(text) results, for a platform that marks people's text with an element
 * (the web's <bdi>) rather than with characters. t.has(key) says whether any language has it.
 *
 * @param {{
 *   locale: string,
 *   messages: Record<string, string>,
 *   fallbacks?: Array<{ locale: string, messages: Record<string, string> }>,
 *   MessageFormat: any,
 *   formatters?: object,
 *   formats?: object,
 *   isolate?: (text: string) => any,
 *   onMissing?: (key: string, locale: string) => void,
 *   onError?: (key: string, locale: string, error: unknown) => void,
 * }} options
 * @returns {{
 *   (key: string, values?: Record<string, unknown>): string,
 *   parts: (key: string, values?: Record<string, unknown>, wrap?: (text: string) => any) => any[],
 *   has: (key: string) => boolean,
 *   locale: string,
 * }}
 */
export function createTranslator({
  locale,
  messages,
  fallbacks = [],
  MessageFormat,
  formatters,
  formats,
  isolate = isolateText,
  onMissing = () => {},
  onError = () => {},
}) {
  if (typeof MessageFormat !== 'function') throw new TypeError('createTranslator needs the IntlMessageFormat class.');
  const catalogs = [{ locale, messages }, ...fallbacks].filter((catalog) => catalog && catalog.messages);
  const compiled = new Map();
  const reported = new Set();

  const compile = (catalog, key) => {
    const id = `${catalog.locale}\u0000${key}`;
    if (!compiled.has(id)) {
      const format = new MessageFormat(catalog.messages[key], catalog.locale, formats, { formatters, ignoreTag: true });
      compiled.set(id, { format, inserted: insertedNames(format.getAst()) });
    }
    return compiled.get(id);
  };

  const report = (key, catalogLocale) => {
    const id = `${catalogLocale}\u0000${key}`;
    if (reported.has(id)) return;
    reported.add(id);
    onMissing(key, catalogLocale);
  };

  const run = (key, values, wrap, toResult) => {
    for (const [index, catalog] of catalogs.entries()) {
      if (!Object.prototype.hasOwnProperty.call(catalog.messages, key)) continue;
      if (index > 0) report(key, locale);
      try {
        const { format, inserted } = compile(catalog, key);
        const prepared = { ...values };
        for (const name of inserted) {
          if (typeof prepared[name] === 'string') prepared[name] = wrap(prepared[name]);
        }
        return toResult(format, prepared);
      } catch (error) {
        onError(key, catalog.locale, error);
      }
    }
    report(key, locale);
    return toResult(null, null, key);
  };

  const t = (key, values = {}) => run(key, values, isolate, (format, prepared, missing) => (format ? String(format.format(prepared)) : missing));
  t.parts = (key, values = {}, wrap = (text) => ({ isolated: text })) => run(key, values, wrap, (format, prepared, missing) => (
    format ? format.formatToParts(prepared).map((part) => part.value) : [missing]
  ));
  t.has = (key) => catalogs.some((catalog) => Object.prototype.hasOwnProperty.call(catalog.messages, key));
  t.locale = locale;
  return t;
}

/** The key a server error's code reads under: 'store_unavailable' → 'error.server.storeUnavailable'. */
export function errorKey(code, area = 'error.server') {
  const camel = String(code).toLowerCase().replace(/[_-]+([a-z0-9])/g, (_, letter) => letter.toUpperCase());
  return `${area}.${camel}`;
}

/**
 * A server error, in the active language. The apps translate an error by its code; the server's
 * own English message is only the fallback, for a code that has no sentence yet, and the server
 * itself never changes. fallback is for an error with neither.
 */
export function errorMessage(t, error, fallback = '') {
  const code = error && typeof error.code === 'string' ? error.code : '';
  if (code && t.has(errorKey(code))) return t(errorKey(code));
  if (error && typeof error.message === 'string' && error.message) return error.message;
  return fallback;
}
