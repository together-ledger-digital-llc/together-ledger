import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { APP_SITE_ASSOCIATION, appSiteAssociationProblems, APPLE_APP_ID, ASSET_LINKS, assetLinksProblems, INVITATION_PATH } from '../scripts/app-links.mjs';
import { INVITATION_PATH as MAILED_PATH } from '../server/mailer.js';

// A tapped invitation opens the phone app when it is installed, and the website when it isn't:
// one link everywhere (#266). Apple and Android each read a file from the website to allow it, and
// both fail silently when it is wrong, so what they say is held here. Proving it on a real phone,
// by tapping a real link, is still the owner's step (the PR lists it).

const root = fileURLToPath(new URL('..', import.meta.url));
const publicFile = (path) => readFileSync(join(root, 'public', path), 'utf8');
const app = JSON.parse(readFileSync(join(root, 'apps/mobile/app.json'), 'utf8')).expo;

test('the invitation path is the same in the email, the website and the phone', async () => {
  assert.equal(INVITATION_PATH, '/invite');
  assert.equal(MAILED_PATH, INVITATION_PATH);
  assert.match(readFileSync(join(root, 'src/app.js'), 'utf8'), /const INVITATION_PATH = '\/invite';/);
  assert.match(readFileSync(join(root, 'apps/mobile/src/invitations/invitation-link.ts'), 'utf8'), /export const INVITATION_PATH = '\/invite';/);
});

test('apple-app-site-association names this app and claims the invitation path and nothing else', () => {
  const text = publicFile(APP_SITE_ASSOCIATION);
  assert.deepEqual(appSiteAssociationProblems(text), []);
  assert.deepEqual(JSON.parse(text), {
    applinks: {
      details: [{
        appIDs: ['769MBW6826.com.togetherledger.ledger'],
        components: [{ '/': '/invite', comment: 'Invitation links only (#266). The code is after the #. Verification and recovery links stay on the web.' }],
      }],
    },
  });
  assert.equal(APPLE_APP_ID, `769MBW6826.${app.ios.bundleIdentifier}`, 'the Team ID and the bundle identifier the app is built with');
  // What must never be claimed: the home page, where verification and recovery links land.
  for (const wrong of [
    { '/': '*' }, { '/': '/' }, { '/': '/*' }, { '/': '/invite*' }, { '/': '/invite', '#': '*' },
  ]) {
    const claimed = JSON.stringify({ applinks: { details: [{ appIDs: [APPLE_APP_ID], components: [wrong] }] } });
    assert.notDeepEqual(appSiteAssociationProblems(claimed), [], JSON.stringify(wrong));
  }
  assert.notDeepEqual(appSiteAssociationProblems(JSON.stringify({ applinks: { details: [{ appIDs: [APPLE_APP_ID], paths: ['*'] }] } })), []);
  assert.notDeepEqual(appSiteAssociationProblems('{'), []);
});

// From Play Console > Protected with Play > Play Store protection > Manage Play app signing
// (owner, Oct 11, 2026). Public values: they identify the keys, they do not unlock them.
const PLAY_FINGERPRINTS = [
  // The app signing key Play shows as in use: what Play-installed copies are signed with.
  '76:7F:38:14:1D:35:22:B5:8E:33:1B:5A:F0:02:4A:51:B4:58:BB:89:33:5E:27:DF:78:DB:5B:4F:7F:CD:69:33',
  // The previous app signing key (Sep 30, classical): copies installed before the change may still carry it.
  'F2:96:8A:30:A2:60:0F:12:EF:BD:A9:A6:7B:3E:90:34:68:9F:26:37:03:A1:D1:5B:76:2F:05:0C:60:D3:A2:AF',
  // The upload key: what EAS signs a store build with before Play re-signs it. Never the phone
  // test APK's public debug key (.github/workflows/phone-test-apk.yml).
  '89:F0:56:3B:00:E0:8C:F5:38:F1:9F:89:09:C1:E8:3D:E1:B3:B6:94:93:0D:EB:31:EE:57:E7:C2:AA:FB:BC:7B',
];

