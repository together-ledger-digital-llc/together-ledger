import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  choiceAtSignIn, matchDeviceLanguages, matchLanguage, readChoice, resolveLanguage, SPEECH_LANGUAGES, speechLanguage,
} from '../src/i18n/language-choice.js';

// Choosing the language (101B, docs/TRANSLATION.md "Choosing the language").

const ALL = ['en', 'hi', 'bn', 'es-419', 'hi-Latn'];

test('every Spanish is Latin American Spanish, es-ES included (owner, Oct 12)', () => {
  for (const tag of ['es-419', 'es-MX', 'es-AR', 'es-US', 'es-CO', 'es-ES', 'es', 'es_MX', 'es-Latn-MX', 'es-ES-u-nu-latn']) {
    assert.equal(matchLanguage(tag, ALL), 'es-419', tag);
  }
});

test('bn-BD and bn-IN are Bengali; hi and hi-IN are Hindi; English in any region is English', () => {
  for (const tag of ['bn', 'bn-BD', 'bn-IN', 'bn-Beng-BD']) assert.equal(matchLanguage(tag, ALL), 'bn', tag);
  for (const tag of ['hi', 'hi-IN', 'hi-Deva-IN', 'hi_IN']) assert.equal(matchLanguage(tag, ALL), 'hi', tag);
  for (const tag of ['en', 'en-US', 'en-GB', 'en-IN', 'en-AU']) assert.equal(matchLanguage(tag, ALL), 'en', tag);
});

test('only a device that names Hindi in Latin script is Hinglish; nothing else ever guesses it', () => {
  // Android 14 and later offer "Hindi (Latin)" (docs/HINGLISH_STYLE.md §8.1).
  for (const tag of ['hi-Latn', 'hi-Latn-IN', 'hi_Latn_IN', 'HI-latn-in']) assert.equal(matchLanguage(tag, ALL), 'hi-Latn', tag);
  // English in India, Hindi in Devanagari, and an English list with Hindi behind it are not Hinglish.
  assert.equal(matchDeviceLanguages(['en-IN', 'hi-IN'], ALL), 'en');
  assert.equal(matchDeviceLanguages(['hi-IN', 'en-IN'], ALL), 'hi');
  // Without Hinglish offered, Hindi in Latin script is not read as Devanagari Hindi: a reader of
  // Latin script may not read Devanagari. The walk goes on to the next language.
  assert.equal(matchLanguage('hi-Latn-IN', ['en', 'hi']), null);
  assert.equal(matchDeviceLanguages(['hi-Latn-IN', 'en-IN'], ['en', 'hi']), 'en');
});

test('the whole list is walked in the device\'s own order, and the first match wins', () => {
  assert.equal(matchDeviceLanguages(['fr-FR', 'de-DE', 'bn-BD', 'en-US'], ALL), 'bn', 'not only the first language');
  assert.equal(matchDeviceLanguages(['fr-FR', 'en-GB', 'bn-BD'], ALL), 'en', 'English listed before Bengali comes first');
  assert.equal(matchDeviceLanguages(['pt-BR', 'es-PT', 'hi'], ALL), 'es-419');
  assert.equal(matchDeviceLanguages(['fr', 'de', 'ja'], ALL), null);
  assert.equal(matchDeviceLanguages([], ALL), null);
  assert.equal(matchDeviceLanguages(undefined, ALL), null);
  assert.equal(matchDeviceLanguages(['', 'bn'], ALL), 'bn');
});

test('only offered languages match: a draft is never reached from the device', () => {
  assert.equal(matchDeviceLanguages(['hi-IN', 'bn-BD', 'es-MX'], ['en']), null);
  assert.equal(resolveLanguage({ choice: null, deviceLanguages: ['hi-IN', 'bn-BD'], offered: ['en'], source: 'en' }), 'en', 'no match means English');
  assert.equal(resolveLanguage({ choice: null, deviceLanguages: ['fr', 'bn-IN'], offered: ['en', 'bn'], source: 'en' }), 'bn');
});

