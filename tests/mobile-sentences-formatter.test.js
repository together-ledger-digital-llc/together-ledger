import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { setFormatter, formatter } from '../apps/mobile/src/i18n/sentences.js';

test('formatter() returns null by default, returns what setFormatter() was given, and is null again after setFormatter(null)', () => {
  assert.equal(formatter(), null, 'formatter() is null by default');

  const fakeFormatter = { number: () => '123' };
  setFormatter(fakeFormatter);
  assert.equal(formatter(), fakeFormatter, 'formatter() returns what setFormatter() was given');

  setFormatter(null);
  assert.equal(formatter(), null, 'formatter() is null again after setFormatter(null)');
});
