// The Language preference on the account (101B, migration 038).
//
// Proved through the route, from a browser (a cookie and its CSRF value) and from a phone (a
// bearer token): a choice is the signed-in person's own and nobody else's, only an approved
// language can be chosen, "Follow my device" is kept apart from a language chosen by hand, and a
// choice made on a device before signing in never overwrites one the account already holds. The
// same checks against real PostgreSQL are in tests/postgres-integration.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { newDb } from 'pg-mem';
import { buildApp } from '../server/app.js';
import { loadConfig } from '../server/config.js';
import { MemoryMailer } from '../server/mailer.js';
import { PlatformService } from '../server/platform.js';

const origin = 'http://127.0.0.1:4174';
const PASSWORD = 'correct horse battery staple';
const SIGNED_OUT = { error: { code: 'authentication_required', message: 'Sign in to continue.' } };
const NOT_OFFERED = { error: { code: 'invalid_input', message: 'Choose one of the languages offered, or Follow my device.' } };

const MIGRATIONS = [
  '001_platform.sql', '003_private_usernames.sql', '004_shared_moments.sql', '005_make-shared-journeys-more-humane.sql',
  '006_expand-shared-moment-vocabulary.sql', '007_person_specific_moment_visibility.sql', '008_stripe_web_billing.sql',
  '009_reserve-group-places.sql', '011_hold-one-image-with-each-moment.sql', '012_bill-additional-moment-images.sql',
  '013_name-moment-image-attachments.sql', '014_hold-places-with-shared-moments.sql', '015_bill-additional-moment-places.sql',
  '016_make-extra-image-payments-one-time.sql', '017_keep-one-removed-photo-per-moment.sql', '018_allow-ninety-nine-paid-journey-places.sql',
  '019_let-moments-carry-their-own-atmosphere.sql', '020_let-entitlements-hold-ninety-nine-places.sql',
  '021_let-unpaid-capacity-rest-without-losing-history.sql', '022_agree-together-before-adding-someone.sql',
  '023_let-a-phone-carry-its-own-key.sql', '024_let-google-and-apple-open-an-account.sql',
  '025_revoke-sign-in-with-apple-when-an-account-is-deleted.sql', '026_remember-a-refused-apple-deletion.sql',
  '027_tie-every-store-purchase-to-an-account.sql', '028_turn-a-store-purchase-into-capacity.sql',
  '029_rest-read-only-and-let-the-payer-ask-for-time.sql', '031_let-a-lost-renewal-reply-be-asked-again.sql',
  '032_let-an-invitation-last-fourteen-days.sql', '033_let-a-moment-held-offline-arrive-once.sql',
  '038_remember-the-language-a-person-chose.sql',
];

const realManifest = JSON.parse(await readFile(new URL('../locales/languages.json', import.meta.url), 'utf8'));

/** The real manifest with the named languages approved, as a reviewer's sign-off would leave it. */
function approving(...tags) {
  return {
    ...realManifest,
    languages: realManifest.languages.map((language) => (tags.includes(language.tag)
      ? { ...language, status: 'approved', reviewer: 'A fluent reviewer', approvedOn: '2026-10-12' }
      : language)),
  };
}

async function setup({ languages } = {}) {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  memory.public.registerFunction({ name: 'char_length', args: ['text'], returns: 'integer', implementation: (value) => value.length });
  memory.public.registerFunction({ name: 'jsonb_array_length', args: ['jsonb'], returns: 'integer', implementation: (value) => (Array.isArray(value) ? value.length : 0) });
  const pool = new (memory.adapters.createPg().Pool)();
  for (const name of MIGRATIONS) await pool.query(await readFile(new URL(`../server/migrations/${name}`, import.meta.url), 'utf8'));
  const config = loadConfig({ NODE_ENV: 'test', PUBLIC_ORIGIN: origin, SESSION_SECRET: 's'.repeat(32), AUDIT_HMAC_KEY: 'a'.repeat(32) });
  const platform = new PlatformService({ pool, config, mailer: new MemoryMailer(), apple: { configured: () => false }, ...(languages && { languages }) });
  const app = await buildApp({ platform, config });
  return { app, pool, platform };
}

const call = (app, method, url, { payload, browser, phone, headers = {} } = {}) => app.inject({
  method,
  url,
  remoteAddress: '203.0.113.30',
  headers: {
    ...(browser ? { origin, cookie: browser.cookie, 'x-together-csrf': browser.csrf } : {}),
    ...(phone ? { authorization: `Bearer ${phone.token}`, 'x-together-client': 'app' } : {}),
    ...headers,
  },
  payload,
});

async function register(app, email) {
  const response = await app.inject({ method: 'POST', url: '/api/v1/auth/register', headers: { origin }, payload: { email, username: email.split('@')[0], password: PASSWORD } });
  assert.equal(response.statusCode, 201, response.body);
  return response.json().data.user;
}

