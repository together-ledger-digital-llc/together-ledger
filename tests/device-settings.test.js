import { test, mock } from 'node:test';
import assert from 'node:assert';
import { prefersReducedMotion, prefersMoreContrast, onDeviceSettingsChange } from '../src/a11y/device-settings/device-settings.js';

test('device-settings returns false when matchMedia is missing', () => {
  const originalMatchMedia = globalThis.matchMedia;
  globalThis.matchMedia = undefined;

  assert.strictEqual(prefersReducedMotion(), false);
  assert.strictEqual(prefersMoreContrast(), false);

  const remove = onDeviceSettingsChange(() => {});
  remove();

  globalThis.matchMedia = originalMatchMedia;
});

test('device-settings reads true and false correctly', () => {
  const originalMatchMedia = globalThis.matchMedia;

  globalThis.matchMedia = (query) => {
    return {
      matches: query === '(prefers-reduced-motion: reduce)',
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  };

  assert.strictEqual(prefersReducedMotion(), true);
  assert.strictEqual(prefersMoreContrast(), false);

  globalThis.matchMedia = originalMatchMedia;
});

test('device-settings listens and removes listeners', () => {
  const originalMatchMedia = globalThis.matchMedia;

  let motionListener, contrastListener;
  let motionRemoved = false, contrastRemoved = false;

  globalThis.matchMedia = (query) => {
    return {
      matches: false,
      addEventListener: (type, listener) => {
        if (query.includes('motion')) motionListener = listener;
        if (query.includes('contrast')) contrastListener = listener;
      },
      removeEventListener: (type, listener) => {
        if (query.includes('motion') && listener === motionListener) motionRemoved = true;
        if (query.includes('contrast') && listener === contrastListener) contrastRemoved = true;
      },
    };
  };

  let calls = 0;
  const remove = onDeviceSettingsChange(() => { calls++; });

  assert.ok(motionListener);
  assert.ok(contrastListener);

  motionListener();
  assert.strictEqual(calls, 1);

  contrastListener();
  assert.strictEqual(calls, 2);

  remove();
  assert.strictEqual(motionRemoved, true);
  assert.strictEqual(contrastRemoved, true);

  globalThis.matchMedia = originalMatchMedia;
});