test('assetlinks.json names this app with the three Play certificate fingerprints, and refuses a placeholder or a malformed one', () => {
  const text = publicFile(ASSET_LINKS);
  const [statement] = JSON.parse(text);
  assert.equal(statement.target.package_name, app.android.package);
  assert.deepEqual(statement.relation, ['delegate_permission/common.handle_all_urls']);
  assert.deepEqual(statement.target.sha256_cert_fingerprints, PLAY_FINGERPRINTS);
  assert.deepEqual(assetLinksProblems(text), []);

  const withFingerprints = (fingerprints) => JSON.stringify([{ ...statement, target: { ...statement.target, sha256_cert_fingerprints: fingerprints } }]);
  const [inUse] = PLAY_FINGERPRINTS;
  assert.match(assetLinksProblems(withFingerprints([])).join(), /no certificate fingerprint/, 'never shipped empty');
  assert.match(assetLinksProblems(withFingerprints(['OWNER-TO-SUPPLY: Play Console > App signing key certificate > SHA-256'])).join(), /placeholder/);
  assert.match(assetLinksProblems(withFingerprints([inUse, 'OWNER-TO-SUPPLY'])).join(), /placeholder/, 'one filled in and one left is still refused');
  assert.match(assetLinksProblems(withFingerprints([inUse.toLowerCase()])).join(), /not a SHA-256/, 'upper-case, as Play shows it');
  assert.match(assetLinksProblems(withFingerprints([inUse.slice(3)])).join(), /not a SHA-256/, '31 pairs');
  assert.match(assetLinksProblems(withFingerprints([`${inUse}:00`])).join(), /not a SHA-256/, '33 pairs');
  assert.match(assetLinksProblems(withFingerprints([inUse.replaceAll(':', '')])).join(), /not a SHA-256/, 'no colons');
  assert.match(assetLinksProblems(withFingerprints([inUse.replace('76', '7G')])).join(), /not a SHA-256/, 'not hex');
  assert.match(assetLinksProblems(withFingerprints([` ${inUse}`])).join(), /not a SHA-256/, 'stray space');
  const otherPackage = JSON.stringify([{ ...statement, target: { ...statement.target, package_name: 'com.example.other' } }]);
  assert.match(assetLinksProblems(otherPackage).join(), /must name com\.togetherledger\.ledger/);
  assert.notDeepEqual(assetLinksProblems('{'), []);
});

test('the app-links script passes on the committed files', () => {
  const said = execFileSync(process.execPath, [join(root, 'scripts/app-links.mjs')], { encoding: 'utf8' });
  assert.match(said, /assetlinks\.json names com\.togetherledger\.ledger with 3 certificate fingerprints/);
});

test('each file is served as application/json: Apple\'s by a rule, Android\'s by its extension', () => {
  const headers = publicFile('_headers');
  const rules = new Map();
  let path = null;
  for (const line of headers.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    if (!/^\s/.test(line)) { path = line.trim(); rules.set(path, []); continue; }
    rules.get(path).push(line.trim());
  }
  assert.deepEqual(rules.get('/.well-known/apple-app-site-association'), ['Content-Type: application/json']);
  // A rule here would label the app page as JSON at that address while the file is left out.
  assert.equal(rules.has('/.well-known/assetlinks.json'), false);
  assert.ok(ASSET_LINKS.endsWith('.json'));
  // The local server and the capture both type a .json file the same way.
  assert.match(readFileSync(join(root, 'scripts/dev.mjs'), 'utf8'), /'\.json': 'application\/json'/);
});

test('the assembled site carries both link files as written', () => {
  const out = mkdtempSync(join(tmpdir(), 'tl-site-'));
  try {
    execFileSync(process.execPath, [join(root, 'scripts/build-public-site.mjs'), '--out', join(out, '_site')], { encoding: 'utf8' });
    assert.equal(readFileSync(join(out, '_site', APP_SITE_ASSOCIATION), 'utf8'), publicFile(APP_SITE_ASSOCIATION));
    assert.equal(readFileSync(join(out, '_site', ASSET_LINKS), 'utf8'), publicFile(ASSET_LINKS));
    assert.ok(existsSync(join(out, '_site', 'index.html')));
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('the phone claims the same one link: Associated Domains on iOS, a verified App Link on Android', () => {
  assert.deepEqual(app.ios.associatedDomains, ['applinks:app.together-ledger.com']);
  assert.deepEqual(app.android.intentFilters, [{
    action: 'VIEW',
    autoVerify: true,
    data: [{ scheme: 'https', host: 'app.together-ledger.com', path: '/invite' }],
    category: ['BROWSABLE', 'DEFAULT'],
  }]);
  // Its own scheme is unchanged, and no other web address is claimed.
  assert.equal(app.scheme, 'togetherledger');
  assert.doesNotMatch(JSON.stringify(app), /pathPrefix|pathPattern|applinks:(?!app\.together-ledger\.com)|webcredentials/);
});
