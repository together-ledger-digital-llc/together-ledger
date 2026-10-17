import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { english } from './fixtures/web-english.js';

const mobile = new URL('../apps/mobile/', import.meta.url);

async function importMobile(path) {
  const url = new URL(path, mobile);
  const source = await readFile(url, 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  const linked = outputText.replace(/from '(\.[^']+\.js)'/g, (_, specifier) => `from '${new URL(specifier, url).href}'`);
  return import(`data:text/javascript;base64,${Buffer.from(linked).toString('base64')}`);
}

const { showPasswordButton } = await importMobile('src/a11y/show-password.ts');

test('showPasswordButton returns secure true with Show password when not shown', () => {
  const result = showPasswordButton(false);
  assert.equal(result.secure, true);
  assert.equal(result.labelKey, 'common.password.show');
  assert.equal(result.label, english['common.password.show']);
});

test('showPasswordButton returns secure false with Hide password when shown', () => {
  const result = showPasswordButton(true);
  assert.equal(result.secure, false);
  assert.equal(result.labelKey, 'common.password.hide');
  assert.equal(result.label, english['common.password.hide']);
});