async function browserSignIn(app, identifier) {
  const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { origin }, payload: { identifier, password: PASSWORD } });
  assert.equal(response.statusCode, 200, response.body);
  return { cookie: response.headers['set-cookie'].split(';')[0], csrf: response.json().data.csrfToken };
}

async function phoneSignIn(app, identifier) {
  const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { 'x-together-client': 'app' }, payload: { identifier, password: PASSWORD } });
  assert.equal(response.statusCode, 200, response.body);
  return { token: response.json().data.token };
}

const languageOf = async (app, who) => (await call(app, 'GET', '/api/v1/session', who)).json().data.user.language;
const choose = (app, who, payload) => call(app, 'PATCH', '/api/v1/account/language', { ...who, payload });

test('a new account follows its device, and the account says so', async (t) => {
  const { app, pool } = await setup();
  t.after(async () => { await app.close(); await pool.end(); });
  const user = await register(app, 'asha@example.test');
  assert.equal(user.language, null, 'no choice made: "Follow my device"');
  assert.equal(await languageOf(app, { browser: await browserSignIn(app, 'asha@example.test') }), null);
  assert.equal(await languageOf(app, { phone: await phoneSignIn(app, 'asha@example.test') }), null);
});

test('a language chosen by hand is saved on the account, read back on every device, and can go back to following the device', async (t) => {
  const { app, pool } = await setup({ languages: approving('hi') });
  t.after(async () => { await app.close(); await pool.end(); });
  await register(app, 'asha@example.test');
  const browser = await browserSignIn(app, 'asha@example.test');
  const phone = await phoneSignIn(app, 'asha@example.test');

  const chosen = await choose(app, { browser }, { language: 'hi' });
  assert.equal(chosen.statusCode, 200, chosen.body);
  assert.equal(chosen.json().data.user.language, 'hi');
  assert.equal(await languageOf(app, { browser }), 'hi');
  assert.equal(await languageOf(app, { phone }), 'hi', 'the phone reads the same account');

  // English chosen by hand is a choice, and not the same as following the device.
  assert.equal((await choose(app, { phone }, { language: 'en' })).json().data.user.language, 'en');
  assert.equal(await languageOf(app, { browser }), 'en');
  assert.equal((await pool.query('SELECT language FROM users')).rows[0].language, 'en');

  const following = await choose(app, { phone }, { language: null });
  assert.equal(following.statusCode, 200, following.body);
  assert.equal(following.json().data.user.language, null);
  assert.equal(await languageOf(app, { browser }), null);
  assert.equal((await pool.query('SELECT language FROM users')).rows[0].language, null, 'stored as no choice, not as English');
});

test('only a language the manifest marks approved can be chosen', async (t) => {
  const { app, pool } = await setup();
  t.after(async () => { await app.close(); await pool.end(); });
  await register(app, 'asha@example.test');
  const browser = await browserSignIn(app, 'asha@example.test');
  // Today only English is approved. Every draft is refused, as is anything that isn't a tag the
  // manifest lists, or no language at all.
  for (const language of ['hi', 'bn', 'es-419', 'hi-Latn', 'es', 'fr', 'EN', '', 7, { tag: 'en' }, undefined]) {
    const response = await choose(app, { browser }, language === undefined ? {} : { language });
    assert.equal(response.statusCode, 400, JSON.stringify(language));
    assert.deepEqual(response.json(), NOT_OFFERED, JSON.stringify(language));
  }
  assert.equal(await languageOf(app, { browser }), null, 'nothing was saved');
  assert.equal((await choose(app, { browser }, { language: 'en' })).json().data.user.language, 'en');
});

// A preview (decision 145) is offered to be chosen by hand, so a hand-made choice of one is kept on
// the account; a language still in draft or in review is refused as before.
test('a language in preview can be chosen and kept; one in draft or in review cannot', async (t) => {
  const statuses = { hi: 'preview', bn: 'in-review' };
  const languages = { ...realManifest, languages: realManifest.languages.map((language) => (statuses[language.tag] ? { ...language, status: statuses[language.tag] } : language)) };
  const { app, pool } = await setup({ languages });
  t.after(async () => { await app.close(); await pool.end(); });
  await register(app, 'asha@example.test');
  const browser = await browserSignIn(app, 'asha@example.test');
  assert.equal((await choose(app, { browser }, { language: 'hi' })).json().data.user.language, 'hi');
  assert.equal(await languageOf(app, { browser }), 'hi', 'kept on the account');
  for (const language of ['bn', 'es-419', 'hi-Latn']) {
    const response = await choose(app, { browser }, { language });
    assert.equal(response.statusCode, 400, language);
    assert.deepEqual(response.json(), NOT_OFFERED, language);
  }
  assert.equal(await languageOf(app, { browser }), 'hi');
});

