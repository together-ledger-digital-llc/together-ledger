import { useLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSession } from '../auth/session';
import { loadScriptFonts, setActiveScript } from '../theme/fonts';
import { scriptOf } from '../theme/scripts';
import { activeLanguage, LISTED_LANGUAGES, readLanguageChoice, resolveActiveLanguage, setActiveLanguage, speechLanguageOf } from './index';

type LanguageValue = {
  /** The language the app reads in now. */
  active: string;
  /** A language chosen by hand, or null for "Follow my device". */
  choice: string | null;
  /**
   * Every language in the manifest, as the Language choice lists it (decision 160): approved
   * ones and previews may be chosen, the rest are coming soon.
   */
  listed: typeof LISTED_LANGUAGES;
  /** iOS's accessibilityLanguage for the active language, or undefined to leave VoiceOver's own. */
  speech: string | undefined;
  /** Chooses a language, or null to follow the phone: saved to the account when signed in. */
  choose: (choice: string | null) => Promise<void>;
};

const LanguageContext = createContext<LanguageValue | null>(null);

/**
 * The Language preference on the phone (101B). The language is the one chosen by hand, or else
 * the first of the phone's own languages the app offers, or else English (src/i18n/
 * language-choice.js). Before signing in, a choice is kept on this phone only. At sign-in it
 * carries into the account, unless the account already has one, which then wins; from then on the
 * account's choice is the one that counts, and this phone keeps a copy so the app opens in it.
 *
 * Read by Screen (src/components/ui.tsx) for the language VoiceOver speaks, and by every screen
 * that draws sentences, so a change redraws them at once, without the app starting again. A
 * language in another script waits, for as long as reading its serif takes, until that serif is
 * loaded; then its words and its type change together (src/theme/fonts.ts).
 */
export function LanguageProvider({ initialChoice, onChoiceChange, children }: {
  initialChoice: string | null;
  onChoiceChange: (choice: string | null) => void;
  children: ReactNode;
}) {
  const { status, user, client, setUser } = useSession();
  const [choice, setChoice] = useState(() => readLanguageChoice(initialChoice));
  // The phone's languages, in its order, redrawn if they change while the app is open.
  const locales = useLocales();
  const devices = useMemo(() => locales.map((locale) => locale.languageTag).filter(Boolean), [locales]);
  const wanted = resolveActiveLanguage(choice, devices);
  // The language drawn now. It moves to the one wanted once its script's serif is loaded, which
  // the app did before its first screen for the language it opened in.
  const [active, setActive] = useState(wanted);
  useEffect(() => {
    if (wanted === active) return;
    let live = true;
    // A serif that fails to load leaves the type in Latin (setActiveScript); the words still change.
    loadScriptFonts(scriptOf(wanted)).catch(() => {}).then(() => { if (live) setActive(wanted); });
    return () => { live = false; };
  }, [wanted, active]);
  // Set before anything below draws, so every screen draws in the same language and type.
  // Repeating it with the same language does nothing.
  setActiveLanguage(active);
  setActiveScript(scriptOf(active));

  // Signed in, the account's choice is the one that counts, and this phone follows it. Adjusted
  // here, while drawing, so nothing draws in the language it is leaving.
  const signedInAs = status === 'signed-in' ? user.id : null;
  const accountLanguage = status === 'signed-in' ? user.language ?? null : null;
  const accountChoice = readLanguageChoice(accountLanguage);
  if (signedInAs && accountChoice && accountChoice !== choice) setChoice(accountChoice);

  // This phone keeps a copy of the choice, so the app opens in it before the account answers.
  const saved = useRef(choice);
  useEffect(() => {
    if (saved.current === choice) return;
    saved.current = choice;
    onChoiceChange(choice);
  }, [choice, onChoiceChange]);

  // A choice made on this phone before signing in carries into an account that has none. The
  // server decides (unlessChosen), so it never overwrites one the account already holds, and the
  // phone takes whatever the account answers with. If the service can't be reached, the phone
  // keeps its choice and tries again the next time the account is read.
  useEffect(() => {
    if (!signedInAs || accountLanguage !== null || !choice) return;
    let live = true;
    client.setLanguage(choice, { unlessChosen: true }).then((updated) => { if (live) setUser(updated); }, () => {});
    return () => { live = false; };
  }, [signedInAs, accountLanguage, choice, client, setUser]);

  // Signed in, the choice goes to the account first and the phone follows what it kept. "Follow
  // my device" is kept on the phone too, so nothing is carried back into the account after it.
  const choose = useCallback(async (next: string | null) => {
    const kept = readLanguageChoice(next);
    if (signedInAs) {
      const updated = await client.setLanguage(kept);
      setUser(updated);
      setChoice(readLanguageChoice(updated.language));
    } else {
      setChoice(kept);
    }
  }, [signedInAs, client, setUser]);

  const value = useMemo<LanguageValue>(() => ({ active, choice, listed: LISTED_LANGUAGES, speech: speechLanguageOf(active), choose }), [active, choice, choose]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** The Language preference; outside the provider, the active language and no choice. */
export function useLanguage(): LanguageValue {
  const value = useContext(LanguageContext);
  if (value) return value;
  const active = activeLanguage();
  return { active, choice: null, listed: LISTED_LANGUAGES, speech: speechLanguageOf(active), choose: async () => {} };
}
