import { t } from '../i18n/sentences.js';

/**
 * Every screen's title, held once, so a back button can name the screen it goes back to (#411).
 * On the iPhone the back button otherwise took its words from the system, which, coming from the
 * headerless welcome, named the screen the person was already on. Each is read in the active
 * language as it is drawn (locales/en.json).
 */
const SCREEN_TITLE_KEYS = {
  index: 'mobile.screen.welcome.title',
  ledger: 'mobile.screen.ledger.title',
  settings: 'mobile.screen.settings.title',
  account: 'common.account.settings',
  register: 'register.form.title',
  recovery: 'mobile.screen.recovery.title',
  'recovery-confirm': 'mobile.screen.recovery.title',
  'verify-email': 'mobile.screen.verifyEmail.title',
  'change-password': 'mobile.screen.changePassword.title',
  invite: 'mobile.screen.invite.title',
  'delete-account': 'mobile.screen.deleteAccount.title',
  moment: 'moment.form.title',
  'new-journey': 'mobile.screen.newJourney.title',
  'journey-settings': 'sharing.section.title',
  history: 'history.screen.name',
  'history-guide': 'common.historyGuide.title',
  privacy: 'mobile.screen.privacy.title',
  terms: 'mobile.screen.terms.title',
  concern: 'mobile.screen.concern.title',
} as const;

export type ScreenName = keyof typeof SCREEN_TITLE_KEYS;

/** A screen's title, in the active language. */
export function screenTitle(name: ScreenName): string {
  return t(SCREEN_TITLE_KEYS[name]);
}

/** Every screen's title in the active language, read as it is asked for. */
export const SCREEN_TITLES = Object.freeze(Object.defineProperties({}, Object.fromEntries(
  (Object.keys(SCREEN_TITLE_KEYS) as ScreenName[]).map((name) => [name, { enumerable: true, get: () => screenTitle(name) }]),
))) as Readonly<Record<ScreenName, string>>;

/**
 * The gear before the word on the Settings door (owner, Oct 12, 2026; #399), understood in any
 * language and never shown without the word. It is the platform's own ⚙ symbol, drawn as text
 * (U+FE0E asks for that rather than a colour emoji) so it takes the word's size and colour on
 * every theme, and no icon font is bundled for it. Screen readers read the word, not the gear.
 */
export const SETTINGS_GLYPH = '\u2699\uFE0E';

type Route = { key: string; name: string };

/**
 * What a screen's back button says: the title of the screen under it in the stack, which is
 * where it goes. Never the screen's own title. Nothing under it, nothing to say.
 */
export function backLabel(routes: readonly Route[] | undefined, key: string): string | undefined {
  const at = routes?.findIndex((route) => route.key === key) ?? -1;
  if (at < 1 || !routes) return undefined;
  const below = routes[at - 1].name;
  return below in SCREEN_TITLE_KEYS ? screenTitle(below as ScreenName) : undefined;
}

/** How the label is read aloud, where the phone draws the back button itself (Android). */
export function backAccessibilityLabel(label: string) {
  return t('mobile.navigation.backTo', { screen: label });
}

export type SettingsSection = 'appearance' | 'language' | 'journey' | 'account';

/**
 * Settings' groups, in order (owner, Oct 12, 2026; #399). Language follows Appearance whenever
 * there is more than one language to choose (103A). The journey's own group shows only while a
 * journey is open; Account settings is always there, and says how to sign in when no one is.
 * Privacy, Terms and Help follow every group, for everyone, as quiet links.
 */
export function settingsSections({ journeyOpen, languages = false }: { journeyOpen: boolean; languages?: boolean }): SettingsSection[] {
  return [
    'appearance' as const,
    ...(languages ? ['language' as const] : []),
    ...(journeyOpen ? ['journey' as const] : []),
    'account' as const,
  ];
}

/**
 * Whether the language choice is shown, on the welcome and in Settings: only once there is more
 * than English to choose, approved or in preview. Until then nothing changes for anyone.
 */
export function languageChoiceShown(offered: readonly { tag: string }[]): boolean {
  return offered.length > 1;
}

export type LanguageOption = {
  /** The tag chosen, or null for "Follow my device". */
  choice: string | null;
  /** The language's own name, in its own script, never translated; or "Follow my device". */
  label: string;
  /** The language the label is written in, for screen readers; undefined for "Follow my device". */
  lang?: string;
  /** Shown with the word Preview beside it (decision 145). */
  preview: boolean;
};

/**
 * The language choices, in order: "Follow my device" (in the language the app is in), then each
 * language in its own name and script from the manifest's nativeName. A language in preview says
 * so; an approved one doesn't. Draft and in-review languages are never among them.
 */
export function languageOptions(offered: readonly { tag: string; nativeName: string; preview?: boolean }[]): LanguageOption[] {
  return [
    { choice: null, label: t('common.language.followDevice'), preview: false },
    ...offered.map(({ tag, nativeName, preview }) => ({ choice: tag, label: nativeName, lang: tag, preview: Boolean(preview) })),
  ];
}

/** The journey's group heading, on screen and read aloud alike (owner, decision 122). */
export function journeySettingsHeading(name: string) {
  return t('mobile.settings.journeyHeading', { journey: name });
}

export type AccountRow = 'person' | 'restore' | 'delete' | 'still-signed-in' | 'sign-in';

/**
 * The rows under Account settings for each state of the session (owner, decisions 120 and 131).
 * Only a signed-in phone has an account to show. Offline it is still signed in and says so. Anyone
 * else, a fresh install or a phone still asking, gets one row and nothing under it.
 */
export function accountSettingsRows(status: 'loading' | 'signed-out' | 'offline' | 'signed-in'): AccountRow[] {
  if (status === 'signed-in') return ['person', 'restore', 'delete'];
  if (status === 'offline') return ['still-signed-in'];
  return ['sign-in'];
}
