import type { AppleReturn, AppleSignInBody, SignInProviders } from '../api/client';

/**
 * Continue with Google and Apple on the phone (TL-S-04, #217): the rules, kept free of runtime
 * imports so they can be tested as they are (tests/mobile-social-sign-in.test.js). The buttons are
 * src/components/social-sign-in.tsx; Google's sign-in itself is src/auth/google-sheet.ts on an
 * iPhone and src/auth/google-sheet.android.ts on Android, and Apple's on Android is
 * src/auth/apple-browser.ts (#400).
 */
export type PhonePlatform = 'ios' | 'android';

/**
 * The Google client this phone's tokens are issued to, from its build's public config
 * (apps/mobile/eas.json, src/config/google.ts). On an iPhone that is the iOS client. On Android,
 * Google's library asks for a token issued to a web client (`requestIdToken(webClientId)`); the
 * Android client is registered with Google by package name and signing certificate, and never
 * appears in the app or the token. Anything that isn't a Google client ID counts as none.
 */
export function googleClientIdFor(platform: PhonePlatform, config: { ios?: string | null; web?: string | null }): string | null {
  const id = (platform === 'ios' ? config.ios : config.web)?.trim();
  return id && /^[\w-]+\.apps\.googleusercontent\.com$/.test(id) ? id : null;
}

export type Offer = { google: boolean; apple: boolean };
export const NOTHING_OFFERED: Offer = Object.freeze({ google: false, apple: false });

/**
 * Which buttons to show, from what the server says is ready for this phone. Nothing shows until
 * it has answered. On an iPhone it is both or neither: App Store guideline 4.8 asks for Sign in
 * with Apple wherever Google is offered, and Apple's sheet has to be there too. Android has no
 * Apple sheet; it signs in with Apple through Apple's page in the browser (#400), so it offers
 * Apple once the server names the Return URL that page answers to, and each of the two as the
 * server has it ready.
 */
export function offeredSignIns(platform: PhonePlatform, answer: SignInProviders | null, { appleSheet = false }: { appleSheet?: boolean } = {}): Offer {
  if (platform === 'android') return { google: Boolean(answer?.google), apple: Boolean(answer?.apple?.redirectUri) };
  if (!answer?.google) return NOTHING_OFFERED;
  return answer.apple && appleSheet ? { google: true, apple: true } : NOTHING_OFFERED;
}

/**
 * Sign in with Apple on Android (#400). Apple's page opens in the system's browser tab, for the
 * web's Services ID, and posts its answer to our server's Return URL (Apple's form_post, which the
 * name and email scopes require). The server keeps it under the state this phone sent and sends
 * the tab to APPLE_RETURN_LINK, which this app claims as a verified App Link (app.json), so the tab
 * hands back to the app. The address carries nothing: the phone then collects Apple's answer from
 * the server with the secret whose SHA-256 was the state, so a link that reached another app, or
 * stayed in the browser, would give nothing away. Closing the tab hands back too, and the phone
 * collects the same way.
 *
 * Two secrets, 32 random bytes each, never leave this phone except to our server when collecting:
 * - the verifier, whose SHA-256 is the state Apple echoes. Only this phone can collect the answer
 *   filed under it, and only once.
 * - the nonce, whose SHA-256 Apple signs into the ID token. The server refuses an answer whose
 *   token carries any other, so an answer posted under this phone's state by anyone else, with
 *   their own Apple sign-in, is never this phone's.
 */
export const APPLE_AUTHORIZATION_ENDPOINT = 'https://appleid.apple.com/auth/authorize';
export const APPLE_RETURN_HOST = 'app.together-ledger.com';
export const APPLE_RETURN_PATH = '/apple-sign-in';
export const APPLE_RETURN_LINK = `https://${APPLE_RETURN_HOST}${APPLE_RETURN_PATH}`;
/** How long the server keeps Apple's answer (server/platform.js), and so how long one is worth collecting. */
export const APPLE_RETURN_MS = 10 * 60 * 1000;

const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Bytes as base64url without padding, the encoding the server compares in. */
export function base64url(bytes: Uint8Array): string {
  let text = '';
  for (let at = 0; at < bytes.length; at += 3) {
    const [a, b = 0, c = 0] = [bytes[at], bytes[at + 1], bytes[at + 2]];
    const chunk = (a << 16) | (b << 8) | c;
    const length = Math.min(3, bytes.length - at) + 1;
    for (let index = 0; index < length; index += 1) text += BASE64URL[(chunk >> (18 - index * 6)) & 63];
  }
  return text;
}

