import { test, expect } from './browser-test.js';
import { samples, setInScript } from './fixtures/script-samples.js';

// The web's serif, in every script it is written in. Latin is Gelasio, three self-hosted files
// (docs/2026-09-21-tl-m-02-font-decision.md, "The web half"), drawn at 400 or 700 and never faked.
// Hindi and Bengali headings (docs/2026-10-12-devanagari-bangla-font-decision.md): Gelasio and
// Georgia draw neither script, so each has a self-hosted Tiro face after them in every serif stack,
// fetched only when its script is on the page. Set in sample text (tests/fixtures/script-samples.js)
// until the translations exist, every screen is checked at a phone width and a desktop width: the
// right face draws the headings, nothing is tracked, the marks above and below the line have room,
// the serif renders at 400 when a rule asks for 500, nothing overflows, and no target that is 44px
// in English falls below 44px in the script.

const FACE = { hi: 'Tiro Devanagari Hindi', bn: 'Tiro Bangla' };
const FILE = { hi: 'tiro-devanagari-hindi-devanagari.woff2', bn: 'tiro-bangla-bengali.woff2' };
const GELASIO = ['gelasio-latin.woff2', 'gelasio-italic-latin.woff2', 'gelasio-bold-latin.woff2'];
const tiro = (fetched) => [...new Set(fetched.filter((file) => file.startsWith('tiro-')))];
const LEADING = { hi: 1.35, bn: 1.3 };
const WIDTHS = [320, 1280];

function watchFonts(page) {
  const fetched = [];
  page.on('request', (request) => { if (request.url().includes('/src/fonts/')) fetched.push(request.url().split('/').pop()); });
  return fetched;
}

async function inScript(page, lang, places) {
  await page.evaluate(({ sample, places, source }) => { new Function(`return ${source}`)()(sample, places); }, { sample: samples[lang], places, source: setInScript.toString() });
  await expect.poll(() => page.evaluate((family) => [...document.fonts].find((face) => face.family === family)?.status, FACE[lang])).toBe('loaded');
  await page.evaluate(() => document.fonts.ready);
}

// The fonts Chromium drew a node's own text with: each face's family, PostScript name and glyphs.
async function platformFonts(page, selector) {
  const client = await page.context().newCDPSession(page);
  await client.send('DOM.enable');
  await client.send('CSS.enable');
  const { root } = await client.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  const { fonts } = await client.send('CSS.getPlatformFontsForNode', { nodeId });
  await client.detach();
  return fonts;
}

// Each family once: Gelasio's Regular and Italic are both "Gelasio".
async function drawnWith(page, selector) {
  return [...new Set((await platformFonts(page, selector)).map((font) => font.familyName))];
}

// Everything tappable that is showing, in document order, so the same index names the same control
// before and after the text changes.
async function targets(page, scope) {
  return page.evaluate((scope) => {
    const root = scope ? document.querySelector(scope) : document;
    return [...root.querySelectorAll('button, a[href], select, input:not([type="hidden"]), textarea, summary, [role="button"]')].map((element) => {
      const box = element.getBoundingClientRect();
      const shown = box.width > 0 && box.height > 0 && getComputedStyle(element).visibility !== 'hidden';
      return { shown, name: element.outerHTML.slice(0, 80), width: Math.round(box.width), height: Math.round(box.height) };
    });
  }, scope);
}

function expectTargetsHeld(english, script, label) {
  expect(script.length, `${label}: the same controls`).toBe(english.length);
  english.forEach((before, index) => {
    if (!before.shown) return;
    const after = script[index];
    if (before.height >= 44) expect(after.height, `${label}: ${before.name} height`).toBeGreaterThanOrEqual(44);
    if (before.width >= 44) expect(after.width, `${label}: ${before.name} width`).toBeGreaterThanOrEqual(44);
  });
}

async function expectNoHorizontalOverflow(page, label) {
  const size = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(size.scrollWidth, `${label} has no horizontal overflow`).toBeLessThanOrEqual(size.clientWidth);
}

