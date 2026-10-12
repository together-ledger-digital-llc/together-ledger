import { test, expect } from './browser-test.js';
import { samples, setInScript } from './fixtures/script-samples.js';

// Hindi and Bengali headings in the web's serif (docs/2026-10-12-devanagari-bangla-font-decision.md).
// Georgia draws neither script, so each has a self-hosted Tiro face after it in every serif stack,
// fetched only when its script is on the page. Set in sample text (tests/fixtures/script-samples.js)
// until the translations exist, every screen is checked at a phone width and a desktop width: the
// right face draws the headings, nothing is tracked, the marks above and below the line have room,
// the serif renders at 400 when a rule asks for 500, nothing overflows, and no target that is 44px
// in English falls below 44px in the script.

const FACE = { hi: 'Tiro Devanagari Hindi', bn: 'Tiro Bangla' };
const FILE = { hi: 'tiro-devanagari-hindi-devanagari.woff2', bn: 'tiro-bangla-bengali.woff2' };
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

// The fonts Chromium drew a node's own text with, by family.
async function drawnWith(page, selector) {
  const client = await page.context().newCDPSession(page);
  await client.send('DOM.enable');
  await client.send('CSS.enable');
  const { root } = await client.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  const { fonts } = await client.send('CSS.getPlatformFontsForNode', { nodeId });
  await client.detach();
  return fonts.map((font) => font.familyName);
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

async function beginWithAMoment(page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Begin your ledger/ }).first().click();
  await page.locator('#moment-form [name="title"]').fill('A quiet evening');
  await page.getByRole('button', { name: 'Hold this moment' }).click();
  await expect(page.locator('.trip-bar')).toBeVisible();
  await expect(page.locator('#toast')).not.toHaveClass(/show/, { timeout: 4_000 });
}

test('English and Spanish never fetch the Hindi or Bengali serif, and it draws none of their letters', async ({ page }) => {
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
    const fonts = await drawnWith(page, selector);
    expect(fonts.some((family) => family.startsWith('Tiro')), `${selector} drawn with ${fonts}`).toBe(false);
  }
  expect(fetched).toEqual([]);
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
      expect([...new Set(fetched)], 'only this script\'s file').toEqual([FILE[lang]]);

      const set = await page.evaluate(() => [...document.querySelectorAll('h1, h2, h3, .welcome-eyebrow')].filter((element) => element.getClientRects().length).map((element) => {
        const style = getComputedStyle(element);
        return { tag: element.tagName, letterSpacing: style.letterSpacing, ratio: parseFloat(style.lineHeight) / parseFloat(style.fontSize), serif: style.fontFamily.startsWith('Georgia') };
      }));
      for (const element of set) {
        expect(element.letterSpacing, `${element.tag} is untracked`).toMatch(/^(normal|0px)$/);
        if (element.serif && element.tag !== 'P') expect(element.ratio, `${element.tag} line height`).toBeGreaterThanOrEqual(LEADING[lang] - 0.001);
      }

      // A rule asking for 500 gets the face's only weight, 400, unchanged: same widths, no faux bold.
      const widths = await page.evaluate(() => {
        const heading = document.querySelector('#welcome-title');
        const measure = (weight) => {
          const probe = document.createElement('span');
          probe.textContent = heading.textContent;
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
