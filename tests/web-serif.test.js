import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import { messagesOf } from '../src/i18n/catalog.js';
import { pseudoMessages } from '../src/i18n/pseudo.js';
import { cmapCharacters, woff2Table } from './fixtures/font-tables.js';

// The web's serif, Gelasio (docs/2026-09-21-tl-m-02-font-decision.md, "The web half"): three
// self-hosted, Latin-only files, what each can draw, read from the files themselves, and how the
// stylesheet asks for them.

const root = new URL('../', import.meta.url);
const css = await readFile(new URL('src/styles.css', root), 'utf8');
const FILES = { 'normal 400': 'gelasio-latin.woff2', 'italic 400': 'gelasio-italic-latin.woff2', 'normal 700': 'gelasio-bold-latin.woff2' };
const SPANISH = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ñÑáéíóúüÁÉÍÓÚÜ¿¡«»“”‘’—–…€$.,;:!?()';
const faces = [...css.matchAll(/@font-face \{([^}]*)\}/g)].map(([, body]) => body).filter((body) => body.includes('font-family: Gelasio;'));
const english = messagesOf(JSON.parse(await readFile(new URL('locales/en.json', root), 'utf8')));

async function drawn(file) {
  return cmapCharacters(woff2Table(await readFile(new URL(`src/fonts/${file}`, root)), 'cmap'));
}

const missing = (mapped, text) => [...new Set([...text].filter((character) => /\S/.test(character) && !mapped.has(character.codePointAt(0))))];

// The code points a unicode-range descriptor names.
function rangeOf(face) {
  const ranges = face.match(/unicode-range: ([^;]+);/)[1].split(/,\s*/).map((part) => part.replace('U+', '').split('-').map((hex) => parseInt(hex, 16)));
  return (code) => ranges.some(([start, end = start]) => code >= start && code <= end);
}

test('Gelasio is three faces: Regular, Italic and Bold, each its own small file, with its licence', async () => {
  const build = await readFile(new URL('scripts/build-public-site.mjs', root), 'utf8');
  assert.deepEqual(faces.map((face) => `${face.match(/font-style: (\w+);/)[1]} ${face.match(/font-weight: (\d+);/)[1]}`).sort(), Object.keys(FILES).sort());
  for (const face of faces) {
    const key = `${face.match(/font-style: (\w+);/)[1]} ${face.match(/font-weight: (\d+);/)[1]}`;
    assert.match(face, new RegExp(`src: url\\("\\./fonts/${FILES[key]}"\\) format\\("woff2"\\);`), key);
    // Georgia draws the page until the file arrives, and nothing waits for it.
    assert.match(face, /font-display: swap;/);
    // Georgia's line box (2.05: ascent 1878, descent 449 of 2048), so the swap moves no baseline.
    assert.match(face, /ascent-override: 91\.7%;/);
    assert.match(face, /descent-override: 21\.92%;/);
    assert.match(face, /line-gap-override: 0%;/);
  }
  for (const file of Object.values(FILES)) {
    const bytes = await readFile(new URL(`src/fonts/${file}`, root));
    assert.equal(bytes.toString('latin1', 0, 4), 'wOF2', file);
    assert.ok((await stat(new URL(`src/fonts/${file}`, root))).size < 24 * 1024, `${file} stays small`);
    assert.ok(build.includes(`'src/fonts/${file}'`), `${file} is assembled into the release`);
  }
  assert.ok(build.includes("'src/fonts/OFL-Gelasio.txt'"));
  const licence = await readFile(new URL('src/fonts/OFL-Gelasio.txt', root), 'utf8');
  assert.match(licence, /^Copyright 2022 The Gelasio Project Authors \(https:\/\/github\.com\/SorkinType\/Gelasio\)\n/);
  assert.match(licence, /SIL Open Font License, Version 1\.1/);
  // No Reserved Font Name is declared, so the subsets may keep the name.
  assert.doesNotMatch(licence.split('\n')[0], /Reserved Font Name/);
});

test('each Gelasio file draws every Spanish character, every English sentence and the pseudo-language, and no Devanagari or Bangla', async () => {
  const sentences = Object.values(english).join(' ');
  const pseudo = Object.values(pseudoMessages(english)).join(' ');
  for (const face of faces) {
    const file = face.match(/fonts\/([\w-]+\.woff2)/)[1];
    const mapped = await drawn(file);
    assert.deepEqual(missing(mapped, SPANISH), [], `${file}: Spanish`);
    assert.deepEqual(missing(mapped, sentences), [], `${file}: every English sentence`);
    assert.deepEqual(missing(mapped, pseudo), [], `${file}: the pseudo-language`);
    assert.ok(mapped.has(0x20B9), `${file} draws ₹, so an English price never fetches the Hindi file`);
    assert.equal([...mapped].some((code) => code >= 0x0900 && code <= 0x09FF), false, `${file} draws no Devanagari or Bangla`);
    // The face claims only what the file draws, and the file draws nothing it doesn't claim.
    const claims = rangeOf(face);
    assert.deepEqual([...mapped].filter((code) => !claims(code)).map((code) => code.toString(16)), [], `${file}: every character it draws is in its unicode-range`);
    for (const character of SPANISH + '₹') assert.ok(claims(character.codePointAt(0)), `${file} claims ${character}`);
  }
});

test('every serif stack is Gelasio, then Georgia, then the Hindi and Bengali serif, then serif', () => {
  // Every font-family that names a serif, but not the family each @font-face rule declares.
  const stacks = [...css.matchAll(/font-family: ([^;]*(?:Gelasio|Georgia|serif-scripts)[^;]*);/g)].map(([, stack]) => stack).filter((stack) => stack.includes(','));
  assert.equal(stacks.length, 18);
  for (const stack of stacks) assert.equal(stack, 'Gelasio, Georgia, var(--serif-scripts), serif');
  assert.match(css, /:root \{[^}]*font-synthesis: none;/, 'the browser never fakes a bold or an italic');
});

test('the serif is never asked for 500: every rule that sets it, or sits inside a serif heading, asks for 400 or 700', () => {
  // Georgia had no 500 and always drew these at 400; Gelasio's files have no 500 either, so 400 is
  // what they are drawn at, written as what it is (CLAUDE.md, Design system).
  const rules = [...css.matchAll(/^([^{}@/\n][^{}\n]*)\{([^}]*)\}/gm)].map(([, selector, body]) => ({ selector: selector.trim(), body }));
  const serif = rules.filter(({ selector, body }) => body.includes('font-family: Gelasio') || /(^|,\s*)(\.welcome )?h[12] em\b/.test(selector));
  assert.ok(serif.length >= 20);
  for (const { selector, body } of serif) {
    const weight = body.match(/font-weight: (\d+)/);
    if (weight) assert.ok(['400', '700'].includes(weight[1]), `${selector} asks for ${weight[1]}`);
  }
});

test('the app asks for the Regular file with its stylesheet, from its own address', async () => {
  const index = await readFile(new URL('index.html', root), 'utf8');
  assert.match(index, /<link rel="preload" href="\.\/src\/fonts\/gelasio-latin\.woff2" as="font" type="font\/woff2" crossorigin="anonymous" \/>/);
  assert.equal(index.match(/as="font"/g).length, 1, 'only the Regular is preloaded');
});