/** Standard base64 (what expo-crypto digests in) as base64url without padding. */
export function base64ToBase64url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Apple's page, asking for the name and email, posted back to the server's Return URL. */
export function appleAuthorizationUrl({ clientId, redirectUri, state, nonce }: { clientId: string; redirectUri: string; state: string; nonce: string }): string {
  const params: [string, string][] = [
    ['response_type', 'code id_token'],
    ['response_mode', 'form_post'],
    ['client_id', clientId],
    ['redirect_uri', redirectUri],
    ['scope', 'name email'],
    ['state', state],
    ['nonce', nonce],
  ];
  return `${APPLE_AUTHORIZATION_ENDPOINT}?${params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')}`;
}

/** A sign-in this phone started in the browser, kept until it is collected (src/auth/apple-browser.ts). */
export type PendingAppleSignIn = { verifier: string; nonce: string; startedAt: number };

/** Whether a kept sign-in is still worth collecting: well formed, and inside the server's ten minutes. */
export function stillCollectable(pending: unknown, now: number): pending is PendingAppleSignIn {
  const kept = pending as Partial<PendingAppleSignIn> | null;
  const secret = /^[A-Za-z0-9_-]{43}$/;
  return Boolean(kept && typeof kept.verifier === 'string' && secret.test(kept.verifier) && typeof kept.nonce === 'string' && secret.test(kept.nonce)
    && typeof kept.startedAt === 'number' && now - kept.startedAt >= 0 && now - kept.startedAt <= APPLE_RETURN_MS);
}

/**
 * Whether a link the phone was opened with is the browser tab handing back from Apple
 * (+native-intent.tsx). The router may hand over a whole URL or only its path.
 */