async function beginWithAMoment(page, address = '/') {
  await page.goto(address);
  await page.locator('[data-begin-ledger]:visible').first().click();
  await page.locator('#moment-form [name="title"]').fill('A quiet evening');
  await page.locator('#save-moment').click();
  await expect(page.locator('.trip-bar')).toBeVisible();
  await expect(page.locator('#toast')).not.toHaveClass(/show/, { timeout: 4_000 });
}

test('English and Spanish fetch only Gelasio, never the Hindi or Bengali serif, and Gelasio draws every letter', async ({ page }) => {
  const fetched = watchFonts(page);
  await beginWithAMoment(page);
  await page.getByRole('button', { name: 'Journey settings' }).click();
  await expect(page.locator('#settings-dialog')).toBeVisible();
  await page.keyboard.press('Escape');

  // Spanish: every accented letter and both inverted marks, in a serif heading and in interface text.
  await page.evaluate(() => {
    document.documentElement.lang = 'es-419';
    document.querySelector('#moments-title').textContent = '¿Qué guardó cada uno? ¡Año de mañanas! Él, ÁÉÍÓÚÜÑ «sí»';
    document.querySelector('.trip-bar strong').textContent = 'Nuestro viaje: añoranza, pingüino, corazón';
  });
  await page.evaluate(() => document.fonts.ready);
  for (const selector of ['#moments-title', '.trip-bar strong']) {
    expect(await drawnWith(page, selector), `${selector}: every letter in Gelasio, none in a fallback`).toEqual(['Gelasio']);
  }
  expect(tiro(fetched)).toEqual([]);
  expect(fetched.every((file) => GELASIO.includes(file)), `only Gelasio: ${fetched}`).toBe(true);
  // The Regular is preloaded and then used: one request for it, not two.
  expect(fetched.filter((file) => file === 'gelasio-latin.woff2')).toHaveLength(1);
});

// CSS :lang(hi) matches any tag that begins with hi, Hinglish's hi-Latn included. Hinglish is Latin
// script, so it keeps English's tracking and line height, and never needs a Tiro file.
test('Hinglish (hi-Latn) is set as Latin: tracked and spaced as English, and fetches no Tiro file', async ({ page }) => {
  const fetched = watchFonts(page);
  await page.goto('/');
  await expect(page.locator('#welcome-title')).toBeVisible();
  const read = () => page.evaluate(() => [...document.querySelectorAll('h1, h2, h3, .welcome-eyebrow, .eyebrow')].filter((element) => element.getClientRects().length).map((element) => {
    const style = getComputedStyle(element);
    return `${element.tagName}.${element.className} ${style.letterSpacing} ${style.lineHeight}`;
  }));
  const english = await read();
  await page.evaluate(() => {
    document.documentElement.lang = 'hi-Latn';
    document.querySelector('#welcome-title').textContent = 'Jo zaroori hai, use saath sambhaal kar rakhein.';
    document.querySelector('.welcome-eyebrow').textContent = 'Do logon ki saanjhi yatra';
  });
  await page.evaluate(() => document.fonts.ready);
  expect(await read()).toEqual(english);
  const title = await page.locator('#welcome-title').evaluate((element) => getComputedStyle(element).letterSpacing);
  expect(title, 'the heading keeps its Latin tracking').not.toMatch(/^(normal|0px)$/);
  expect(await drawnWith(page, '#welcome-title')).toEqual(['Gelasio']);
  expect(tiro(fetched)).toEqual([]);
});

