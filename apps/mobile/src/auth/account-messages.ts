import { serverError, t } from '../i18n/sentences.js';

/**
 * What the phone says about accounts, in the web's words (src/app.js). The copy is careful on
 * purpose, so it is carried over, not rewritten. A server error is said by its code, in the active
 * language (docs/TRANSLATION.md, "Server errors"); a code with no sentence yet is said in the
 * server's own words, exactly as the web does, with one exception below.
 */
export const accountFallbackMessage = () => t('status.banner.accountService');

/**
 * The one place the phone does not use the server's words. When a moment has no room for another
 * place or photo, the web's message points at a monthly add-on paid on the web. The app must never
 * point to a web payment (#268; Apple 3.1.1 and 3.1.3). The phone sells room through the App Store
 * and Google Play (#267); until that is built (TL-P-05 onward), it says only what stays true: room
 * belongs to the journey, the same on every device. Once built, this is where it is offered.
 */
export const NO_ROOM_ADDED_HERE: Readonly<Record<string, string>> = Object.freeze({
  get location_payment_required() { return t('mobile.moment.noRoomForPlace'); },
  get image_payment_required() { return t('mobile.moment.noRoomForPhoto'); },
  get not_from_the_app() { return t('mobile.error.notFromTheApp'); },
});

/**
 * An account or service error in the active language. `area` names the screen's own sentences for
 * a code whose words differ from screen to screen (error.signIn, error.moment).
 */
export function accountMessage(error: unknown, area?: string): string {
  if (error && typeof error === 'object' && 'code' in error && 'message' in error && typeof error.message === 'string') {
    if (typeof error.code === 'string' && Object.hasOwn(NO_ROOM_ADDED_HERE, error.code)) return NO_ROOM_ADDED_HERE[error.code];
    return serverError(error, error.message, area);
  }
  return accountFallbackMessage();
}

/**
 * The service's errors the phone says in the active language, by their code (docs/TRANSLATION.md,
 * "Server errors"): each code here has one sentence wherever it is raised. A code whose words
 * differ by screen is read under that screen's area (error.signIn, error.moment). Every other
 * code is still said in the service's own English words.
 */
export const TRANSLATED_ERRORS = Object.freeze([
  'error.server.authenticationRequired',
  'error.server.rateLimitExceeded',
  'error.server.accountExists',
  'error.server.emailInUse',
  'error.server.identityInUse',
  'error.signIn.invalidCredentials',
  'error.moment.conflict',
  'error.server.accountsUnavailable',
  'error.client.fallback',
  'mobile.error.offline',
  'mobile.error.unreachable',
] as const);

const NOTICE_KEYS = {
  registered: 'register.form.created',
  registeredEmailDelayed: 'register.form.createdDelayed',
  verificationResent: 'common.account.verificationResent',
  verificationDelayed: 'common.account.verificationDelayed',
  verified: 'signIn.toast.emailVerified',
  recoverySent: 'common.account.recoverySent',
  passwordChanged: 'common.account.passwordChanged',
  passwordsDiffer: 'common.account.passwordsDiffer',
  signedOut: 'signIn.toast.signedOut',
  // #194, in the web's words (src/app.js).
  signedOutEverywhere: 'common.account.signedOutEverywhere',
  signedOutHere: 'signIn.status.signedOutHere',
  passwordChangedHere: 'common.account.passwordChangedHere',
  deleted: 'common.account.deleted',
} as const;

/** What the account screens say once something is done, each read in the active language. */
export const ACCOUNT_NOTICES = Object.freeze(Object.defineProperties({}, Object.fromEntries(
  Object.entries(NOTICE_KEYS).map(([name, key]) => [name, { enumerable: true, get: () => t(key) }]),
))) as Readonly<Record<keyof typeof NOTICE_KEYS, string>>;
