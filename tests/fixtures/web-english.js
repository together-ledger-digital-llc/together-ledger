// The web's English, for the tests that hold the phone to the web's words (102A).
//
// Since 102A the website reads its sentences from locales/en.json through t(), so a test that
// compares the phone with the web reads the web's English from there, and runs the web's own
// functions (lifted out of src/app.js) with an English t() in their scope.
import { readFileSync } from 'node:fs';
import { IntlMessageFormat } from 'intl-messageformat';
import { messagesOf } from '../../src/i18n/catalog.js';
import { createTranslator, FSI, PDI } from '../../src/i18n/translator.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

/** src/app.js, as text. */
export const web = read('src/app.js');

/** Every English sentence, by key. */
export const english = messagesOf(JSON.parse(read('locales/en.json')));

const translate = createTranslator({ locale: 'en', messages: english, MessageFormat: IntlMessageFormat });
const unmarked = (text) => String(text).replaceAll(FSI, '').replaceAll(PDI, '');

/**
 * The web's t(), in English, as a person reads it: the isolate marks around a name are invisible,
 * so they are left out. It has t.parts and t.has, as the web's does.
 */
export const t = Object.assign((key, values) => unmarked(translate(key, values)), {
  parts: (key, values, wrap) => translate.parts(key, values, wrap),
  has: (key) => translate.has(key),
});

/** The text of a statement in src/app.js that starts with opening, through its closing brace. */
function lifted(opening, source = web) {
  const start = source.indexOf(opening);
  if (start === -1) throw new Error(`src/app.js has no ${opening}`);
  let depth = 0;
  let end = source.indexOf('{', start);
  for (; end < source.length; end += 1) {
    if (source[end] === '{') depth += 1;
    if (source[end] === '}' && --depth === 0) break;
  }
  return source.slice(start, end + 1);
}

/** A function of src/app.js, run with the names in scope given ([name, value] pairs) and an English t. */
export function webFunction(name, ...scope) {
  const all = [['t', t], ...scope];
  return new Function(...all.map(([key]) => key), `${lifted(`function ${name}(`)}; return ${name};`)(...all.map(([, value]) => value));
}

/** A constant of src/app.js declared as Object.freeze({...}) or Object.freeze([...]). */
export function webConstant(name) {
  const start = web.indexOf(`const ${name} = Object.freeze(`);
  if (start === -1) throw new Error(`src/app.js has no const ${name}`);
  const end = web.indexOf(');\n', start);
  return new Function(`return ${web.slice(start + `const ${name} = `.length, end + 1)};`)();
}

const html = read('index.html');

/**
 * Whether the website says sentence, word for word: an English key holds exactly it, and the
 * web's code (src/app.js) or its page (index.html) uses that key.
 */
export function webSays(sentence) {
  return Object.entries(english).some(([key, message]) => message === sentence && (web.includes(`'${key}'`) || html.includes(`"${key}"`)));
}