for (const lang of ['hi', 'bn']) {
  for (const width of WIDTHS) {
    test(`${lang} at ${width}px: the welcome's headings are ${FACE[lang]}, untracked, with room for their marks`, async ({ page }) => {
      const fetched = watchFonts(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await expect(page.locator('#welcome-title')).toBeVisible();
      const english = await targets(page);
      await inScript(page, lang, { '#welcome-title': 'welcomeTitle', '.welcome-eyebrow': 'eyebrow' });

      expect(await drawnWith(page, '#welcome-title')).toContain(FACE[lang]);
      expect(await drawnWith(page, '#how-title')).toContain(FACE[lang]);
      expect(tiro(fetched), 'only this script\'s file').toEqual([FILE[lang]]);
      // Gelasio sits first in the stack, but draws none of the script: at most the heading's spaces,
      // digits and Latin punctuation, as Georgia did before it.
      for (const selector of ['#welcome-title', '#how-title']) {
        const latin = await page.locator(selector).evaluate((element) => [...element.textContent].filter((character) => character.codePointAt(0) <= 0x24F || (character >= '\u2000' && character <= '\u206F' && !/[\u200C\u200D]/.test(character))).length);
        const gelasio = (await platformFonts(page, selector)).filter((font) => font.familyName === 'Gelasio').reduce((sum, font) => sum + font.glyphCount, 0);
        expect(gelasio, `${selector}: Gelasio draws only its Latin`).toBeLessThanOrEqual(latin);
      }

      const set = await page.evaluate(() => [...document.querySelectorAll('h1, h2, h3, .welcome-eyebrow')].filter((element) => element.getClientRects().length).map((element) => {
        const style = getComputedStyle(element);
        return { tag: element.tagName, letterSpacing: style.letterSpacing, ratio: parseFloat(style.lineHeight) / parseFloat(style.fontSize), serif: style.fontFamily.startsWith('Gelasio') };
      }));
      for (const element of set) {
        expect(element.letterSpacing, `${element.tag} is untracked`).toMatch(/^(normal|0px)$/);
        if (element.serif && element.tag !== 'P') expect(element.ratio, `${element.tag} line height`).toBeGreaterThanOrEqual(LEADING[lang] - 0.001);
      }

      // A rule asking for 500 gets the face's only weight, 400, unchanged: same widths, no faux bold.
      // Only the script's own letters are measured: the spaces between them are Gelasio's, which
      // has a real Bold.
      const widths = await page.evaluate(() => {
        const heading = document.querySelector('#welcome-title');
        const measure = (weight) => {
          const probe = document.createElement('span');
          probe.textContent = [...heading.textContent].filter((character) => character >= '\u0900').join('');
          probe.style.cssText = `font-family: ${getComputedStyle(heading).fontFamily}; font-size: 40px; font-weight: ${weight}; white-space: nowrap; position: absolute; visibility: hidden`;
          heading.parentElement.append(probe);
          const result = probe.getBoundingClientRect().width;
          probe.remove();
          return result;
        };
        return { regular: measure(400), medium: measure(500), bold: measure(700) };
      });
      expect(widths.medium).toBe(widths.regular);
      expect(widths.bold).toBe(widths.regular);

      await expectNoHorizontalOverflow(page, `${lang} welcome at ${width}px`);
      expectTargetsHeld(english, await targets(page), `${lang} welcome at ${width}px`);
    });

    test(`${lang} at ${width}px: home, a moment, Settings and a consequence dialog hold their layout`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await beginWithAMoment(page);

      let english = await targets(page, 'main');
      await inScript(page, lang, { '.trip-bar strong': 'journey', '#moment-timeline .moment-card > strong': 'momentTitle' });
      expect(await drawnWith(page, '#moment-timeline .moment-card > strong')).toContain(FACE[lang]);
      expect(await drawnWith(page, '.trip-bar strong')).toContain(FACE[lang]);
      await expectNoHorizontalOverflow(page, `${lang} home at ${width}px`);
      expectTargetsHeld(english, await targets(page, 'main'), `${lang} home at ${width}px`);

      // Settings and the dialog it opens are read in English first, then set in the script.
      await page.evaluate(() => { document.documentElement.lang = 'en'; });
      await page.goto('/');
      await page.getByRole('button', { name: 'Journey settings' }).click();
      const settings = page.locator('#settings-dialog');
      await expect(settings).toBeVisible();
      english = await targets(page, '#settings-dialog');
      await inScript(page, lang, { '#settings-dialog .dialog-head h2': 'settingsTitle' });
      expect(await drawnWith(page, '#settings-dialog .dialog-head h2')).toContain(FACE[lang]);
      await expectNoHorizontalOverflow(page, `${lang} Settings at ${width}px`);
      expectTargetsHeld(english, await targets(page, '#settings-dialog'), `${lang} Settings at ${width}px`);

      await page.goto('/');
      await page.getByRole('button', { name: 'Journey settings' }).click();
      await settings.getByRole('button', { name: 'Start fresh' }).click();
      const dialog = page.locator('#consequence-dialog');
      await expect(dialog).toBeVisible();
      english = await targets(page, '#consequence-dialog');
      await inScript(page, lang, { '#consequence-dialog-title': 'dialogTitle', '#consequence-dialog-consequence': 'dialogConsequence' });
      expect(await drawnWith(page, '#consequence-dialog-title')).toContain(FACE[lang]);
      const title = await dialog.locator('#consequence-dialog-title').evaluate((element) => {
        const style = getComputedStyle(element);
        return { letterSpacing: style.letterSpacing, ratio: parseFloat(style.lineHeight) / parseFloat(style.fontSize) };
      });
      expect(title.letterSpacing).toMatch(/^(normal|0px)$/);
      expect(title.ratio).toBeGreaterThanOrEqual(LEADING[lang] - 0.001);
      await expectNoHorizontalOverflow(page, `${lang} consequence dialog at ${width}px`);
      expectTargetsHeld(english, await targets(page, '#consequence-dialog'), `${lang} consequence dialog at ${width}px`);
    });
  }
}

