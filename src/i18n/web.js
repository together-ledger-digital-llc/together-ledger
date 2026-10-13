// The web's translations: this app's wiring of the shared core (translator.js, format.js,
// catalog.js, dom.js, language-choice.js) to its own files. See docs/TRANSLATION.md.
//
// The sentences are locales/*.json, the same files the phone bundles. They ship in the same
// release as this page and are read from its own origin, never from a CDN or a translation
// service. Loading them is part of loading the page: app.js waits for this module, as it waits
// for every other one it imports.
import { IntlMessageFormat } from '../vendor/intl-messageformat.js';
import { choosableLanguages, languageOf, listedLanguages, messagesOf, offeredLanguages } from './catalog.js';
import { applyTranslations as applyAll, renderSentence as render, sentenceHtml as html } from './dom.js';
import { createFormatter } from './format.js';
import { readChoice, resolveLanguage, speechLanguage } from './language-choice.js';
import { createTranslator } from './translator.js';

async function load(name) {
  const response = await fetch(new URL(`../../locales/${name}`, import.meta.url));
  if (!response.ok) throw new Error(`locales/${name} could not be loaded (${response.status}).`);
  return response.json();
}

const development = ['localhost', '127.0.0.1'].includes(globalThis.location?.hostname);
// Both at once: the source language is English, and languages.json says so.
const [manifest, source] = await Promise.all([load('languages.json'), load('en.json')]);
const catalogs = { [manifest.source]: messagesOf(source) };

// The pseudo-language, for testing layouts (docs/TRANSLATION.md): add ?pseudo to the address of a
// local development server. Never a setting, a language or a page of its own, and the production
// build doesn't carry src/i18n/pseudo.js at all, so nowhere else can it be switched on. It stands
// in for English, so the page reads in it whatever language is chosen.
const pseudo = development && new URLSearchParams(globalThis.location.search).has('pseudo');
if (pseudo) {
  const { pseudoMessages, PSEUDO_LOCALE } = await import('./pseudo.js');
  catalogs[manifest.source] = pseudoMessages(catalogs[manifest.source]);
  console.info(`[i18n] Showing the pseudo-language (${PSEUDO_LOCALE}), for testing layouts only.`);
}

// A browser's own languages are matched only to approved ones. A person may also choose a
// preview by hand; a draft or a language in review is listed as coming soon, and never chosen,
// read or matched (catalog.js).
const offeredTags = offeredLanguages(manifest).map((language) => language.tag);
const choosableTags = choosableLanguages(manifest).map((language) => language.tag);

// The choice this browser keeps: a language chosen by hand, or nothing for "Follow my device".
// Before signing in it is the only choice there is; once signed in, it mirrors the account's, so
// the page opens in the right language before the account has answered. Blocked storage is no
// choice, and the page still draws.
const CHOICE_KEY = 'language';

function storedChoice() {
  try { return readChoice(localStorage.getItem(CHOICE_KEY), choosableTags); } catch { return null; }
}

function storeChoice(choice) {
  try {
    if (choice) localStorage.setItem(CHOICE_KEY, choice);
    else localStorage.removeItem(CHOICE_KEY);
  } catch { /* the choice still applies to this page */ }
}

const browserLanguages = () => globalThis.navigator?.languages?.length ? navigator.languages : [globalThis.navigator?.language].filter(Boolean);

let active = manifest.source;
let translate = () => '';

/** The dates, numbers and money of the active language. */
export let format = createFormatter(languageOf(manifest, active).formatting);

/**
 * The sentence for key in the active language, falling back to English. It stays one function
 * for the life of the page, and always asks whichever translator the active language has, so
 * t.parts (for renderSentence), t.has and t.locale follow a change of language too.
 */
export const t = Object.defineProperties((key, values) => translate(key, values), {
  parts: { value: (...args) => translate.parts(...args) },
  has: { value: (key) => translate.has(key) },
  locale: { get: () => translate.locale },
});

// Reads a language's file once, from this page's own origin. A file that can't be read leaves
// the page in English rather than in no language at all.
async function catalogFor(tag) {
  if (!catalogs[tag]) catalogs[tag] = messagesOf(await load(`${tag}.json`));
  return catalogs[tag];
}

async function activate(tag) {
  let messages;
  try {
    messages = await catalogFor(tag);
  } catch (error) {
    if (development) console.warn(`[i18n] ${tag} could not be loaded; showing English.`, error);
    tag = manifest.source;
    messages = catalogs[tag];
  }
  active = tag;
  format = createFormatter(languageOf(manifest, tag).formatting);
  translate = createTranslator({
    locale: tag,
    messages,
    fallbacks: tag === manifest.source ? [] : [{ locale: manifest.source, messages: catalogs[manifest.source] }],
    MessageFormat: IntlMessageFormat,
    formatters: format.messageFormatters,
    onMissing: development ? (key, locale) => console.warn(`[i18n] "${key}" is missing in ${locale}; showing English.`) : undefined,
    onError: development ? (key, locale, error) => console.warn(`[i18n] "${key}" in ${locale} did not format:`, error) : undefined,
  });
  declareLanguage(tag);
}

// The page says what language it is in, so screen readers pronounce it and the browser offers to
// translate the right thing: lang on <html> is the content's language, always. A language whose
// voice is decided separately (speechLanguage, language-choice.js) would carry that on <body>;
// none does yet, Hinglish included (docs/HINGLISH_STYLE.md §8.6).
function declareLanguage(tag) {
  document.documentElement.lang = tag;
  const speech = speechLanguage(tag);
  if (speech && speech !== tag) document.body?.setAttribute('lang', speech);
  else document.body?.removeAttribute('lang');
}

const resolve = (choice) => resolveLanguage({ choice, deviceLanguages: browserLanguages(), offered: offeredTags, choosable: choosableTags, source: manifest.source });

await activate(pseudo ? manifest.source : resolve(storedChoice()));

/** The active language's tag. */
export const activeLanguage = () => active;

/** The choice this browser keeps: a tag, or null for "Follow my device". */
export const languageChoice = () => storedChoice();

/**
 * Every language in the manifest, each with its own name, in the manifest's order (decision 160):
 * listing is 'approved', 'preview' (marked Preview, chosen by hand only) or 'comingSoon' (a draft
 * or a language in review, shown and never chosen). The build ships every choosable language's
 * file, so the web carries each one it may offer.
 */
export const languageOptions = () => listedLanguages(manifest);

/**
 * Keeps choice (a tag, or null to follow the browser) on this browser and switches the page's
 * language to what it resolves to. Returns the active language. Only the sentences filled by
 * data-i18n are redrawn here; whatever app.js draws itself, it redraws.
 */
export async function chooseLanguage(choice) {
  const kept = readChoice(choice, choosableTags);
  storeChoice(kept);
  const next = resolve(kept);
  if (next !== active) {
    await activate(next);
    applyTranslations();
  }
  return active;
}

/** Fills every [data-i18n] element under root. */
export const applyTranslations = (root = document) => applyAll(t, root);
/** Puts a sentence into element, a person's own text in <bdi>. */
export const renderSentence = (element, key, values) => render(element, t, key, values);
/** The same sentence as escaped markup, a person's own text in <bdi>. */
export const sentenceHtml = (key, values) => html(t, key, values);
