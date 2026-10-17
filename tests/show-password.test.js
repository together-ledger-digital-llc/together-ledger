import assert from 'node:assert/strict';
import test from 'node:test';

import { showPassword } from '../src/a11y/show-password/show-password.js';

function createMockDOM() {
  const listeners = [];
  const classList = { toggle: () => {}, add: () => {}, remove: () => {} };

  const button = {
    type: 'button',
    className: '',
    innerHTML: '',
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    getAttribute(name) { return this.attributes[name]; },
    addEventListener(name, fn) { listeners.push({name, fn}); },
    click() { listeners.find(l => l.name === 'click')?.fn(); }
  };

  const container = {
    className: '',
    children: [],
    appendChild(child) { this.children.push(child); }
  };

  const formListeners = [];
  const form = {
    addEventListener(name, fn) { formListeners.push({name, fn}); },
    submit() { formListeners.find(l => l.name === 'submit')?.fn(); }
  };

  const input = {
    type: 'password',
    form: form,
    parentNode: {
      insertBefore: () => {}
    },
    closest: () => null
  };

  const document = {
    createElement(tag) {
      if (tag === 'div') return container;
      if (tag === 'button') return button;
    }
  };

  const windowListeners = [];
  const window = {
    addEventListener(name, fn) { windowListeners.push({name, fn}); },
    pagehide() { windowListeners.find(l => l.name === 'pagehide')?.fn(); }
  };

  global.document = document;
  global.window = window;

  return { input, button, form, window, document };
}

test('showPassword toggle type and accessible name', () => {
  const { input, button } = createMockDOM();
  const t = (key) => key === 'common.password.show' ? 'Show password' : 'Hide password';

  showPassword(input, t);

  assert.equal(input.type, 'password');
  assert.equal(button.getAttribute('aria-pressed'), undefined);
  assert.equal(button.getAttribute('aria-label'), 'Show password');
  assert.equal(button.getAttribute('data-i18n-aria-label'), 'common.password.show');

  // Toggle to text
  button.click();
  assert.equal(input.type, 'text');
  assert.equal(button.getAttribute('aria-pressed'), undefined);
  assert.equal(button.getAttribute('aria-label'), 'Hide password');
  assert.equal(button.getAttribute('data-i18n-aria-label'), 'common.password.hide');

  // Toggle back to password
  button.click();
  assert.equal(input.type, 'password');
  assert.equal(button.getAttribute('aria-pressed'), undefined);
  assert.equal(button.getAttribute('aria-label'), 'Show password');
  assert.equal(button.getAttribute('data-i18n-aria-label'), 'common.password.show');
});

test('showPassword hides on form submit and pagehide', () => {
  const { input, button, form, window } = createMockDOM();
  const t = (key) => key === 'common.password.show' ? 'Show password' : 'Hide password';

  showPassword(input, t);

  // Show it
  button.click();
  assert.equal(input.type, 'text');

  // Submit form
  form.submit();
  assert.equal(input.type, 'password');

  // Show it again
  button.click();
  assert.equal(input.type, 'text');

  // pagehide
  window.pagehide();
  assert.equal(input.type, 'password');
});
