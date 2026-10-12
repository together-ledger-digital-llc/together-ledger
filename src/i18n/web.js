// The web's translations: this app's wiring of the shared core (translator.js, format.js,
// catalog.js, dom.js) to its own files. See docs/TRANSLATION.md.
//
// The sentences are locales/*.json, the same files the phone bundles. They ship in the same
// release as this page and are read from its own origin, never from a CDN or a translation
// service. Loading them is part of loading the page: app.js waits for this module, as it waits
// for every other one it imports.
import { IntlMessageFormat } from '../vendor/intl-messageformat.js';
import { languageOf, messagesOf } from './catalog.js';
import { applyTranslations as applyAll, renderSentence as render, sentenceHtml as html } from './dom.js';
import { createFormatter } from './format.js';
import { createTranslator } from './translator.js';

async function load(name) {
  const response = await fetch(new URL(`../../locales/${name}`, import.meta.url));
  if (!response.ok) throw new Error(`locales/${name} could not be loaded (${response.status}).`);
  return response.json();
}

const development = ['localhost', '127.0.0.1'].includes(globalThis.location?.hostname);
// Both at once: the source language is English, and languages.json says so.
const [manifest, source] = await Promise.all([load('languages.json'), load('en.json')]);

// Always the source language for now. The Language preference (101B) chooses another, and only
// ever one that offeredLanguages(manifest) lists.
const active = manifest.source;
const language = languageOf(manifest, active);
const catalogs = { [manifest.source]: messagesOf(source) };

// The pseudo-language, for testing layouts (docs/TRANSLATION.md): add ?pseudo to the address of a
// local development server. Never a setting, a language or a page of its own, and the production
// build doesn't carry src/i18n/pseudo.js at all, so nowhere else can it be switched on.
const pseudo = development && new URLSearchParams(globalThis.location.search).has('pseudo');
if (pseudo) {
  const { pseudoMessages, PSEUDO_LOCALE } = await import('./pseudo.js');
  catalogs[active] = pseudoMessages(catalogs[active]);
  console.info(`[i18n] Showing the pseudo-language (${PSEUDO_LOCALE}), for testing layouts only.`);
}

export const format = createFormatter(language.formatting);

export const t = createTranslator({
  locale: active,
  messages: catalogs[active],
  fallbacks: active === manifest.source ? [] : [{ locale: manifest.source, messages: catalogs[manifest.source] }],
  MessageFormat: IntlMessageFormat,
  formatters: format.messageFormatters,
  onMissing: development ? (key, locale) => console.warn(`[i18n] "${key}" is missing in ${locale}; showing English.`) : undefined,
  onError: development ? (key, locale, error) => console.warn(`[i18n] "${key}" in ${locale} did not format:`, error) : undefined,
});

/** Fills every [data-i18n] element under root. */
export const applyTranslations = (root = document) => applyAll(t, root);
/** Puts a sentence into element, a person's own text in <bdi>. */
export const renderSentence = (element, key, values) => render(element, t, key, values);
/** The same sentence as escaped markup, a person's own text in <bdi>. */
export const sentenceHtml = (key, values) => html(t, key, values);
