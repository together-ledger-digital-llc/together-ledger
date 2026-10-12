import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Continue with Google and Apple on the phone (TL-S-04, #217): what the phone sends, what it keeps
// from Apple's first authorization, what stays silent, and that nothing shows until the server
// says it works on this phone.

const mobile = new URL('../apps/mobile/', import.meta.url);
const require = createRequire(import.meta.url);

// The phone's own TypeScript, compiled on the spot, as tests/mobile-account.test.js does.
async function importMobile(path) {
  const source = await readFile(new URL(path, mobile), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { createAccountClient } = await importMobile('src/api/client.ts');
const social = await importMobile('src/auth/social-sign-in.ts');
const read = (path) => readFile(new URL(path, mobile), 'utf8');

const pair = { token: 'access-1', tokenExpiresAt: '2026-10-10T00:00:00.000Z', refreshToken: 'refresh-1', refreshTokenExpiresAt: '2026-11-10T00:00:00.000Z' };
const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

function recording(answer = () => reply(200, { data: { user: { id: 'u1', hasPassword: false }, ...pair } })) {
  const calls = [];
  let held = null;
  const tokens = { read: async () => held, write: async (value) => { held = value; }, clear: async () => { held = null; } };
  const client = createAccountClient({ base: () => 'https://api.example.test/api/v1', tokens, fetch: async (url, init) => {
    calls.push({ url, method: init.method, headers: init.headers, body: init.body === undefined ? undefined : JSON.parse(init.body) });
    return answer(url, init);
  } });
  return { client, calls, tokens: () => held };
}

function memoryKept(initial = null) {
  let held = initial;
  return { read: async () => held, write: async (value) => { held = value; }, clear: async () => { held = null; }, get held() { return held; } };
}

// ---------------------------------------------------------------------------------------------
// The request shapes

test('the phone asks the providers read about itself: its platform and its Google client', async () => {
  const { client, calls } = recording(() => reply(200, { data: { google: { clientId: 'ios.apps.googleusercontent.com' }, apple: { clientId: 'com.togetherledger.ledger' } } }));
  assert.deepEqual(await client.providers('ios', 'ios.apps.googleusercontent.com'), { google: { clientId: 'ios.apps.googleusercontent.com' }, apple: { clientId: 'com.togetherledger.ledger' } });
  await client.providers('android', null);
  assert.deepEqual(calls.map((call) => `${call.method} ${call.url}`), [
    'GET https://api.example.test/api/v1/auth/providers?platform=ios&googleClientId=ios.apps.googleusercontent.com',
    'GET https://api.example.test/api/v1/auth/providers?platform=android',
  ]);
  assert.equal(calls[0].headers['x-together-client'], 'app');
  assert.equal(calls[0].headers.Authorization, undefined, 'no session is needed or sent');
});

test('a providers answer the phone can\'t read is nothing offered', async () => {
  const { client } = recording(() => reply(200, { data: { google: {}, apple: 'yes' } }));
  assert.deepEqual(await client.providers('ios', 'ios.apps.googleusercontent.com'), { google: null, apple: null });
});

test('Google sends only the ID token, Apple the ID token, the authorizationCode and the first name, and both keep the token pair', async () => {
  const { client, calls, tokens } = recording();
  const user = await client.signInWithGoogle({ idToken: 'google-id-token' });
  assert.deepEqual(user, { id: 'u1', hasPassword: false });
  assert.deepEqual(tokens(), pair, 'stored the same way a password sign-in is, in the keychain (#180)');
  await client.signInWithApple({ idToken: 'apple-id-token', authorizationCode: 'apple-code', displayName: 'Asha' });
  assert.deepEqual(calls.map(({ method, url, body }) => ({ method, url, body })), [
    { method: 'POST', url: 'https://api.example.test/api/v1/auth/google', body: { idToken: 'google-id-token' } },
    { method: 'POST', url: 'https://api.example.test/api/v1/auth/apple', body: { idToken: 'apple-id-token', authorizationCode: 'apple-code', displayName: 'Asha' } },
  ]);
  for (const call of calls) assert.equal(call.headers['x-together-client'], 'app', 'the server answers the app with tokens, not a cookie');
});

test('linking sends the same sign-in with the password, and Apple\'s code with it', async () => {
  const { client, calls } = recording();
  await client.linkIdentity('google', { idToken: 'google-id-token' }, 'password-1');
  await client.linkIdentity('apple', { idToken: 'apple-id-token', authorizationCode: 'apple-code', displayName: 'Asha' }, 'password-2');
  assert.deepEqual(calls.map(({ url, body }) => ({ url, body })), [
    { url: 'https://api.example.test/api/v1/auth/link', body: { provider: 'google', idToken: 'google-id-token', password: 'password-1' } },
    { url: 'https://api.example.test/api/v1/auth/link', body: { provider: 'apple', idToken: 'apple-id-token', authorizationCode: 'apple-code', password: 'password-2' } },
  ]);
});

test('link_required comes back with the email the password is for, in the server\'s own words', async () => {
  const message = 'You already have an account with this email. Enter its password once to connect it.';
  const { client, tokens } = recording(() => reply(409, { error: { code: 'link_required', message, details: { email: 'asha@example.test' } } }));
  await assert.rejects(client.signInWithGoogle({ idToken: 'google-id-token' }), { code: 'link_required', message, details: { email: 'asha@example.test' } });
  assert.equal(tokens(), null);
});

test('an account without a password is deleted by typing DELETE alone; one with a password still sends it', async () => {
  // Deleting is signed in, so each deletion follows a sign-in that holds a token.
  const signedIn = recording((url) => (url.endsWith('/account') ? reply(204, null) : reply(200, { data: { user: { id: 'u1' }, ...pair } })));
  await signedIn.client.signInWithApple({ idToken: 't', authorizationCode: 'c' });
  await signedIn.client.deleteAccount(null);
  await signedIn.client.signInWithApple({ idToken: 't', authorizationCode: 'c' });
  await signedIn.client.deleteAccount('a long password');
  const deletions = signedIn.calls.filter((call) => call.method === 'DELETE');
  assert.deepEqual(deletions.map((call) => call.body), [{ confirmation: 'DELETE' }, { password: 'a long password', confirmation: 'DELETE' }]);
});

// ---------------------------------------------------------------------------------------------
// Apple's first authorization

test('the first name Apple gives on the first authorization is sent, and kept until the server has it', async () => {
  const kept = memoryKept();
  const first = { user: 'apple-user-1', identityToken: 'id-1', authorizationCode: 'code-1', fullName: { givenName: 'Asha', familyName: 'Rao' }, email: 'asha@privaterelay.appleid.com' };
  assert.deepEqual(await social.appleSignInBody(first, kept), { idToken: 'id-1', authorizationCode: 'code-1', displayName: 'Asha' });
  assert.deepEqual(kept.held, { user: 'apple-user-1', displayName: 'Asha' });

  // That sign-in never reached the server. Apple doesn't give the name again; the kept one goes instead.
  const again = { user: 'apple-user-1', identityToken: 'id-2', authorizationCode: 'code-2', fullName: { givenName: null, familyName: null }, email: null };
  assert.deepEqual(await social.appleSignInBody(again, kept), { idToken: 'id-2', authorizationCode: 'code-2', displayName: 'Asha' });

  // Never someone else's name.
  const stranger = { ...again, user: 'apple-user-2' };
  assert.deepEqual(await social.appleSignInBody(stranger, kept), { idToken: 'id-2', authorizationCode: 'code-2' });
});

// #399, decided Oct 12, 2026: a new account starts with the first name only; the full name only
// when Apple gives no first name, which leaves the family name alone; and nothing when it gives
// neither, so the server falls back to the private handle.
test('a new account starts with Apple\'s first name, then the full name, then nothing', () => {
  assert.equal(social.appleDisplayName({ givenName: 'Asha', familyName: 'Rao' }), 'Asha');
  assert.equal(social.appleDisplayName({ givenName: '  Asha  ', familyName: null }), 'Asha');
  assert.equal(social.appleDisplayName({ givenName: null, familyName: 'Rao' }), 'Rao');
  assert.equal(social.appleDisplayName({ givenName: '   ', familyName: ' Rao ' }), 'Rao');
  assert.equal(social.appleDisplayName({ givenName: null, familyName: null }), '');
  assert.equal(social.appleDisplayName({}), '');
  assert.equal(social.appleDisplayName(null), '');
});

test('Apple\'s answer with no first name sends the family name, and with neither sends no name', async () => {
  const kept = memoryKept();
  const familyOnly = { user: 'apple-user-3', identityToken: 'id-3', authorizationCode: 'code-3', fullName: { givenName: null, familyName: 'Rao' }, email: null };
  assert.deepEqual(await social.appleSignInBody(familyOnly, kept), { idToken: 'id-3', authorizationCode: 'code-3', displayName: 'Rao' });
  const nameless = { user: 'apple-user-4', identityToken: 'id-4', authorizationCode: 'code-4', fullName: { givenName: null, familyName: null }, email: null };
  assert.deepEqual(await social.appleSignInBody(nameless, memoryKept()), { idToken: 'id-4', authorizationCode: 'code-4' });
});

test('the email from Apple\'s first authorization is never sent from the phone: the server reads it from the signed ID token', async () => {
  const kept = memoryKept();
  const body = await social.appleSignInBody({ user: 'u', identityToken: 'id', authorizationCode: 'code', fullName: null, email: 'asha@example.test' }, kept);
  assert.deepEqual(body, { idToken: 'id', authorizationCode: 'code' });
  assert.equal(kept.held, null, 'nothing to keep without a name');
  const platform = await readFile(new URL('../server/platform.js', import.meta.url), 'utf8');
  assert.match(platform, /async socialSignIn\(provider, \{ idToken, displayName, authorizationCode, returnedTo \} = \{\}/, 'the server takes no email from the body');
});

test('Apple\'s answer without either credential sends nothing, and a keychain that refuses doesn\'t stop the sign-in', async () => {
  assert.equal(await social.appleSignInBody({ user: 'u', identityToken: null, authorizationCode: 'c', fullName: null, email: null }, memoryKept()), null);
  assert.equal(await social.appleSignInBody({ user: 'u', identityToken: 'i', authorizationCode: null, fullName: null, email: null }, memoryKept()), null);
  const refusing = { read: async () => { throw new Error('locked'); }, write: async () => { throw new Error('locked'); }, clear: async () => {} };
  assert.deepEqual(await social.appleSignInBody({ user: 'u', identityToken: 'i', authorizationCode: 'c', fullName: { givenName: 'Asha' }, email: null }, refusing), { idToken: 'i', authorizationCode: 'c', displayName: 'Asha' });
  assert.deepEqual(await social.appleSignInBody({ user: 'u', identityToken: 'i', authorizationCode: 'c', fullName: null, email: null }, refusing), { idToken: 'i', authorizationCode: 'c' });
});

test('the kept name lives in the keychain like the tokens, and is cleared once a sign-in with Apple succeeds', async () => {
  const store = await read('src/auth/kept-apple-name.ts');
  assert.match(store, /from 'expo-secure-store'/);
  assert.match(store, /WHEN_UNLOCKED_THIS_DEVICE_ONLY/);
  const component = await read('src/components/social-sign-in.tsx');
  assert.match(component, /const user = await signIn\(\);\s*if \(provider === 'apple'\) await keptAppleName\.clear\(\)/);
  assert.match(component, /appleSignInBody\(credential, keptAppleName\)/);
  assert.match(component, /requestedScopes: \[AppleAuthentication\.AppleAuthenticationScope\.FULL_NAME, AppleAuthentication\.AppleAuthenticationScope\.EMAIL\]/);
});

// ---------------------------------------------------------------------------------------------
// Cancelling

test('closing Apple\'s or Google\'s sheet is recognised as a cancel, and nothing else is', () => {
  assert.equal(social.appleCancelled({ code: 'ERR_REQUEST_CANCELED' }), true);
  assert.equal(social.appleCancelled({ code: 'ERR_REQUEST_FAILED' }), false);
  assert.equal(social.appleCancelled(null), false);
  // Google on an iPhone: the browser sheet's answers (expo-auth-session).
  assert.equal(social.googleBrowserOutcome({ type: 'cancel' }), 'cancelled', 'the sheet closed');
  assert.equal(social.googleBrowserOutcome({ type: 'dismiss' }), 'cancelled');
  assert.equal(social.googleBrowserOutcome({ type: 'locked' }), 'cancelled', 'a second tap while one is open');
  assert.equal(social.googleBrowserOutcome({ type: 'error', params: { error: 'access_denied' } }), 'cancelled', 'Cancel on Google\'s own page');
  assert.equal(social.googleBrowserOutcome({ type: 'error', params: { error: 'invalid_request' } }), 'failed');
  assert.equal(social.googleBrowserOutcome({ type: 'error', params: {}, error: { message: 'Cross-Site request verification failed. Cached state and returned state do not match.' } }), 'failed', 'a state that doesn\'t match is never a sign-in');
  assert.equal(social.googleBrowserOutcome({ type: 'success', params: {} }), 'failed');
  assert.deepEqual(social.googleBrowserOutcome({ type: 'success', params: { code: '4/0Ab-code', state: 's' } }), { code: '4/0Ab-code' });
  // Google on Android: the native library's answers.
  const quiet = ['SIGN_IN_CANCELLED', 'IN_PROGRESS'];
  assert.equal(social.googleCancelled({ type: 'cancelled', data: null }, quiet), true);
  assert.equal(social.googleCancelled({ code: 'SIGN_IN_CANCELLED' }, quiet), true);
  assert.equal(social.googleCancelled({ code: 'IN_PROGRESS' }, quiet), true);
  assert.equal(social.googleCancelled({ code: 'PLAY_SERVICES_NOT_AVAILABLE' }, quiet), false);
  assert.equal(social.googleCancelled({ type: 'success', data: { idToken: 't' } }, quiet), false);
  assert.equal(social.googleIdToken({ type: 'success', data: { idToken: 'google-id-token' } }), 'google-id-token');
  assert.equal(social.googleIdToken({ type: 'success', data: { idToken: null } }), null);
  assert.equal(social.googleIdToken({ type: 'cancelled', data: null }), null);
});

test('a cancel says nothing and sends nothing; a failure in the sheet is said in the account\'s fallback words', async () => {
  const component = await read('src/components/social-sign-in.tsx');
  // Google, either phone: a sheet the person closed answers null, which returns before anything is
  // sent; anything Google's side throws is said in the account's fallback words.
  assert.match(component, /const idToken = await googleIdTokenFromSheet\(googleClientId\);\s*if \(!idToken\) return;/);
  assert.match(component, /\} catch \{\s*\/\/[^\n]*\n[^\n]*\n\s*setNotice\(accountMessage\(null\)\);/);
  const ios = await read('src/auth/google-sheet.ts');
  assert.match(ios, /const outcome = googleBrowserOutcome\(await request\.promptAsync\(GOOGLE_AUTHORIZATION\)\);\s*if \(outcome === 'cancelled'\) return null;/);
  const android = await read('src/auth/google-sheet.android.ts');
  assert.match(android, /const QUIET = \[statusCodes\.SIGN_IN_CANCELLED, statusCodes\.IN_PROGRESS\];/);
  assert.match(android, /if \(googleCancelled\(error, QUIET\)\) return null;/);
  assert.match(android, /if \(googleCancelled\(outcome, QUIET\)\) return null;/);
  // Apple: the sheet's cancel lands in the catch, and is not said.
  assert.match(component, /if \(!appleCancelled\(error\)\) setNotice\(accountMessage\(null\)\);/);
});

// ---------------------------------------------------------------------------------------------
// Hidden until ready

test('nothing shows until the server says it works; an iPhone shows both or neither, Android each the server has ready', () => {
  const both = { google: { clientId: 'g' }, apple: { clientId: 'com.togetherledger.ledger' } };
  const none = { google: false, apple: false };
  assert.deepEqual(social.offeredSignIns('ios', null, { appleSheet: true }), none, 'not asked yet, or not answered');
  assert.deepEqual(social.offeredSignIns('ios', both, { appleSheet: true }), { google: true, apple: true });
  assert.deepEqual(social.offeredSignIns('ios', { google: { clientId: 'g' }, apple: null }, { appleSheet: true }), none, 'guideline 4.8: no Google without Apple on an iPhone');
  assert.deepEqual(social.offeredSignIns('ios', { google: null, apple: both.apple }, { appleSheet: true }), none, 'and both, or neither');
  assert.deepEqual(social.offeredSignIns('ios', both, { appleSheet: false }), none, 'Apple\'s sheet has to be there too');
  assert.deepEqual(social.offeredSignIns('android', { google: { clientId: 'g' }, apple: null }), { google: true, apple: false });
  // Android signs in with Apple through Apple's page in the browser (#400), so it is offered Apple
  // once the server names the Return URL that page answers to, and only then.
  assert.deepEqual(social.offeredSignIns('android', both), { google: true, apple: false }, 'an Apple answer with no Return URL is the iPhone\'s, not Android\'s');
  const browser = { clientId: 'com.togetherledger.ledger.web', redirectUri: 'https://api.together-ledger.com/api/v1/auth/apple/return' };
  assert.deepEqual(social.offeredSignIns('android', { google: { clientId: 'g' }, apple: browser }), { google: true, apple: true });
  assert.deepEqual(social.offeredSignIns('android', { google: null, apple: browser }), { google: false, apple: true }, 'no guideline ties the two on Android');
  assert.deepEqual(social.offeredSignIns('android', { google: null, apple: null }), none);
  assert.deepEqual(social.offeredSignIns('android', null), none);
  // The iPhone is unchanged by it: its sheet, never the browser.
  assert.deepEqual(social.offeredSignIns('ios', { google: { clientId: 'g' }, apple: browser }, { appleSheet: false }), none);
});

test('the buttons draw nothing until then, and an unanswered or failed read leaves only email sign-in', async () => {
  const component = await read('src/components/social-sign-in.tsx');
  assert.match(component, /useState<Offer>\(NOTHING_OFFERED\)/);
  assert.match(component, /if \(!offer\.google && !offer\.apple\) return null;/);
  assert.match(component, /const answer = await client\.providers\(phonePlatform, googleClientId\);\s*const offered = offeredSignIns\(phonePlatform, answer, \{ appleSheet \}\);/);
  assert.match(component, /\}\)\(\)\.catch\(\(\) => \{\s*\/\/ Not ready, or not reachable/);
});

test('the Google client comes from the build\'s public config, never the source', async () => {
  assert.equal(social.googleClientIdFor('ios', { ios: ' 123-abc.apps.googleusercontent.com ', web: 'w.apps.googleusercontent.com' }), '123-abc.apps.googleusercontent.com');
  assert.equal(social.googleClientIdFor('android', { ios: 'i.apps.googleusercontent.com', web: '456-def.apps.googleusercontent.com' }), '456-def.apps.googleusercontent.com');
  assert.equal(social.googleClientIdFor('ios', { ios: '', web: null }), null);
  assert.equal(social.googleClientIdFor('android', { web: 'not a client id' }), null);
  const config = await read('src/config/google.ts');
  assert.match(config, /process\.env\.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID/);
  assert.match(config, /process\.env\.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/);
  for (const file of ['src/config/google.ts', 'src/components/social-sign-in.tsx', 'src/auth/social-sign-in.ts', 'app.json']) {
    assert.doesNotMatch(await read(file), /\d+-[a-z0-9]+\.apps\.googleusercontent\.com/, `${file} holds a real Google client ID`);
  }
  assert.equal(social.googleRedirectUri('123-abc.apps.googleusercontent.com'), 'com.googleusercontent.apps.123-abc:/oauthredirect');
  assert.equal(social.googleRedirectUri(null), null);
  const { googleUrlScheme } = require('../apps/mobile/app.config.js');
  assert.equal(googleUrlScheme({ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: '123-abc.apps.googleusercontent.com' }), 'com.googleusercontent.apps.123-abc');
  assert.equal(googleUrlScheme({}), null);
  assert.equal(googleUrlScheme({ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'com.googleusercontent.apps.123' }), null);
});

// Together Ledger's own Google OAuth clients (owner, Oct 10-11, 2026), in Google Cloud project
// togetherledger-app. All three are public identifiers. The iOS and web clients go into the phone
// builds; the Android client is registered with Google by package name and the SHA-1 of Play's app
// signing key, and never appears in the app or as a token's audience.
const GOOGLE_IOS_CLIENT = '830212501049-rfcs1cbpoutujis33ealcilrni2iurmo.apps.googleusercontent.com';
const GOOGLE_WEB_CLIENT = '830212501049-m2kdup7ckrivuqu1uure7un5fq17hvth.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT = '830212501049-asm6nbn1g4rsv8oggv8sdqedv0m3l70v.apps.googleusercontent.com';

// src/config/google.ts as a build for this platform runs it, with these EXPO_PUBLIC_* values inlined:
// react-native's Platform stood in for, and social-sign-in.ts exactly as it is.
let googleConfigBuilds = 0;
async function googleConfigFor(os, env) {
  const asModule = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  const rules = ts.transpileModule(await read('src/auth/social-sign-in.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const original = await read('src/config/google.ts');
  const source = original
    .replace("import { Platform } from 'react-native';", `const Platform = { OS: ${JSON.stringify(os)} };`)
    .replace("from '../auth/social-sign-in';", `from '${asModule(rules)}';`);
  assert.equal(source.match(/^const Platform = |data:text\/javascript/gm)?.length, 2, 'google.ts imports what this test stands in for');
  const { outputText } = ts.transpileModule(`${source}\n// build ${googleConfigBuilds += 1}`, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  const names = ['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'];
  const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    for (const name of names) {
      if (env[name] === undefined) delete process.env[name];
      else process.env[name] = env[name];
    }
    return await import(asModule(outputText));
  } finally {
    for (const name of names) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  }
}

test('the phone builds carry Together Ledger\'s own Google clients, and the Android client stays out of the app', async () => {
  const eas = JSON.parse(await read('eas.json'));
  for (const profile of ['production', 'preview']) {
    const { env } = eas.build[profile];
    assert.equal(env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, GOOGLE_IOS_CLIENT, `${profile}: the iOS client`);
    assert.equal(env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, GOOGLE_WEB_CLIENT, `${profile}: the web client, which Android asks its token for`);
    const { googleUrlScheme } = require('../apps/mobile/app.config.js');
    assert.equal(googleUrlScheme(env), 'com.googleusercontent.apps.830212501049-rfcs1cbpoutujis33ealcilrni2iurmo', `${profile}: the scheme Google returns to on an iPhone`);
  }
  // All three were made in the same Google Cloud project, togetherledger-app.
  const project = (id) => id.split('-')[0];
  assert.equal(project(GOOGLE_ANDROID_CLIENT), project(GOOGLE_WEB_CLIENT));
  assert.equal(project(GOOGLE_IOS_CLIENT), project(GOOGLE_WEB_CLIENT));
  const files = ['eas.json', 'app.json', 'app.config.js', '.env.example'];
  const walk = async (dir) => (await readdir(new URL(dir, mobile), { withFileTypes: true }))
    .flatMap((entry) => (entry.isDirectory() ? [] : [`${dir}${entry.name}`]));
  for (const dir of ['src/config/', 'src/auth/', 'src/components/', 'plugins/']) files.push(...await walk(dir));
  for (const file of files) assert.doesNotMatch(await read(file), new RegExp(GOOGLE_ANDROID_CLIENT.split('.')[0]), `${file} names the Android client`);
});

test('with those clients set, the phone offers Google on both platforms and Apple on an iPhone', async () => {
  const eas = JSON.parse(await read('eas.json'));
  // The owner's server step: the web client as GOOGLE_WEB_CLIENT_ID and the iOS client in
  // GOOGLE_CLIENT_IDS. Apple's two secrets are already set on the server; stood in for here.
  const { loadConfig } = await import('../server/config.js');
  const { PlatformService } = await import('../server/platform.js');
  const config = loadConfig({ NODE_ENV: 'test', GOOGLE_WEB_CLIENT_ID: GOOGLE_WEB_CLIENT, GOOGLE_CLIENT_IDS: GOOGLE_IOS_CLIENT });
  const server = new PlatformService({ pool: null, config, mailer: null, apple: { configured: () => true } });

  for (const profile of ['production', 'preview']) {
    const ios = await googleConfigFor('ios', eas.build[profile].env);
    assert.equal(ios.phonePlatform, 'ios');
    assert.equal(ios.googleClientId, GOOGLE_IOS_CLIENT, `${profile}: an iPhone's token is issued to the iOS client`);
    const iosAnswer = server.phoneSignInProviders(ios.phonePlatform, ios.googleClientId);
    assert.deepEqual(social.offeredSignIns(ios.phonePlatform, iosAnswer, { appleSheet: true }), { google: true, apple: true }, `${profile}: Google and Apple on an iPhone`);

    const android = await googleConfigFor('android', eas.build[profile].env);
    assert.equal(android.phonePlatform, 'android');
    assert.equal(android.googleClientId, GOOGLE_WEB_CLIENT, `${profile}: Android's token is issued to the web client`);
    const androidAnswer = server.phoneSignInProviders(android.phonePlatform, android.googleClientId);
    assert.deepEqual(social.offeredSignIns(android.phonePlatform, androidAnswer), { google: true, apple: false }, `${profile}: Google alone on Android`);
  }

  // Without them, as before this change: email and password only, on both.
  for (const os of ['ios', 'android']) {
    const unset = await googleConfigFor(os, {});
    assert.equal(unset.googleClientId, null);
    assert.deepEqual(social.offeredSignIns(os, server.phoneSignInProviders(os, unset.googleClientId), { appleSheet: true }), social.NOTHING_OFFERED);
  }
  // Once the owner sets Android's Return URL for Apple too (#400), Android offers both.
  const withAndroidApple = new PlatformService({
    pool: null, mailer: null, apple: { configured: () => true },
    config: loadConfig({ NODE_ENV: 'test', GOOGLE_WEB_CLIENT_ID: GOOGLE_WEB_CLIENT, GOOGLE_CLIENT_IDS: GOOGLE_IOS_CLIENT, APPLE_ANDROID_REDIRECT_URI: 'https://api.together-ledger.com/api/v1/auth/apple/return' }),
  });
  const android = await googleConfigFor('android', eas.build.production.env);
  assert.deepEqual(social.offeredSignIns('android', withAndroidApple.phoneSignInProviders('android', android.googleClientId)), { google: true, apple: true });
  const ios = await googleConfigFor('ios', eas.build.production.env);
  assert.deepEqual(withAndroidApple.phoneSignInProviders('ios', ios.googleClientId).apple, { clientId: 'com.togetherledger.ledger' }, 'the iPhone\'s answer is unchanged');

  // And a server that hasn't been given them yet offers neither phone anything.
  const bare = new PlatformService({ pool: null, config: loadConfig({ NODE_ENV: 'test' }), mailer: null, apple: { configured: () => true } });
  for (const os of ['ios', 'android']) {
    const built = await googleConfigFor(os, eas.build.production.env);
    assert.deepEqual(social.offeredSignIns(os, bare.phoneSignInProviders(os, built.googleClientId), { appleSheet: true }), social.NOTHING_OFFERED);
  }
});

test('the buttons sit on the same screens as email sign-in, equal in size and over the 44-point minimum', async () => {
  const account = await read('app/account.tsx');
  const register = await read('app/register.tsx');
  assert.match(account, /<Screen title="Sign in"[^>]*>\s*\{\/\*[^]*?\*\/\}\s*<SocialSignIn \/>/);
  assert.match(register, /<SocialSignIn onSignedIn=\{\(\) => router\.replace\('\/account'\)\} \/>/);
  const component = await read('src/components/social-sign-in.tsx');
  const size = /const PROVIDER_BUTTON = \{ width: '100%', maxWidth: 400, height: (\d+), alignSelf: 'center' \} as const;/.exec(component);
  assert.ok(size && Number(size[1]) >= 44);
  // Apple's sheet on an iPhone, Apple's browser sign-in on Android (#400), and Google: one size.
  assert.equal(component.match(/style=\{(?:\[)?PROVIDER_BUTTON/g)?.length, 3, 'every button takes the same size');
  assert.match(component, /const PILL = PROVIDER_BUTTON\.height \/ 2;/);
  assert.match(component, /cornerRadius=\{PILL\}/);
  // The iPhone's Google button is drawn to Google's guidelines with Google's own "G" (20pt, @2x, @3x).
  const button = await read('src/components/google-button.tsx');
  assert.match(button, /borderRadius: 24/, 'the same pill as Apple\'s');
  assert.match(button, /light: \{ fill: '#FFFFFF', stroke: '#747775', text: '#1F1F1F' \}/);
  assert.match(button, /dark: \{ fill: '#131314', stroke: '#8E918F', text: '#E3E3E3' \}/);
  assert.match(button, />Sign in with Google<\/Text>/);
  for (const [name, size] of [['google-g.png', 20], ['google-g@2x.png', 40], ['google-g@3x.png', 60]]) {
    const png = await readFile(new URL(`assets/${name}`, mobile));
    assert.equal(png.subarray(1, 4).toString('latin1'), 'PNG');
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [size, size], name);
  }
});

// ---------------------------------------------------------------------------------------------
// Google on an iPhone is the browser-based sign-in; on Android, the native library

test('the iPhone asks Google with PKCE for the iOS client, returns to its reversed ID, and exchanges the code without a secret', async () => {
  const ios = await read('src/auth/google-sheet.ts');
  assert.match(ios, /from 'expo-auth-session'/);
  assert.match(ios, /const redirectUri = googleRedirectUri\(clientId\);/);
  assert.match(ios, /new AuthRequest\(\{\s*clientId,\s*redirectUri,\s*scopes: \[\.\.\.GOOGLE_SCOPES\],\s*responseType: ResponseType\.Code,\s*usePKCE: true,/);
  assert.match(ios, /exchangeCodeAsync\(\{ clientId, code: outcome\.code, redirectUri, extraParams: \{ code_verifier: request\.codeVerifier \} \}, GOOGLE_AUTHORIZATION\)/);
  assert.doesNotMatch(ios, /clientSecret|client_secret/);
  assert.deepEqual({ ...social.GOOGLE_AUTHORIZATION }, { authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth', tokenEndpoint: 'https://oauth2.googleapis.com/token' });
  assert.deepEqual([...social.GOOGLE_SCOPES], ['openid', 'email', 'profile']);
});

test('Google\'s native library is reached only from Android files, and expo-auth-session only from the iPhone\'s', async () => {
  const files = [];
  for (const directory of ['app', 'src']) {
    for (const entry of await readdir(new URL(directory, mobile), { recursive: true, withFileTypes: true })) {
      if (entry.isFile() && /\.tsx?$/.test(entry.name)) files.push(`${entry.parentPath ?? entry.path}/${entry.name}`.slice(fileURLToPath(mobile).length));
    }
  }
  const importing = async (name) => {
    const found = [];
    for (const file of files) if ((await read(file)).includes(`from '${name}'`)) found.push(file);
    return found.sort();
  };
  assert.deepEqual(await importing('@react-native-google-signin/google-signin'), ['src/auth/google-sheet.android.ts', 'src/components/google-button.android.tsx']);
  assert.deepEqual(await importing('expo-auth-session'), ['src/auth/google-sheet.ts']);
  // Each has its Android twin, which Metro takes instead on Android, so neither base file is in the Android bundle.
  for (const base of ['src/auth/google-sheet.ts', 'src/components/google-button.tsx']) assert.ok(files.includes(base.replace(/\.tsx?$/, (ext) => `.android${ext}`)), `${base} has an Android twin`);
  assert.match(await read('src/components/social-sign-in.tsx'), /import \{ googleIdTokenFromSheet \} from '\.\.\/auth\/google-sheet';/);
  assert.match(await read('src/components/social-sign-in.tsx'), /import \{ GoogleButton \} from '\.\/google-button';/);
});

// ---------------------------------------------------------------------------------------------
// After signing in

test('an Apple account with no email shows plain words, on the phone and the web alike', async () => {
  assert.equal(social.accountEmailLabel('apple-0f9e8d7c-1234-4abc-9def-001122334455@no-email.invalid'), 'Apple didn’t share an email address.');
  assert.equal(social.accountEmailLabel('asha@privaterelay.appleid.com'), 'asha@privaterelay.appleid.com');
  assert.equal(social.accountEmailLabel('asha@example.test'), 'asha@example.test');
  const web = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.ok(web.includes(`const APPLE_SHARED_NO_EMAIL = '${social.APPLE_SHARED_NO_EMAIL}';`), 'the same words on the web');
  const platform = await readFile(new URL('../server/platform.js', import.meta.url), 'utf8');
  assert.ok(platform.includes('`${provider}-${userId}@no-email.invalid`'), 'the placeholder the server gives is the one recognised');
  assert.match(await read('app/account.tsx'), /\{accountEmailLabel\(user\.email\)\}/);
});

test('an Apple account with no email is offered no verification email, and told where to write, on the phone and the web', async () => {
  assert.equal(social.appleSharedNoEmail('apple-0f9e8d7c@no-email.invalid'), true);
  assert.equal(social.appleSharedNoEmail('asha@example.test'), false);
  assert.equal(social.NO_EMAIL_SUPPORT, 'For help with this account, write to ledger-support@together-ledger.com.');
  const account = await read('app/account.tsx');
  assert.match(account, /\{appleSharedNoEmail\(user\.email\) \? <Body selectable>\{NO_EMAIL_SUPPORT\}<\/Body> : null\}/);
  assert.match(account, /\{!user\.emailVerified && !appleSharedNoEmail\(user\.email\) \? \(\s*<>\s*<Button kind="quiet" label="Resend verification email"/);
  const web = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.ok(web.includes(`const NO_EMAIL_SUPPORT = '${social.NO_EMAIL_SUPPORT}';`), 'the same sentence on the web');
  assert.match(web, /\$\('#resend-verification-button'\)\.hidden = !signedIn \|\| accountUser\.emailVerified \|\| noEmail;/);
  // The address is the one SUPPORT.md and Settings give.
  assert.ok((await readFile(new URL('../SUPPORT.md', import.meta.url), 'utf8')).includes('ledger-support@together-ledger.com'));
  assert.ok((await read('app/settings.tsx')).includes('ledger-support@together-ledger.com'));
});

test('deleting an account opened with Apple or Google asks for no password, and stays three taps', async () => {
  const remove = await read('app/delete-account.tsx');
  assert.match(remove, /const asksForPassword = session\.status !== 'signed-in' \|\| session\.user\.hasPassword !== false;/);
  assert.match(remove, /\{asksForPassword \? <Field label="Current password"/);
  assert.match(remove, /disabled=\{\(asksForPassword && !password\) \|\| typed !== 'DELETE'\}/);
  assert.match(remove, /session\.client\.deleteAccount\(asksForPassword \? password : null\)/);
});

// ---------------------------------------------------------------------------------------------
// Sign in with Apple on Android (#400): Apple's page in the browser tab, its answer collected from
// our server, then the iPhone's sign-in. The server's side is proven in tests/social-sign-in.test.js;
// the phone's against the real server at the end of this file.

const { createHash, randomBytes } = await import('node:crypto');
const sha = (value) => createHash('sha256').update(value).digest('base64url');
const ANDROID_RETURN = 'https://api.together-ledger.com/api/v1/auth/apple/return';

test('the phone\'s secrets are 32 random bytes in base64url, hashed the way the server hashes them', () => {
  for (let size = 0; size <= 34; size += 1) {
    const bytes = randomBytes(size);
    assert.equal(social.base64url(new Uint8Array(bytes)), bytes.toString('base64url'), `${size} bytes`);
  }
  const secret = randomBytes(32).toString('base64url');
  assert.equal(secret.length, 43);
  // expo-crypto digests in standard base64; the server compares in base64url.
  assert.equal(social.base64ToBase64url(createHash('sha256').update(secret).digest('base64')), sha(secret));
});

test('Apple\'s page is asked for the name and email, answered by form to the server\'s Return URL, with the state and nonce', () => {
  const url = new URL(social.appleAuthorizationUrl({ clientId: 'com.togetherledger.ledger.web', redirectUri: ANDROID_RETURN, state: 'the-state', nonce: 'the-nonce' }));
  assert.equal(`${url.origin}${url.pathname}`, 'https://appleid.apple.com/auth/authorize');
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    response_type: 'code id_token',
    // Apple answers the name and email scopes only by form_post, so the answer goes to our server.
    response_mode: 'form_post',
    client_id: 'com.togetherledger.ledger.web',
    redirect_uri: ANDROID_RETURN,
    scope: 'name email',
    state: 'the-state',
    nonce: 'the-nonce',
  });
});

test('the tab handing back is recognised by its path on our own website alone', () => {
  for (const opened of ['https://app.together-ledger.com/apple-sign-in', 'https://APP.together-ledger.com/apple-sign-in/', '/apple-sign-in', 'apple-sign-in', 'https://app.together-ledger.com/apple-sign-in?x=1#y']) {
    assert.equal(social.isAppleReturn(opened), true, opened);
  }
  for (const opened of ['https://elsewhere.example/apple-sign-in', 'http://app.together-ledger.com/apple-sign-in', 'togetherledger://apple-sign-in', 'https://app.together-ledger.com/invite#invite=x', '/apple-sign-in/more', '/']) {
    assert.equal(social.isAppleReturn(opened), false, opened);
  }
  // What the router does with it is in tests/mobile-invitation.test.js, beside the invitation's.
});

test('a kept sign-in is collected only while the server still holds its answer, and only when well formed', () => {
  const now = Date.parse('2026-10-12T12:00:00Z');
  const kept = { verifier: randomBytes(32).toString('base64url'), nonce: randomBytes(32).toString('base64url'), startedAt: now - 60_000 };
  assert.equal(social.stillCollectable(kept, now), true);
  assert.equal(social.stillCollectable({ ...kept, startedAt: now - social.APPLE_RETURN_MS - 1 }, now), false, 'past the server\'s ten minutes');
  assert.equal(social.stillCollectable({ ...kept, startedAt: now + 60_000 }, now), false, 'a clock that moved back');
  assert.equal(social.stillCollectable({ ...kept, verifier: 'short' }, now), false);
  assert.equal(social.stillCollectable({ verifier: kept.verifier, startedAt: now }, now), false);
  assert.equal(social.stillCollectable(null, now), false);
});

test('the phone collects Apple\'s answer, signs in with it as the iPhone does, and says the code came back to Android', async () => {
  const returned = { user: 'apple-user', idToken: 'id', authorizationCode: 'code', displayName: 'Asha' };
  const { client, calls } = recording((url) => (url.endsWith('/auth/apple/returned') ? reply(200, { data: returned }) : reply(200, { data: { user: { id: 'u1', hasPassword: false }, ...pair } })));
  assert.deepEqual(await client.collectAppleReturn({ verifier: 'v', nonce: 'n' }), returned);
  const kept = memoryKept();
  const body = await social.appleSignInBody(social.appleCredentialFrom(returned), kept);
  assert.deepEqual(body, { idToken: 'id', authorizationCode: 'code', displayName: 'Asha' });
  assert.deepEqual(kept.held, { user: 'apple-user', displayName: 'Asha' }, 'kept like the iPhone\'s, in case this sign-in doesn\'t reach the server');
  await client.signInWithApple({ ...body, returnedTo: 'android' });
  await client.linkIdentity('apple', { ...body, returnedTo: 'android' }, 'pw');
  assert.deepEqual(calls.map(({ method, url, body: sent }) => ({ method, url, body: sent })), [
    { method: 'POST', url: 'https://api.example.test/api/v1/auth/apple/returned', body: { verifier: 'v', nonce: 'n' } },
    { method: 'POST', url: 'https://api.example.test/api/v1/auth/apple', body: { idToken: 'id', authorizationCode: 'code', displayName: 'Asha', returnedTo: 'android' } },
    { method: 'POST', url: 'https://api.example.test/api/v1/auth/link', body: { provider: 'apple', idToken: 'id', authorizationCode: 'code', password: 'pw', returnedTo: 'android' } },
  ]);
  // The iPhone's link is unchanged: no returnedTo.
  const iphone = recording();
  await iphone.client.linkIdentity('apple', { idToken: 'id', authorizationCode: 'code' }, 'pw');
  assert.deepEqual(iphone.calls[0].body, { provider: 'apple', idToken: 'id', authorizationCode: 'code', password: 'pw' });
  // A later sign-in with no name finds the one kept for the same Apple user.
  assert.deepEqual(await social.appleSignInBody(social.appleCredentialFrom({ user: 'apple-user', idToken: 'id2', authorizationCode: 'code2' }), kept), { idToken: 'id2', authorizationCode: 'code2', displayName: 'Asha' });
});

test('the providers answer carries Android\'s Return URL for Apple through to the phone', async () => {
  const answer = { google: { clientId: 'web.apps.googleusercontent.com' }, apple: { clientId: 'com.togetherledger.ledger.web', redirectUri: ANDROID_RETURN } };
  const { client } = recording(() => reply(200, { data: answer }));
  assert.deepEqual(await client.providers('android', 'web.apps.googleusercontent.com'), answer);
});

test('on Android the browser sign-in is drawn with Apple\'s words and colours, and the iPhone keeps Apple\'s own button', async () => {
  const component = await read('src/components/social-sign-in.tsx');
  assert.match(component, /\{offer\.apple && phonePlatform === 'android' \? \(\s*<AppleButton dark=\{dark\} disabled=\{busy\} style=\{PROVIDER_BUTTON\} onPress=\{continueWithAppleInBrowser\} \/>/);
  assert.match(component, /\{offer\.apple && phonePlatform === 'ios' \? \(\s*<AppleAuthentication\.AppleAuthenticationButton/);
  // From there it is the iPhone's sign-in, said to have come back to Android.
  assert.match(component, /const body: AppleSignInBody = \{ \.\.\.credential, returnedTo: 'android' \};\s*await finish\('apple', \(\) => client\.signInWithApple\(body\), body\);/);
  const button = await read('src/components/apple-button.tsx');
  assert.match(button, />Sign in with Apple<\/Text>/);
  assert.match(button, /accessibilityLabel="Sign in with Apple"/);
  assert.match(button, /light: \{ fill: '#000000', text: '#FFFFFF' \}/);
  assert.match(button, /dark: \{ fill: '#FFFFFF', text: '#000000' \}/);
  // The secrets are kept as the tokens are, and the tab opens in the app's own task.
  const browser = await read('src/auth/apple-browser.ts');
  assert.match(browser, /keychainAccessible: SecureStore\.WHEN_UNLOCKED_THIS_DEVICE_ONLY/);
  assert.match(browser, /Crypto\.getRandomBytes\(32\)/);
  assert.match(browser, /\{ createTask: false \}/);
  assert.doesNotMatch(browser, /console\.|fetch\(/, 'the secrets go to the API client and nowhere else');
});

// The phone's own client and rules against the real server: Apple's page answers, the phone
// collects, and signs in, the way src/components/social-sign-in.tsx does it.
test('end to end: an Android phone signs in with Apple through the browser, into the account an iPhone opened', async () => {
  const { buildApp } = await import('../server/app.js');
  const { loadConfig } = await import('../server/config.js');
  const { PlatformService } = await import('../server/platform.js');
  const { IdentityVerifier } = await import('../server/identity.js');
  const { AppleSignIn } = await import('../server/apple.js');
  const { MemoryMailer } = await import('../server/mailer.js');
  const { generateKeyPairSync, sign } = await import('node:crypto');
  const { newDb } = await import('pg-mem');

  const memory = newDb({ autoCreateForeignKeyIndices: true });
  memory.public.registerFunction({ name: 'char_length', args: ['text'], returns: 'integer', implementation: (value) => value.length });
  memory.public.registerFunction({ name: 'jsonb_array_length', args: ['jsonb'], returns: 'integer', implementation: (value) => (Array.isArray(value) ? value.length : 0) });
  const pool = new (memory.adapters.createPg().Pool)();
  // The ones tests/social-sign-in.test.js runs, which is what signing in touches.
  const migrations = (await readFile(new URL('social-sign-in.test.js', import.meta.url), 'utf8')).match(/const MIGRATIONS = \[([^\]]*)\]/)[1].match(/'[^']+\.sql'/g).map((name) => name.slice(1, -5));
  assert.ok(migrations.includes('037_let-apple-answer-an-android-phone'));
  for (const name of migrations) {
    await pool.query(await readFile(new URL(`../server/migrations/${name}.sql`, import.meta.url), 'utf8'));
  }
  const now = Date.parse('2026-10-12T12:00:00Z');
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...keys.publicKey.export({ format: 'jwk' }), kid: 'apple-e2e', alg: 'RS256', use: 'sig' };
  const signed = (claims) => {
    const part = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const head = part({ alg: 'RS256', kid: 'apple-e2e' });
    const body = part({ iss: 'https://appleid.apple.com', iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + 600, ...claims });
    return `${head}.${body}.${sign('RSA-SHA256', Buffer.from(`${head}.${body}`), keys.privateKey).toString('base64url')}`;
  };
  const exchanged = [];
  const fetch = async (url, init) => {
    if (url === 'https://appleid.apple.com/auth/keys') return Response.json({ keys: [jwk] });
    const form = Object.fromEntries(new URLSearchParams(String(init.body)));
    exchanged.push(form);
    return Response.json({ refresh_token: `rt-${form.code}`, id_token: signed({ aud: form.client_id, sub: 'person-1' }) });
  };
  const config = loadConfig({ NODE_ENV: 'test', SESSION_SECRET: 's'.repeat(32), AUDIT_HMAC_KEY: 'a'.repeat(32), ACCOUNT_ORIGIN: 'https://app.together-ledger.com', APPLE_ANDROID_REDIRECT_URI: ANDROID_RETURN });
  const signInKey = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const apple = new AppleSignIn({ teamId: '769MBW6826', keyId: '985BDXJP8S', privateKey: signInKey.privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'), encryptionKey: randomBytes(32).toString('base64'), redirectUri: config.APPLE_WEB_REDIRECT_URI, fetch, now: () => now });
  const identity = new IdentityVerifier({ googleClientIds: [], appleClientIds: config.appleClientIds, fetch, now: () => now });
  const platform = new PlatformService({ pool, config, mailer: new MemoryMailer(), now: () => new Date(now), identity, apple });
  const app = await buildApp({ platform, config });
  // The phone's client, talking to the server in memory.
  const phone = (held = null) => {
    const tokens = { read: async () => held, write: async (value) => { held = value; }, clear: async () => { held = null; } };
    return createAccountClient({ base: () => 'http://phone.test/api/v1', tokens, fetch: async (url, init) => {
      const response = await app.inject({ method: init.method || 'GET', url: url.replace('http://phone.test', ''), headers: init.headers, payload: init.body });
      return { ok: response.statusCode < 300, status: response.statusCode, json: async () => response.json() };
    } });
  };

  // The account opens on an iPhone, with Apple's sheet: the App ID.
  const iphone = phone();
  const opened = await iphone.signInWithApple({ idToken: signed({ aud: 'com.togetherledger.ledger', sub: 'person-1', email: 'person@example.test' }), authorizationCode: 'iphone-code', displayName: 'Asha' });

  // On Android the server offers Apple through the browser.
  const android = phone();
  const offered = await android.providers('android', null);
  assert.deepEqual(offered.apple, { clientId: 'com.togetherledger.ledger.web', redirectUri: ANDROID_RETURN });
  assert.equal(social.offeredSignIns('android', offered).apple, true);

  // The phone's secrets, the page it opens, and Apple's form to the Return URL.
  const verifier = social.base64url(new Uint8Array(randomBytes(32)));
  const nonce = social.base64url(new Uint8Array(randomBytes(32)));
  const page = new URL(social.appleAuthorizationUrl({ clientId: offered.apple.clientId, redirectUri: offered.apple.redirectUri, state: sha(verifier), nonce: sha(nonce) }));
  const answered = await app.inject({
    method: 'POST', url: new URL(page.searchParams.get('redirect_uri')).pathname,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    payload: new URLSearchParams({ state: page.searchParams.get('state'), code: 'android-code', id_token: signed({ aud: page.searchParams.get('client_id'), sub: 'person-1', nonce: page.searchParams.get('nonce') }) }).toString(),
  });
  assert.equal(answered.statusCode, 303);
  assert.ok(social.isAppleReturn(answered.headers.location), 'the tab is sent to the link the app claims');

  // The phone collects and signs in, as the component does.
  const returned = await android.collectAppleReturn({ verifier, nonce });
  const body = await social.appleSignInBody(social.appleCredentialFrom(returned), memoryKept());
  const user = await android.signInWithApple({ ...body, returnedTo: 'android' });
  assert.equal(user.id, opened.id, 'the same account the iPhone opened');
  assert.equal(user.displayName, 'Asha');
  assert.ok(await android.session(), 'and the phone is signed in');
  // Collected once: the same secrets get nothing the second time.
  await assert.rejects(android.collectAppleReturn({ verifier, nonce }), (error) => error.code === 'apple_not_returned');
  assert.deepEqual(exchanged.map((form) => form.client_id), ['com.togetherledger.ledger'], 'a returning account is not exchanged again');
});

// ---------------------------------------------------------------------------------------------
// What a new account is called (#399)

const NEW_ACCOUNT_NAME = 'A new account starts with your first name. You can change it in Account settings.';

test('under the buttons, and only with them, the phone says a new account starts with the first name', async () => {
  assert.equal(social.NEW_ACCOUNT_NAME, NEW_ACCOUNT_NAME, 'the words approved on Oct 12, 2026');
  const component = await read('src/components/social-sign-in.tsx');
  const nothing = component.indexOf('if (!offer.google && !offer.apple) return null;');
  const linking = component.indexOf('if (link) {');
  const google = component.indexOf('<GoogleButton ');
  const said = component.indexOf('<Text style={[styles.hint, { color: theme.colors.muted }]}>{NEW_ACCOUNT_NAME}</Text>');
  const or = component.indexOf('>or</Text>');
  assert.ok(nothing > 0 && linking > nothing, 'no buttons offered, or a password being asked for, returns before it');
  assert.ok(component.indexOf('<AppleAuthentication.AppleAuthenticationButton') < google && google < said && said < or, 'below both buttons, above "or"');
  // On Android, below Apple's browser sign-in too (#400), so it is said wherever Apple is offered.
  const androidApple = component.indexOf('<AppleButton ');
  assert.ok(androidApple > linking && androidApple < google && androidApple < said, 'below Android\'s Apple button');
  assert.equal(component.split('{NEW_ACCOUNT_NAME}').length, 2, 'said once');
  // In a field hint's size and the theme's muted colour, as wide as the buttons.
  assert.match(await read('src/components/ui.tsx'), /hint: \{ fontSize: 13, lineHeight: 18 \}/);
  assert.match(component, /hint: \{ fontSize: 13, lineHeight: 18, width: '100%', maxWidth: PROVIDER_BUTTON\.maxWidth, alignSelf: 'center' \}/);
  // The one component is what Sign in and Create account show, on an iPhone and on Android.
  for (const screen of ['app/account.tsx', 'app/register.tsx']) assert.match(await read(screen), /<SocialSignIn\b/, screen);
  // The web says the same words under its own buttons.
  const web = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(web.includes(`<small id="social-sign-in-name" class="provider-hint">${NEW_ACCOUNT_NAME}</small>`));
});
