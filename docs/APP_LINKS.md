# Invitation links on the phone

An invitation link opens the phone app when it is installed, and the website when it isn't: one link everywhere (#266). This page says what is claimed, what the owner sets up once, and how to check it on a real phone. Both platforms fail **silently** when something is wrong: the link just opens the browser. Reading the config proves nothing; tapping a real link on a real phone does.

## What is claimed

Only an invitation's own path: `https://app.together-ledger.com/invite`. The code is after the #, as `/invite#invite=<code>`, and is never in the path or the query (owner, Oct 10, 2026). Verification links (`/#verify=…`) and recovery links (`/#recovery=…`) stay on the web, and the app does not claim them.

Invitations have their own path because Android's App Links match a path but never what follows the #. A link at `/` could only be claimed together with every verification and recovery link.

| Where | What | File |
|---|---|---|
| Email | `https://app.together-ledger.com/invite#invite=<code>` | `server/mailer.js` (`INVITATION_PATH`) |
| Website | `/invite` is the app page; it reads the code, takes it out of the address and goes back to `/`. Every older shape still works: `/#invite=` and `/?invite=` | `src/app.js`, `wrangler.jsonc` (single-page fallback) |
| iPhone | `associatedDomains: ["applinks:app.together-ledger.com"]` | `apps/mobile/app.json` |
| iPhone | `/.well-known/apple-app-site-association`, served as `application/json`, for `769MBW6826.com.togetherledger.ledger`, claiming `/invite` only | `public/.well-known/`, `public/_headers` |
| Android | One `autoVerify` intent filter for `https://app.together-ledger.com/invite` | `apps/mobile/app.json` |
| Android | `/.well-known/assetlinks.json` (`application/json` from its extension) | `public/.well-known/assetlinks.json` |
| Phone | Reads the code from the opened link (`app/+native-intent.tsx`), keeps it in the keychain until it is answered (`src/invitations/`), and shows the invitation (`app/invite.tsx`) | `apps/mobile/` |

`scripts/app-links.mjs` says what each file must hold. The build checks them, the release gate checks them (`scripts/verify-release-bundle.mjs`), and so does `tests/app-links.test.js`.

## What the owner sets up once

### Apple: Associated Domains on the App ID

Capability sync is off in this repository (`EXPO_NO_CAPABILITY_SYNC=1`, `docs/IOS_RELEASE.md`), so EAS will not turn this on, and a build whose entitlements ask for it fails to sign without it.

1. developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → `com.togetherledger.ledger`.
2. Tick **Associated Domains**. Leave Sign in with Apple on. Save.
3. Run the next iOS build as usual. A provisioning profile made before the capability was on doesn't carry it; if the build says so, let EAS make a new one when it offers to. **Not confirmed:** whether EAS does that without being asked.

No domain is entered in the portal. The domain comes from the app's entitlements and the website's file.

### Google: the certificate fingerprints (done Oct 11, 2026)

`public/.well-known/assetlinks.json` names `com.togetherledger.ledger` with three SHA-256 certificate fingerprints, copied from Play Console by the owner. They are public values: they identify the keys and unlock nothing.

| Fingerprint | Key | Why it is listed |
|---|---|---|
| `76:7F:38:…:CD:69:33` | App signing key, **shown by Play as in use** | What Play-installed copies are signed with now |
| `F2:96:8A:…:D3:A2:AF` | Previous app signing key (Sep 30, classical) | Copies installed before the current key took over, and older Android versions after a key upgrade, may still be signed with it. **Not confirmed** which phones, so it stays listed |
| `89:F0:56:…:FB:BC:7B` | Upload key | What EAS signs a store build with before Play re-signs it, so an EAS build installed directly verifies too |

Where Play Console shows them has moved. It used to be **Test and release → App integrity**; it is now **Protected with Play → Play Store protection → Manage Play app signing**. If it moves again, look for the page that shows the app signing key and the upload key.

If a key changes (Play rotates the signing key, or a new upload key is registered), add its SHA-256 as shown there: upper-case hex pairs separated by colons (`AB:CD:…`, 32 pairs). Keep a key that copies in people's hands may still be signed with. `node scripts/app-links.mjs` checks the form, and the build and the release gate stop on a placeholder or a malformed value rather than ship without the file. `tests/app-links.test.js` holds the exact list, so a change there is deliberate.

## Checking it

**The files, once deployed** (from a browser or `curl`; Bot Fight Mode may refuse an automated client, which is why none of this is a gate):

- `https://app.together-ledger.com/.well-known/apple-app-site-association`: 200, `Content-Type: application/json`, no redirect.
- `https://app.together-ledger.com/.well-known/assetlinks.json`: 200, `application/json`, no redirect, the same three fingerprints as the committed file.
- What Apple's CDN holds: `https://app-site-association.cdn-apple.com/a/v1/app.together-ledger.com`. It can lag a deploy by hours.
- What Google sees: `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://app.together-ledger.com&relation=delegate_permission/common.handle_all_urls`.

**Not verified yet:** whether Cloudflare's Bot Fight Mode lets Apple's and Google's verifiers fetch the files. If either platform's check fails while the files look right in a browser, look at Security → Events for `/.well-known/` first.

**On a real phone**, with a build that carries this change. Each of #266's four cases:

| Case | Do | Expect |
|---|---|---|
| App installed, signed in | Tap an invitation link in Mail or Messages | The app opens on the invitation: who invited you, the journey, Join and Not now |
| App installed, signed out | Tap the link, then Sign in (or Create account, or Google, or Apple) | After signing in, the invitation again, not an empty ledger. A new account sees "Verify your email…"; after verifying in the browser and coming back, the invitation |
| App not installed | Tap the link | The website opens and handles it. Then install the app, open it, choose **Have an invitation?** and paste the link or the code |
| Desktop browser | Open the link | The website handles it, and the address ends at `/` |

Also check: tapping the same link again once joined says you're already in, and nothing changes; a verification or recovery link still opens the browser, not the app.

### Android: is the link verified?

Android checks `assetlinks.json` when the app is installed or updated, not when the website changes. A phone that installed the app before the file was live has to be told to check again, or the app updated or reinstalled.

**With a computer** (USB debugging on, the phone plugged in):

1. Install the app from Play (internal testing is fine), or update it. Not the phone test APK from Actions: it is signed with Expo's public debug key, which is deliberately not listed, so on it links always open the browser.
2. Ask Android to check again: `adb shell pm verify-app-links --re-verify com.togetherledger.ledger`
3. Wait about a minute, then: `adb shell pm get-app-links com.togetherledger.ledger`
4. Expect `app.together-ledger.com: verified`. `none` means it hasn't checked yet: wait and run step 3 again. `1024` or another number means it checked and failed: open the file in a browser and compare it with the committed one, then look at Cloudflare's Security → Events for `/.well-known/`.

**Without a computer:** Play Console → Together Ledger → **Deep links** (search Play Console for "Deep links" if the menu has moved). It lists `app.together-ledger.com` and says whether the web link is verified for the app.

**Either way, then tap a real invitation link** in Mail or Messages. It should open the app, not the browser. That is the only check that proves it.