// Gelasio, the Latin serif. Its three files are Regular, Italic and Bold; every serif rule asks
// for 400 or 700, and font-synthesis: none means Chromium draws each element with one of those
// three files or with nothing faked at all.
const FACES = { 'normal 400': 'Gelasio-Regular', 'italic 400': 'Gelasio-Italic', 'normal 700': 'Gelasio-Bold' };

async function serifElements(page, scope = 'body') {
  return page.evaluate((scope) => [...document.querySelector(scope).querySelectorAll('*')].filter((element) => {
    const own = [...element.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim());
    return own && element.getClientRects().length && getComputedStyle(element).fontFamily.startsWith('Gelasio');
  }).map((element) => {
    const style = getComputedStyle(element);
    return { name: `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`, face: `${style.fontStyle} ${style.fontWeight}`, synthesis: style.fontSynthesis };
  }), scope);
}

test('Gelasio draws every serif element in its own Regular, Italic or Bold, at 400 or 700, never faked', async ({ page }) => {
  const fetched = watchFonts(page);
  await page.goto('/');
  await expect(page.locator('#welcome-title')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const drawnAs = async (selector) => (await platformFonts(page, selector)).map((font) => font.postScriptName);
  // A node's fonts include its descendants': the heading is Regular, its em the Italic.
  expect((await drawnAs('#welcome-title')).sort()).toEqual(['Gelasio-Italic', 'Gelasio-Regular']);
  expect(await drawnAs('#welcome-title em'), 'h1 em is the real italic').toEqual(['Gelasio-Italic']);
  expect(await drawnAs('.site-header .brand strong'), 'the brand is the real bold').toEqual(['Gelasio-Bold']);
  const seen = await serifElements(page);

  await beginWithAMoment(page);
  await page.evaluate(() => document.fonts.ready);
  expect(await drawnAs('#moment-timeline .moment-card > strong')).toEqual(['Gelasio-Regular']);
  expect(await drawnAs('.trip-bar strong')).toEqual(['Gelasio-Bold']);
  seen.push(...await serifElements(page));
  await page.getByRole('button', { name: 'Journey settings' }).click();
  await expect(page.locator('#settings-dialog')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await drawnAs('#settings-dialog .dialog-head h2')).toEqual(['Gelasio-Regular']);
  expect(await drawnAs('#settings-dialog .dialog-signature span:last-child'), '.dialog-signature asks for 700').toEqual(['Gelasio-Bold']);
  seen.push(...await serifElements(page, '#settings-dialog'));

  expect(seen.length).toBeGreaterThan(20);
  for (const element of seen) {
    expect(Object.keys(FACES), `${element.name} asks for ${element.face}`).toContain(element.face);
    expect(element.synthesis, element.name).toBe('none');
  }
  expect([...new Set(fetched)].sort()).toEqual([...GELASIO].sort());
});

test('a rule asking Gelasio for 500 draws exactly its 400, and one asking for 600 its 700', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const widths = await page.evaluate(async () => {
    const measure = (weight, style = 'normal') => {
      const probe = document.createElement('span');
      probe.textContent = 'Keep what matters, together. 2026';
      probe.style.cssText = `font-family: Gelasio; font-size: 40px; font-weight: ${weight}; font-style: ${style}; white-space: nowrap; position: absolute; visibility: hidden`;
      document.body.append(probe);
      const result = probe.getBoundingClientRect().width;
      probe.remove();
      return result;
    };
    await document.fonts.load('700 40px Gelasio');
    await document.fonts.load('italic 400 40px Gelasio');
    return { regular: measure(400), medium: measure(500), semibold: measure(600), bold: measure(700), italic: measure(400, 'italic'), mediumItalic: measure(500, 'italic') };
  });
  // Measured in Gelasio's own three faces, not in a fallback that has no 500 either.
  expect(await page.evaluate(() => [...document.fonts].filter((face) => face.family === 'Gelasio' && face.status === 'loaded').map((face) => `${face.style} ${face.weight}`).sort())).toEqual(['italic 400', 'normal 400', 'normal 700']);
  expect(widths.bold, 'the Bold is a different face').not.toBe(widths.regular);
  expect(widths.medium).toBe(widths.regular);
  expect(widths.semibold).toBe(widths.bold);
  expect(widths.mediumItalic).toBe(widths.italic);
});

