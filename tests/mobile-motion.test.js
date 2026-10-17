import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Read the phone's module text, turn it into CommonJS by replacing `export function` with
// `exports.function = function`, and evaluate it.
const modulePath = join(process.cwd(), 'apps/mobile/src/a11y/motion.ts');
const moduleCode = readFileSync(modulePath, 'utf8')
  .replace(/export function/g, 'exports.modalAnimation = function')
  .replace(/: boolean/g, '')
  .replace(/: 'none' \| 'fade'/g, '');

const view = {};
new Function('exports', moduleCode)(view);

test('modalAnimation respects the reduceMotion setting', () => {
  assert.equal(view.modalAnimation(true), 'none', 'when reduceMotion is true, animation is none');
  assert.equal(view.modalAnimation(false), 'fade', 'when reduceMotion is false, animation is fade');
});