test('a choice made before signing in carries into an account that has none, and never over one it has', async (t) => {
  const { app, pool } = await setup({ languages: approving('hi', 'bn') });
  t.after(async () => { await app.close(); await pool.end(); });
  await register(app, 'asha@example.test');
  const phone = await phoneSignIn(app, 'asha@example.test');
  const carried = await choose(app, { phone }, { language: 'bn', unlessChosen: true });
  assert.equal(carried.statusCode, 200, carried.body);
  assert.equal(carried.json().data.user.language, 'bn', 'the account had no choice, so it takes this device\'s');

  const browser = await browserSignIn(app, 'asha@example.test');
  const kept = await choose(app, { browser }, { language: 'hi', unlessChosen: true });
  assert.equal(kept.statusCode, 200, kept.body);
  assert.equal(kept.json().data.user.language, 'bn', 'the account\'s own choice wins, and is what the device is told');
  assert.equal(await languageOf(app, { phone }), 'bn');
  // A choice the account already holds is overwritten only by a choice made by hand.
  assert.equal((await choose(app, { browser }, { language: 'hi' })).json().data.user.language, 'hi');
});

test('one account can neither read nor change another\'s language', async (t) => {
  const { app, pool } = await setup({ languages: approving('hi', 'bn') });
  t.after(async () => { await app.close(); await pool.end(); });
  await register(app, 'asha@example.test');
  const ben = await register(app, 'ben@example.test');
  const asha = await browserSignIn(app, 'asha@example.test');
  const ashaPhone = await phoneSignIn(app, 'asha@example.test');
  const benBrowser = await browserSignIn(app, 'ben@example.test');
  assert.equal((await choose(app, { browser: benBrowser }, { language: 'bn' })).statusCode, 200);

  // Whatever the body says about whose account it is, the change is the signed-in person's own.
  for (const payload of [{ language: 'hi', userId: ben.id }, { language: 'hi', id: ben.id, user: { id: ben.id } }]) {
    const fromBrowser = await choose(app, { browser: asha }, payload);
    assert.equal(fromBrowser.statusCode, 200, fromBrowser.body);
    assert.equal(fromBrowser.json().data.user.email, 'asha@example.test');
    const fromPhone = await choose(app, { phone: ashaPhone }, { ...payload, language: null });
    assert.equal(fromPhone.json().data.user.email, 'asha@example.test');
  }
  assert.equal(await languageOf(app, { browser: benBrowser }), 'bn', 'Ben\'s choice is as he left it');

  // Nothing Asha can ask for carries Ben's language: the only account a reply ever describes is
  // the one signed in.
  const ashaSession = (await call(app, 'GET', '/api/v1/session', { browser: asha })).json();
  assert.equal(ashaSession.data.user.id !== ben.id, true);
  assert.doesNotMatch(JSON.stringify(ashaSession), /"bn"/);
  const ashaSet = (await choose(app, { browser: asha }, { language: 'hi' })).json();
  assert.doesNotMatch(JSON.stringify(ashaSet), new RegExp(ben.id));
  assert.equal((await pool.query('SELECT language FROM users WHERE id=$1', [ben.id])).rows[0].language, 'bn');
});

test('choosing a language needs a sign-in, and a browser\'s needs its CSRF value', async (t) => {
  const { app, pool } = await setup();
  t.after(async () => { await app.close(); await pool.end(); });
  await register(app, 'asha@example.test');
  const browser = await browserSignIn(app, 'asha@example.test');
  const nobody = await call(app, 'PATCH', '/api/v1/account/language', { headers: { origin }, payload: { language: 'en' } });
  assert.equal(nobody.statusCode, 401);
  assert.deepEqual(nobody.json(), SIGNED_OUT);
  const noCsrf = await call(app, 'PATCH', '/api/v1/account/language', { headers: { origin, cookie: browser.cookie }, payload: { language: 'en' } });
  assert.equal(noCsrf.statusCode, 403);
  assert.equal(await languageOf(app, { browser }), null);
});

test('deleting the account deletes its language with it', async (t) => {
  const { app, pool, platform } = await setup();
  t.after(async () => { await app.close(); await pool.end(); });
  const user = await register(app, 'asha@example.test');
  const browser = await browserSignIn(app, 'asha@example.test');
  assert.equal((await choose(app, { browser }, { language: 'en' })).statusCode, 200);
  // The route adds only the billing check, which needs a billing service this setup leaves out.
  await platform.deleteAccount(user.id, PASSWORD);
  assert.equal((await pool.query('SELECT language FROM users WHERE id=$1', [user.id])).rows[0].language, null);
});
