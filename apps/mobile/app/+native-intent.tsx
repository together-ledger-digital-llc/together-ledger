import { isAppleReturn } from '../src/auth/social-sign-in';
import { openedInvitation, INVITATION_PATH } from '../src/invitations/invitation-link';

/**
 * A link the phone was opened with, before the router reads it (#266). The https links this app
 * claims (app.json: associatedDomains, intentFilters) are an invitation's and, on Android, the
 * browser tab handing back from Sign in with Apple (#400). An invitation's code is after the #,
 * which the router would drop, so it is handed to the invitation screen, which keeps it on this
 * phone. Apple's hand-back carries nothing: the sign-in screen that opened the tab finishes the
 * sign-in where it is, so the router goes nowhere; if Android had stopped the app meanwhile, the
 * app starts on the account screen, which finishes it. Every other link goes on as it came.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  if (isAppleReturn(path)) return initial ? '/account' : null;
  const code = openedInvitation(path);
  if (code === undefined) return path;
  return code ? `${INVITATION_PATH}?code=${encodeURIComponent(code)}` : INVITATION_PATH;
}
