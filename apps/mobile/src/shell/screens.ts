/**
 * Every screen's title, held once, so a back button can name the screen it goes back to (#411).
 * On the iPhone the back button otherwise took its words from the system, which, coming from the
 * headerless welcome, named the screen the person was already on.
 */
export const SCREEN_TITLES = {
  index: 'Welcome',
  ledger: 'Ledger',
  settings: 'Settings',
  account: 'Account settings',
  register: 'Create account',
  recovery: 'Account recovery',
  'recovery-confirm': 'Account recovery',
  'verify-email': 'Verify email',
  'change-password': 'Change password',
  invite: 'Invitation',
  'delete-account': 'Delete account',
  moment: 'Hold a moment',
  'new-journey': 'New journey',
  'journey-settings': 'Journey sharing',
  history: 'History',
  'history-guide': 'How to read your history',
  privacy: 'Privacy',
  terms: 'Terms of use',
  concern: 'Return-to conversation',
} as const;

export type ScreenName = keyof typeof SCREEN_TITLES;

type Route = { key: string; name: string };

/**
 * What a screen's back button says: the title of the screen under it in the stack, which is
 * where it goes. Never the screen's own title. Nothing under it, nothing to say.
 */
export function backLabel(routes: readonly Route[] | undefined, key: string): string | undefined {
  const at = routes?.findIndex((route) => route.key === key) ?? -1;
  if (at < 1 || !routes) return undefined;
  const below = routes[at - 1].name;
  return below in SCREEN_TITLES ? SCREEN_TITLES[below as ScreenName] : undefined;
}

/** How the label is read aloud, where the phone draws the back button itself (Android). */
export function backAccessibilityLabel(label: string) {
  return `Back to ${label}`;
}

export type SettingsSection = 'appearance' | 'journey' | 'account';

/**
 * Settings' groups, in order (owner, Oct 12, 2026; #399). The journey's own group shows only while
 * a journey is open; Account settings is always there, and says how to sign in when no one is.
 * Privacy, Terms and Help follow every group, for everyone, as quiet links.
 */
export function settingsSections({ journeyOpen }: { journeyOpen: boolean }): SettingsSection[] {
  return journeyOpen ? ['appearance', 'journey', 'account'] : ['appearance', 'account'];
}

/** The journey's group is titled with its name, and read aloud as what it is. */
export function journeySettingsHeading(name: string) {
  return `Journey settings: ${name}`;
}
