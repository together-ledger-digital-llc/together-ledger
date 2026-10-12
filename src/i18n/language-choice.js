// Which language a person reads in: the one they chose by hand, or else the first of their
// device's own languages the product offers, or else the source language. Plain JavaScript with
// no imports, copied unchanged into other apps. See docs/TRANSLATION.md, "Choosing the language".
//
// A choice is a language tag, or null for "Follow my device": no choice made. The two are never
// the same thing. Someone who chose English keeps English when their phone moves to Hindi;
// someone who never chose follows the phone.

// The script a language is written in when its tag names none. A device's hi-IN is Devanagari,
// so it is Hindi and never Hinglish (hi-Latn); bn-BD is Bengali script.
const OWN_SCRIPT = Object.freeze({ bn: 'Beng', en: 'Latn', es: 'Latn', hi: 'Deva' });

function tagParts(tag) {
  const [language = '', ...rest] = String(tag || '').trim().split(/[-_]/);
  const extension = rest.findIndex((part) => part.length === 1);
  const subtags = extension === -1 ? rest : rest.slice(0, extension);
  const lower = language.toLowerCase();
  const script = subtags.find((part) => /^[A-Za-z]{4}$/.test(part)) || '';
  return {
    language: lower,
    script: script ? script[0].toUpperCase() + script.slice(1).toLowerCase() : OWN_SCRIPT[lower] || '',
    region: subtags.find((part) => /^([A-Za-z]{2}|\d{3})$/.test(part))?.toUpperCase() || '',
  };
}

/**
 * The offered language one device language matches, or null. The same language in the same
 * script matches whatever the region, so every Spanish (es-MX, es-AR, es-US, es-ES...) is es-419,
 * bn-BD and bn-IN are bn, and hi-IN is hi. Only a device that names Latin script for Hindi
 * (Android 14 and later offer "Hindi (Latin)", hi-Latn-IN) is Hinglish. When two offered
 * languages share a language and script, the one with the device's own region comes first.
 *
 * @param {string} deviceTag a BCP 47 tag from the device, e.g. 'es-MX'
 * @param {string[]} offered the tags that may be chosen, e.g. ['en', 'hi', 'es-419']
 */
export function matchLanguage(deviceTag, offered) {
  const device = tagParts(deviceTag);
  if (!device.language) return null;
  const candidates = offered.filter((tag) => {
    const own = tagParts(tag);
    return own.language === device.language && own.script === device.script;
  });
  return candidates.find((tag) => tagParts(tag).region === device.region) || candidates[0] || null;
}

/**
 * The first of the device's languages, in the device's own order, that matches an offered one.
 * The whole list is walked, not only its first entry: a phone set to French, then Bengali, reads
 * in Bengali. Null when nothing matches.
 *
 * @param {readonly string[]} deviceLanguages e.g. navigator.languages
 * @param {string[]} offered
 */
export function matchDeviceLanguages(deviceLanguages, offered) {
  for (const tag of deviceLanguages || []) {
    const match = matchLanguage(tag, offered);
    if (match) return match;
  }
  return null;
}

/**
 * The language to read in. A choice the product no longer offers is treated as no choice, so
 * nobody is ever shown a language that isn't approved.
 *
 * @param {{ choice: string | null | undefined, deviceLanguages: readonly string[], offered: string[], source: string }} input
 */
export function resolveLanguage({ choice, deviceLanguages, offered, source }) {
  if (choice && offered.includes(choice)) return choice;
  return matchDeviceLanguages(deviceLanguages, offered) || source;
}

/** A stored choice, read back: an offered tag, or null for "Follow my device". */
export function readChoice(value, offered) {
  return typeof value === 'string' && offered.includes(value) ? value : null;
}

/**
 * The choice to keep once someone signs in. The account's own choice wins; an account with none
 * takes the one made on this device before signing in. Null when neither has one.
 */
export function choiceAtSignIn(accountChoice, deviceChoice) {
  return accountChoice || deviceChoice || null;
}

// The language a screen reader is asked to speak in, where it isn't the language itself. null
// means: declare the language for the content and ask for no voice of our own. Hinglish is
// declared as hi-Latn and no voice is asked for until the owner has run the device check in
// docs/HINGLISH_STYLE.md §8.7 (open choice O7). If that check shows Indian English reads it
// better, this line becomes 'hi-Latn': 'en-IN', and nothing else changes.
export const SPEECH_LANGUAGES = Object.freeze({ 'hi-Latn': null });

/** The language screen readers should speak tag in, or null to leave the voice to the reader. */
export function speechLanguage(tag) {
  return Object.hasOwn(SPEECH_LANGUAGES, tag) ? SPEECH_LANGUAGES[tag] : tag;
}
