// tests/fixtures/keyboard-walk.js

/**
 * Presses Tab to walk through focusable elements on the page.
 * Stops when focus returns to an already visited element or maxSteps is reached.
 * Returns an array of objects representing the visited elements.
 */
export async function keyboardWalk(page, { maxSteps = 80 } = {}) {
  // Start from the top by blurring any active element and resetting our visited set
  await page.evaluate(() => {
    if (document.activeElement) {
      document.activeElement.blur();
    }
    window.__keyboardWalkVisited = new Set();
  });

  const visited = [];

  for (let i = 0; i < maxSteps; i++) {
    await page.keyboard.press('Tab');

    const result = await page.evaluate(() => {
      const el = document.activeElement;
      // Stop if focus leaves the document or stays on the body
      if (!el || el === document.body || el === document.documentElement) {
        return null;
      }

      // Stop if we've cycled back to an already visited element
      if (window.__keyboardWalkVisited.has(el)) {
        return { loop: true };
      }
      window.__keyboardWalkVisited.add(el);

      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);

      return {
        tag: el.tagName.toLowerCase(),
        name: el.getAttribute('aria-label') || (el.textContent || '').trim(),
        visible: rect.width > 0 && rect.height > 0,
        ring: style.outlineStyle !== 'none' || style.boxShadow !== 'none'
      };
    });

    if (!result || result.loop) {
      break;
    }

    visited.push({
      tag: result.tag,
      name: result.name,
      visible: result.visible,
      ring: result.ring
    });
  }

  // Cleanup the global state
  await page.evaluate(() => {
    delete window.__keyboardWalkVisited;
  });

  return visited;
}
