import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { cmapCharacters, sfntTable } from './fixtures/font-tables.js';
import { samples } from './fixtures/script-samples.js';

// The Hindi and Bengali serif (docs/2026-10-12-devanagari-bangla-font-decision.md): which script
// each language is set in, how the phone sets it, which files it loads, and what each bundled font
// can draw, read from the font files themselves.

const root = new URL('../', import.meta.url);
const themeDir = new URL('apps/mobile/src/theme/', root);
const manifest = JSON.parse(await readFile(new URL('locales/languages.json', root), 'utf8'));
const fontsDir = new URL('node_modules/@expo-google-fonts/', root);

async function importTypeScript(name) {
  const source = await readFile(new URL(name, themeDir), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

// Every character a TrueType file maps, from its cmap.
async function characters(path) {
  return cmapCharacters(sfntTable(await readFile(new URL(path, fontsDir)), 'cmap'));
}

const missing = (mapped, text) => [...new Set([...text].filter((character) => /\S/.test(character) && !mapped.has(character.codePointAt(0))))];

const SPANISH = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ñÑáéíóúüÁÉÍÓÚÜ¿¡«»“”‘’—–…€$.,;:!?()';
const GELASIO = ['gelasio/400Regular/Gelasio_400Regular.ttf', 'gelasio/400Regular_Italic/Gelasio_400Regular_Italic.ttf', 'gelasio/700Bold/Gelasio_700Bold.ttf'];
const TIRO = { hi: 'tiro-devanagari-hindi/400Regular/TiroDevanagariHindi_400Regular.ttf', bn: 'tiro-bangla/400Regular/TiroBangla_400Regular.ttf' };
const sampleText = (sample) => Object.entries(sample).filter(([key]) => key !== 'lang').flatMap(([, value]) => value).join(' ');

test('each language is set in its own script: Hindi in Devanagari, Bengali in Bangla, the rest in Latin', async () => {
  const { scriptOf } = await importTypeScript('scripts.ts');
  assert.deepEqual(Object.fromEntries(manifest.languages.map(({ tag }) => [tag, scriptOf(tag)])), {
    en: 'Latn', hi: 'Deva', bn: 'Beng', 'es-419': 'Latn', 'hi-Latn': 'Latn',
  });
  assert.equal(scriptOf('bn-BD'), 'Beng');
  assert.equal(scriptOf('hi-IN'), 'Deva');
  assert.equal(scriptOf('hi-Deva-IN'), 'Deva');
});

test('the phone never tracks Devanagari or Bangla, and gives their marks room above and below', async () => {
  const { leadingFor, trackingFor, MIN_LEADING } = await importTypeScript('scripts.ts');
  assert.deepEqual(MIN_LEADING, { Latn: 0, Deva: 1.35, Beng: 1.3 });
  // Latin keeps every style exactly as it was.
  assert.equal(leadingFor('Latn', 40, 44), 44);
  assert.equal(trackingFor('Latn', 1.9), 1.9);
  // The welcome headline, 40 on 44 in Latin.
  assert.equal(leadingFor('Deva', 40, 44), 54);
  assert.equal(leadingFor('Beng', 40, 44), 52);
  // A style already roomy enough keeps its own line height.
  assert.equal(leadingFor('Beng', 16, 25), 25);
  assert.equal(trackingFor('Deva', 1.9), 0);
  assert.equal(trackingFor('Beng', 0.8), 0);
});

test('the phone loads Gelasio always and a script\'s serif only in a language written in it', async () => {
  const fonts = await readFile(new URL('fonts.ts', themeDir), 'utf8');
  assert.match(fonts, /export const fontSources = \{ Gelasio_400Regular, Gelasio_400Regular_Italic, Gelasio_700Bold, \.\.\.scriptSources\[script\] \}/);
  assert.match(fonts, /Latn: \{\},\s+Deva: \{ TiroDevanagariHindi_400Regular \},\s+Beng: \{ TiroBangla_400Regular \},/);
  // Only the Regular of each: the faces have no 500, and no italic is shipped for either script.
  assert.deepEqual(fonts.match(/@expo-google-fonts\/tiro-[\w-]+(\/\w+)?/g), ['@expo-google-fonts/tiro-bangla/400Regular', '@expo-google-fonts/tiro-devanagari-hindi/400Regular']);
  assert.doesNotMatch(fonts, /_500|Italic.*Tiro|Tiro\w*Italic/);
});

test('Gelasio draws every Spanish character on the phone, and no Devanagari or Bangla', async () => {
  for (const file of GELASIO) {
    const mapped = await characters(file);
    assert.deepEqual(missing(mapped, SPANISH), [], file);
    assert.deepEqual(missing(mapped, sampleText(samples.hi)).length > 0, true, `${file} draws no Devanagari`);
    assert.equal([...mapped].some((code) => code >= 0x0900 && code <= 0x09FF), false, file);
  }
});

test('each Tiro face draws its whole script, every sample, and the Latin a heading may carry beside it', async () => {
  for (const [lang, file] of Object.entries(TIRO)) {
    const mapped = await characters(file);
    const block = lang === 'hi' ? [0x0900, 0x097F] : [0x0980, 0x09FE];
    const assigned = lang === 'hi'
      ? Array.from({ length: block[1] - block[0] + 1 }, (_, index) => block[0] + index)
      // Bangla's block has unassigned code points; these are the ones Unicode 15 assigns.
      : [...new Set([0x0980, 0x0981, 0x0982, 0x0983, ...range(0x0985, 0x098C), 0x098F, 0x0990, ...range(0x0993, 0x09A8), ...range(0x09AA, 0x09B0), 0x09B2, ...range(0x09B6, 0x09B9), ...range(0x09BC, 0x09C4), 0x09C7, 0x09C8, ...range(0x09CB, 0x09CE), 0x09D7, 0x09DC, 0x09DD, ...range(0x09DF, 0x09E3), ...range(0x09E6, 0x09FE)])];
    assert.deepEqual(assigned.filter((code) => !mapped.has(code)).map((code) => code.toString(16)), [], `${file} covers its block`);
    assert.deepEqual(missing(mapped, sampleText(samples[lang])), [], `${file} draws the ${lang} samples`);
    // On the phone a Hindi or Bengali heading is one font, so a Latin name in it is drawn by Tiro.
    assert.deepEqual(missing(mapped, SPANISH), [], `${file} draws Latin and Spanish`);
    // The danda ends a Bengali sentence too, and lives in the Devanagari block.
    assert.ok(mapped.has(0x0964) && mapped.has(0x0965), `${file} draws । and ॥`);
  }
});

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

test('the web ships each script as one small self-hosted file, with its licence, and fetches nothing else', async () => {
  const css = await readFile(new URL('src/styles.css', root), 'utf8');
  const build = await readFile(new URL('scripts/build-public-site.mjs', root), 'utf8');
  const faces = [...css.matchAll(/@font-face \{([^}]*)\}/g)].map(([, body]) => body).filter((body) => body.includes('font-family: "Tiro'));
  assert.equal(faces.length, 2);
  for (const face of faces) {
    const file = face.match(/src: url\("\.\/(fonts\/[\w-]+\.woff2)"\)/)[1];
    const bytes = await readFile(new URL(`src/${file}`, root));
    assert.equal(bytes.toString('latin1', 0, 4), 'wOF2', file);
    assert.ok((await stat(new URL(`src/${file}`, root))).size < 70 * 1024, `${file} stays small`);
    assert.match(face, /font-weight: 400;/);
    assert.match(face, /font-style: normal;/);
    // A unicode-range that excludes Latin is what keeps the file from loading for English or Spanish.
    assert.match(face, /unicode-range: U\+(0900|0951)/);
    assert.doesNotMatch(face, /U\+0000|U\+00[0-9A-F]{2}-|U\+0100/);
    assert.ok(build.includes(`'src/${file}'`), `${file} is assembled into the release`);
  }
  assert.ok(build.includes("'src/fonts/OFL-Tiro.txt'"));
  assert.match(await readFile(new URL('src/fonts/OFL-Tiro.txt', root), 'utf8'), /SIL Open Font License, Version 1\.1/);
  assert.doesNotMatch(css, /fonts\.(googleapis|gstatic)\.com|@import/, 'nothing fetched from a CDN at runtime');
  // Every serif stack puts the scripts after Gelasio and Georgia, which draw only Latin.
  assert.equal(css.match(/font-family: Gelasio, Georgia, var\(--serif-scripts\), serif;/g).length, 18);
  assert.doesNotMatch(css, /font-family: (?!Gelasio, Georgia, )[^;]*var\(--serif-scripts\)/);
});
