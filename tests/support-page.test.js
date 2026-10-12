import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { renderSupportPage } from '../scripts/render-privacy-page.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const support = read('SUPPORT.md');
// The phone's sentences live in English's translation file (docs/TRANSLATION.md); a screen names their keys.
const english = JSON.parse(read('locales/en.json'));
const says = (source, key, words) => source.includes(`t('${key}')`) && english[key] === words;

test('the /support page carries every section in SUPPORT.md', () => {
  const page = renderSupportPage(support);
  const sections = [...support.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
  assert.ok(sections.length > 0);
  for (const section of sections) assert.ok(page.includes(`<h2>${section}</h2>`), `missing section ${section}`);
  assert.ok(page.includes('<h1>Support</h1>'));
  assert.ok(page.includes('<link rel="canonical" href="https://app.together-ledger.com/support" />'));
  assert.ok(page.includes('ledger-support@together-ledger.com'));
  assert.ok(page.includes('<a href="./privacy">Privacy policy</a>'));
});

// Every step the page tells someone to take is one the app really offers (owner, Oct 8: the
// support URL on both stores is this page).
test('the support page only describes steps the web and the phone really have', () => {
  const web = read('index.html');
  const account = read('apps/mobile/app/account.tsx');
  const settings = read('apps/mobile/app/settings.tsx');
  const deletion = read('apps/mobile/app/delete-account.tsx');
  const offers = read('apps/mobile/src/components/store-offers.tsx');

  assert.ok(support.includes('I forgot my password'));
  assert.ok(web.includes('I forgot my password') && says(account, 'common.account.forgotPassword', 'I forgot my password'));

  assert.ok(support.includes('choose Restore purchases in the app\'s Settings'));
  assert.ok(settings.includes('<RestorePurchases key="restore" row />') && says(offers, 'mobile.store.restore', 'Restore purchases'));

  assert.ok(support.includes('open Settings, then Delete account'));
  assert.ok(settings.includes("label={t('common.account.delete')}") && english['common.account.delete'] === 'Delete account');
  assert.ok(support.includes('open Account settings, then Delete account'));
  assert.ok(read('src/app.js').includes("signedIn ? 'Account settings'"), 'the signed-in web button reads Account settings');
  assert.ok(web.includes('<h3>Delete account</h3>'));
  assert.ok(support.includes('typing DELETE'));
  assert.ok(web.includes('Type DELETE') && deletion.includes('label="Type DELETE"'));

  // The recovery link's lifetime is the one PRIVACY.md promises.
  assert.ok(support.includes('lasts 30 minutes'));
  assert.ok(read('PRIVACY.md').includes('Email links for verification and recovery expire after 30 minutes'));
});