// Gelasio against the same page with its files refused, so the fallback draws it: the change of face
// takes no target below 44px and makes nothing scroll sideways, in English and in the
// pseudo-language, whose accented letters (Latin Extended-A) Gelasio draws too.
for (const [language, address] of [['English', '/'], ['the pseudo-language', '/?pseudo']]) {
  test(`at 320px in ${language}, Gelasio keeps every 44px target and adds no sideways scroll`, async ({ browser }) => {
    const screens = async (blocked) => {
      const context = await browser.newContext({ viewport: { width: 320, height: 800 } });
      const page = await context.newPage();
      await page.route(/^https?:\/\/(?:[a-z0-9-]+\.)*together-ledger\.com(?:[:/]|$)/i, (route) => route.abort('internetdisconnected'));
      if (blocked) await page.route('**/src/fonts/gelasio-*', (route) => route.abort());
      const fetched = watchFonts(page);
      const found = {};
      await page.goto(address);
      await expect(page.locator('#welcome-title')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      if (!blocked) expect(await drawnWith(page, '#welcome-title'), 'every letter in Gelasio').toEqual(['Gelasio']);
      found.welcome = { targets: await targets(page), overflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) };
      await beginWithAMoment(page, address);
      await page.evaluate(() => document.fonts.ready);
      if (!blocked) expect(await drawnWith(page, '#moments-title')).toEqual(['Gelasio']);
      found.home = { targets: await targets(page, 'main'), overflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) };
      await page.locator('#settings-button').click();
      await expect(page.locator('#settings-dialog')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      found.settings = { targets: await targets(page, '#settings-dialog'), overflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) };
      await page.locator('#reset-button').click();
      await expect(page.locator('#consequence-dialog')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      if (!blocked) expect(await drawnWith(page, '#consequence-dialog-title')).toEqual(['Gelasio']);
      found.dialog = { targets: await targets(page, '#consequence-dialog'), overflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) };
      if (!blocked) expect(fetched.filter((file) => file.startsWith('gelasio-')).length).toBeGreaterThan(0);
      await context.close();
      return found;
    };
    const fallback = await screens(true);
    const gelasio = await screens(false);
    for (const screen of Object.keys(gelasio)) {
      expect(gelasio[screen].overflow, `${language} ${screen} scrolls sideways`).toBeLessThanOrEqual(0);
      expectTargetsHeld(fallback[screen].targets, gelasio[screen].targets, `${language} ${screen} at 320px`);
    }
  });
}
