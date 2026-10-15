import { test, expect } from './browser-test.js';

test('reduced motion turns off scroll behavior and button transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  // Expect the computed scroll-behavior of document.documentElement to be 'auto'
  const scrollBehavior = await page.evaluate(() => {
    return window.getComputedStyle(document.documentElement).scrollBehavior;
  });
  expect(scrollBehavior).toBe('auto');

  // Find the first visible .button
  const button = page.locator('.button').first();
  await expect(button).toBeVisible();

  // Expect its computed transition-duration to be '0s'
  const transitionDuration = await button.evaluate((node) => {
    return window.getComputedStyle(node).transitionDuration;
  });
  expect(transitionDuration).toBe('0s');

  // After hovering that .button, its computed transform to be 'none'
  await button.hover();
  const transform = await button.evaluate((node) => {
    return window.getComputedStyle(node).transform;
  });
  expect(transform).toBe('none');
});

test('no-preference motion loads the page and the button is visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');

  // Ensure the page loads and the same .button is visible
  const button = page.locator('.button').first();
  await expect(button).toBeVisible();
});
