import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import type { AppleReturn } from '../api/client';
import { APPLE_RETURN_LINK, appleAuthorizationUrl, base64ToBase64url, base64url, stillCollectable, type PendingAppleSignIn } from './social-sign-in';

/**
 * Sign in with Apple on Android (#400): Apple's own page in the system's browser tab (Custom Tabs),
 * never a web view of our own, which Apple's guidelines and Google's both refuse for sign-in. The
 * rules, and why the address that brings the tab back carries nothing, are in social-sign-in.ts.
 *
 * The two secrets are kept in the keystore until they are spent, beside the sign-in tokens and on
 * the same terms (never in plain storage, never in a backup: plugins/with-tokens-out-of-backup.js),
 * so a phone that stopped the app while the tab was open can still finish when the App Link starts
 * it again. They are spent once, when the phone collects, whatever the answer.
 */
const KEY = 'together-ledger.apple-browser-sign-in';
const OPTIONS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

async function sha256(value: string): Promise<string> {
  return base64ToBase64url(await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value, { encoding: Crypto.CryptoEncoding.BASE64 }));
}

/**
 * Opens Apple's page and resolves once the tab has handed back to the app: through the App Link,
 * or because the person closed it. Either way, whatever Apple answered is waiting on the server.
 */
export async function openAppleInBrowser(apple: { clientId: string; redirectUri: string }): Promise<void> {
  const pending: PendingAppleSignIn = { verifier: base64url(Crypto.getRandomBytes(32)), nonce: base64url(Crypto.getRandomBytes(32)), startedAt: Date.now() };
  await SecureStore.setItemAsync(KEY, JSON.stringify(pending), OPTIONS);
  const url = appleAuthorizationUrl({ clientId: apple.clientId, redirectUri: apple.redirectUri, state: await sha256(pending.verifier), nonce: await sha256(pending.nonce) });
  // In the app's own task, so the App Link coming back closes the tab instead of leaving it open
  // behind the app.
  await WebBrowser.openAuthSessionAsync(url, APPLE_RETURN_LINK, { createTask: false });
}

/**
 * Collects Apple's answer for the sign-in this phone started, spending its secrets. Null when none
 * was started, it is past the server's ten minutes, or Apple hasn't answered (the person closed the
 * tab or chose Cancel), all of which is the person changing their mind and says nothing.
 */
export async function collectAppleAnswer(collect: (secrets: { verifier: string; nonce: string }) => Promise<AppleReturn>): Promise<AppleReturn | null> {
  const stored = await SecureStore.getItemAsync(KEY, OPTIONS).catch(() => null);
  if (!stored) return null;
  await SecureStore.deleteItemAsync(KEY, OPTIONS).catch(() => {});
  let pending: unknown = null;
  try {
    pending = JSON.parse(stored);
  } catch {
    return null;
  }
  if (!stillCollectable(pending, Date.now())) return null;
  try {
    return await collect({ verifier: pending.verifier, nonce: pending.nonce });
  } catch (error) {
    if ((error as { code?: unknown } | null)?.code === 'apple_not_returned') return null;
    throw error;
  }
}