export function isAppleReturn(opened: string): boolean {
  const match = /^(?:([a-z][a-z0-9+.-]*):\/\/([^/?#]*))?([^?#]*)/i.exec(opened.trim());
  if (!match) return false;
  const [, scheme, host = '', rawPath] = match;
  if (scheme && !(scheme.toLowerCase() === 'https' && host.toLowerCase() === APPLE_RETURN_HOST)) return false;
  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  return path.replace(/\/+$/, '') === APPLE_RETURN_PATH;
}

/** What the server collected for this phone, as the iPhone's sheet would give it to appleSignInBody(). */
export function appleCredentialFrom(returned: AppleReturn): AppleCredential {
  return {
    user: returned.user,
    identityToken: returned.idToken,
    authorizationCode: returned.authorizationCode,
    fullName: returned.displayName ? { givenName: returned.displayName } : null,
    email: null,
  };
}

/**
 * Google on an iPhone is the browser-based sign-in (owner, Oct 9, 2026): no Google SDK ships in the
 * iOS app, so its privacy manifest never does either. expo-auth-session opens Google's own page in
 * the system's sign-in sheet (ASWebAuthenticationSession) for the iOS client, with PKCE, and Google
 * returns to the iOS client's own scheme, the client ID reversed. The code is then exchanged with
 * Google for an ID token, by the phone, with the PKCE verifier and no secret, as an iOS client does.
 */
export const GOOGLE_AUTHORIZATION = Object.freeze({
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
});
export const GOOGLE_SCOPES: readonly string[] = Object.freeze(['openid', 'email', 'profile']);

/** Where Google returns to: `com.googleusercontent.apps.<id>:/oauthredirect`, or null for no client. */
export function googleRedirectUri(clientId: string | null): string | null {
  const match = /^([\w-]+)\.apps\.googleusercontent\.com$/.exec(clientId?.trim() ?? '');
  return match ? `com.googleusercontent.apps.${match[1]}:/oauthredirect` : null;
}

/**
 * What the browser sheet's answer means. Closing the sheet (`cancel`, `dismiss`), a second sheet
 * while one is open (`locked`), and declining on Google's page (`access_denied`) are all the
 * person changing their mind, and silent. A code is a sign-in to finish; anything else failed,
 * including a reply whose `state` didn't match, which expo-auth-session answers as an error.
 */
export function googleBrowserOutcome(result: unknown): { code: string } | 'cancelled' | 'failed' {
  const answer = result as { type?: unknown; params?: Record<string, unknown> } | null;
  if (answer?.type === 'cancel' || answer?.type === 'dismiss' || answer?.type === 'locked') return 'cancelled';
  if (answer?.type === 'error' && answer.params?.error === 'access_denied') return 'cancelled';
  const code = answer?.type === 'success' ? answer.params?.code : null;
  return typeof code === 'string' && code ? { code } : 'failed';
}

/** Closing Apple's sheet, or choosing Cancel in it, is silent (expo-apple-authentication). */
export function appleCancelled(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 'ERR_REQUEST_CANCELED';
}

/**
 * On Android, closing Google's sheet is silent too. The native library answers a cancel as `{ type: 'cancelled' }`,
 * and on some paths throws one of its status codes instead; a second tap while the first sheet is
 * still open (`IN_PROGRESS`) is nothing to tell anyone either.
 */
export function googleCancelled(outcome: unknown, quiet: readonly string[]): boolean {
  if ((outcome as { type?: unknown } | null)?.type === 'cancelled') return true;
  const code = (outcome as { code?: unknown } | null)?.code;
  return typeof code === 'string' && quiet.includes(code);
}

/** The ID token from a Google sign-in that finished, or null when there isn't one. */
export function googleIdToken(outcome: unknown): string | null {
  const data = (outcome as { type?: unknown; data?: { idToken?: unknown } } | null);
  return data?.type === 'success' && typeof data.data?.idToken === 'string' && data.data.idToken ? data.data.idToken : null;
}

export type AppleCredential = {
  user: string;
  identityToken: string | null;
  authorizationCode: string | null;
  fullName: { givenName?: string | null; familyName?: string | null } | null;
  email: string | null;
};

/**
 * Apple's first authorization, kept on this phone until the server has opened the account. Apple
 * gives the name only on the very first authorization; if that first sign-in doesn't reach our
 * server (no connection, the service out of reach, a password to enter first), the name would
 * otherwise be gone for good. The email isn't kept: the server takes it only from Apple's signed
 * ID token, which carries it on every authorization, never from what a phone says.
 */
export type KeptAppleName = { user: string; displayName: string };
export type KeptAppleNameStore = {
  read(): Promise<KeptAppleName | null>;
  write(kept: KeptAppleName): Promise<void>;
  clear(): Promise<void>;
};

/**
 * The name a new account starts with: the first name alone, and the full name only when Apple gives
 * no first name (#399, decided Oct 12, 2026). An empty string when Apple gives neither, and the
 * server falls back to the account's private handle.
 */
export function appleDisplayName(fullName: AppleCredential['fullName']): string {
  // Sent whole: the server keeps the first 80 characters a person sees, and never half of one
  // (cleanOptionalName() in server/platform.js), where cutting it here by length could split an
  // emoji or an accent.
  const [givenName, familyName] = [fullName?.givenName, fullName?.familyName].map((part) => part?.trim() ?? '');
  // Without a first name, the full name is the family name alone.
  return givenName || familyName;
}

/**
 * What goes to `POST /auth/apple`: the ID token, the one-time authorizationCode the server
 * exchanges so it can revoke the grant when the account is deleted (TL-S-05, #218), and the name
 * a new account starts with (appleDisplayName), whether it came now or was kept from an earlier
 * try. Null when Apple's answer is missing either credential.
 */
export async function appleSignInBody(credential: AppleCredential, kept: KeptAppleNameStore): Promise<AppleSignInBody | null> {
  const { identityToken: idToken, authorizationCode } = credential;
  if (!idToken || !authorizationCode) return null;
  let displayName = appleDisplayName(credential.fullName);
  if (displayName) {
    // Keeping it is a safeguard; a keychain that refuses it doesn't stop this sign-in.
    await kept.write({ user: credential.user, displayName }).catch(() => {});
  } else {
    const held = await kept.read().catch(() => null);
    if (held?.user === credential.user) displayName = held.displayName;
  }
  return displayName ? { idToken, authorizationCode, displayName } : { idToken, authorizationCode };
}

/** What an account opened with Apple shows instead of the placeholder it was given for no email. */
export const APPLE_SHARED_NO_EMAIL = 'Apple didn’t share an email address.';

/**
 * Such an account can't be sent anything, so it isn't offered a verification email (owner, Oct 9,
 * 2026). It is told where to write instead.
 */
export const NO_EMAIL_SUPPORT = 'For help with this account, write to ledger-support@together-ledger.com.';

// server/platform.js gives an account with no usable email `<provider>-<account id>@no-email.invalid`.
export function appleSharedNoEmail(email: string): boolean {
  return /^apple-[^@\s]+@no-email\.invalid$/i.test(email);
}

export function accountEmailLabel(email: string): string {
  return appleSharedNoEmail(email) ? APPLE_SHARED_NO_EMAIL : email;
}
