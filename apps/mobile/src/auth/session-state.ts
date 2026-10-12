import type { AccountUser } from '../api/client';
import { t } from '../i18n/sentences.js';

/**
 * Who this phone is signed in as, as far as it can tell (#352). Kept free of React so the rules
 * can be tested as they are (tests/mobile-account.test.js).
 *
 * `offline` is not `signed-out`. The phone still holds its tokens; the service just could not be
 * asked (`offline`) or did not answer (`unreachable`). Only a refusal signs anyone out.
 */
export type OfflineReason = 'offline' | 'unreachable';

export type SessionState =
  | { status: 'loading'; user: null }
  | { status: 'signed-out'; user: null }
  | { status: 'offline'; user: null; reason: OfflineReason }
  | { status: 'signed-in'; user: AccountUser };

export function sessionAnswered(user: AccountUser | null): SessionState {
  return user ? { status: 'signed-in', user } : { status: 'signed-out', user: null };
}

/**
 * A check that failed. A refusal signs out. Anything else keeps whoever was signed in, and a
 * phone that had not yet heard back (opening the app without a connection) is offline, not signed
 * out: the account client only fails a check while it still holds tokens.
 */
export function sessionFailed(current: SessionState, error: unknown): SessionState {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'authentication_required') return { status: 'signed-out', user: null };
  if (current.status === 'signed-in') return current;
  return { status: 'offline', user: null, reason: code === 'offline' ? 'offline' : 'unreachable' };
}

/** Words for each reason, read in the active language as they are drawn. */
function byReason(keys: Readonly<Record<OfflineReason, string>>): Readonly<Record<OfflineReason, string>> {
  return Object.freeze({ get offline() { return t(keys.offline); }, get unreachable() { return t(keys.unreachable); } });
}

/** What the phone says while it holds a sign-in it cannot check, short enough for Settings. */
export const STILL_SIGNED_IN = byReason({ offline: 'mobile.offline.stillSignedIn', unreachable: 'mobile.offline.stillSignedInUnreachable' });

/** The ledger in place of its journeys, which are not kept on the phone in v1 (#352, #360). */
export const LEDGER_WHILE_OFFLINE = byReason({ offline: 'mobile.offline.ledger', unreachable: 'mobile.offline.unreachableHere' });

/** The account screen in place of the sign-in form, which this phone does not need. */
export const ACCOUNT_WHILE_OFFLINE = byReason({ offline: 'mobile.offline.account', unreachable: 'mobile.offline.unreachableHere' });