test('a language chosen by hand wins over the device; "Follow my device" follows it, and keeps following it when it changes', () => {
  const offered = ['en', 'hi', 'bn'];
  assert.equal(resolveLanguage({ choice: 'en', deviceLanguages: ['hi-IN'], offered, source: 'en' }), 'en', 'English chosen stays English on a Hindi phone');
  assert.equal(resolveLanguage({ choice: 'bn', deviceLanguages: ['hi-IN'], offered, source: 'en' }), 'bn');
  assert.equal(resolveLanguage({ choice: null, deviceLanguages: ['hi-IN'], offered, source: 'en' }), 'hi');
  assert.equal(resolveLanguage({ choice: null, deviceLanguages: ['bn-BD'], offered, source: 'en' }), 'bn', 'the same person, after the phone changed');
  // A choice no longer offered is no choice at all: the device decides, never an unapproved language.
  assert.equal(resolveLanguage({ choice: 'es-419', deviceLanguages: ['hi-IN'], offered, source: 'en' }), 'hi');
  assert.equal(resolveLanguage({ choice: 'es-419', deviceLanguages: ['es-MX'], offered, source: 'en' }), 'en');
});

// A preview (owner, Oct 12, 2026, decision 145) is chosen by hand or not at all: a browser or phone
// set to it is never moved into it, and reads in the next match or in English until it is approved.
test('a preview is only ever chosen by hand: a device set to it stays in English until it is approved', () => {
  const offered = ['en', 'bn'];
  const choosable = ['en', 'hi', 'bn'];
  assert.equal(resolveLanguage({ choice: null, deviceLanguages: ['hi-IN'], offered, choosable, source: 'en' }), 'en', 'a Hindi phone is not moved into the Hindi preview');
  assert.equal(resolveLanguage({ choice: null, deviceLanguages: ['hi-IN', 'bn-BD'], offered, choosable, source: 'en' }), 'bn', 'the walk goes on to an approved match');
  assert.equal(resolveLanguage({ choice: 'hi', deviceLanguages: ['en-US'], offered, choosable, source: 'en' }), 'hi', 'chosen by hand, it is read');
  assert.equal(resolveLanguage({ choice: 'hi', deviceLanguages: ['hi-IN'], offered, choosable, source: 'en' }), 'hi');
  assert.equal(readChoice('hi', choosable), 'hi', 'and kept');
  // Once it is approved, the same phone reads in it with nothing chosen.
  assert.equal(resolveLanguage({ choice: null, deviceLanguages: ['hi-IN'], offered: ['en', 'hi', 'bn'], choosable, source: 'en' }), 'hi');
  // Left out, choosable is what's offered, so a caller that knows nothing of previews behaves as before.
  assert.equal(resolveLanguage({ choice: 'hi', deviceLanguages: ['hi-IN'], offered, source: 'en' }), 'en');
});

test('a stored choice reads back as an offered tag or as no choice', () => {
  assert.equal(readChoice('hi', ['en', 'hi']), 'hi');
  for (const value of [null, undefined, '', 'bn', 'HI', 7, {}]) assert.equal(readChoice(value, ['en', 'hi']), null, JSON.stringify(value));
});

test('at sign-in, the account\'s own choice wins, and an account with none takes the device\'s', () => {
  assert.equal(choiceAtSignIn('bn', 'hi'), 'bn');
  assert.equal(choiceAtSignIn(null, 'hi'), 'hi');
  assert.equal(choiceAtSignIn('bn', null), 'bn');
  assert.equal(choiceAtSignIn(null, null), null);
});

test('Hinglish is declared as hi-Latn and asks screen readers for no voice of its own until the owner\'s device check (HINGLISH_STYLE §8.6)', () => {
  assert.deepEqual(SPEECH_LANGUAGES, { 'hi-Latn': null }, 'the one place the speech language is decided');
  assert.equal(speechLanguage('hi-Latn'), null);
  for (const tag of ['en', 'hi', 'bn', 'es-419']) assert.equal(speechLanguage(tag), tag);
});

test('every language in the manifest is reachable from a device tag of its own', async () => {
  const manifest = JSON.parse(await readFile(new URL('../locales/languages.json', import.meta.url), 'utf8'));
  const tags = manifest.languages.map((language) => language.tag);
  assert.deepEqual(tags, ALL);
  for (const tag of tags) assert.equal(matchLanguage(tag, tags), tag);
});

test('the core imports nothing, so it copies unchanged into another app', async () => {
  const source = await readFile(new URL('../src/i18n/language-choice.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /^\s*import\s/m);
  assert.doesNotMatch(source, /Together Ledger/);
});
