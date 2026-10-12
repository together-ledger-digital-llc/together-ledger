import { createPhoneLedgerStore } from '../../../../src/store.js';

/**
 * The phone's own ledger, kept on the phone (TL-M-10, #185). The load chain is the web's, from
 * src/store.js: the same migrations from every earlier schema, the same fallback through the
 * three storage keys, and the same validity gate before every write. Only the storage beneath
 * it differs, and it answers with promises.
 *
 * Imports nothing native, so tests/mobile-store.test.js runs it against the browser's store.
 */
export type PhoneStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

/** The web's key for a chosen theme (src/themes.js), so a choice reads the same everywhere. */
export const THEME_KEY = 'theme';

/** How the ledger draws its moments: every card in full, or one short row each (the default). */
export type MomentView = 'full' | 'compact';

/** The phone's own key for that choice. The web has no such choice yet, so nothing shares it. */
export const MOMENT_VIEW_KEY = 'moment-view';

/**
 * What a phone that has never chosen shows (Oct 12): one short row each, so a new person meets
 * the whole journey at a glance. A phone that already chose keeps its choice, In full included.
 */
export const DEFAULT_MOMENT_VIEW: MomentView = 'compact';

/**
 * The web's key for a language chosen by hand (src/i18n/web.js), so a choice reads the same
 * everywhere. Nothing saved is "Follow my device" (101B).
 */
export const LANGUAGE_KEY = 'language';

/** Said in the status region when a change could not be written; it is not a crash. */
export const SAVE_FAILED_MESSAGE = 'This phone could not save that change. It shows for now, but may not be here the next time the app opens.';

export function createPhoneStore(storage: PhoneStorage) {
  const ledger = createPhoneLedgerStore(storage);
  return {
    ...ledger,

    /**
     * The saved theme, settled the way src/themes.js settles it: a retired id lands on its
     * survivor and the survivor is saved once, so the retired name is not carried forward.
     * Null when nothing is saved, or the store cannot be read: the phone's preference decides.
     */
    async loadTheme(resolve: (id: string) => string): Promise<string | null> {
      let saved: string | null;
      try {
        saved = await storage.getItem(THEME_KEY);
      } catch {
        return null;
      }
      if (!saved) return null;
      const applied = resolve(saved);
      if (applied !== saved) {
        try { await storage.setItem(THEME_KEY, applied); } catch { /* a blocked store still renders */ }
      }
      return applied;
    },

    /** Null goes back to following the phone. */
    saveTheme(themeId: string | null): Promise<void> {
      return themeId ? storage.setItem(THEME_KEY, themeId) : storage.removeItem(THEME_KEY);
    },

    /**
     * The saved way of showing moments. A saved 'full' or 'compact' is read back as it was, so a
     * phone that chose In full before Compact became the default keeps it. Nothing saved,
     * anything else, or a store that cannot be read gives the default.
     */
    async loadMomentView(): Promise<MomentView> {
      try {
        const saved = await storage.getItem(MOMENT_VIEW_KEY);
        return saved === 'full' || saved === 'compact' ? saved : DEFAULT_MOMENT_VIEW;
      } catch {
        return DEFAULT_MOMENT_VIEW;
      }
    },

    /** Kept on this phone only: nothing about it is sent anywhere. */
    saveMomentView(view: MomentView): Promise<void> {
      return storage.setItem(MOMENT_VIEW_KEY, view);
    },

    /**
     * The language chosen by hand on this phone, kept as it was saved; null when nothing is saved
     * or the store cannot be read. Which languages may be chosen is decided where it is read
     * (src/i18n/language-provider.tsx), so a language no longer offered reads as no choice.
     */
    async loadLanguage(): Promise<string | null> {
      try {
        return (await storage.getItem(LANGUAGE_KEY)) || null;
      } catch {
        return null;
      }
    },

    /** Null goes back to following the phone. Before signing in, this is the only copy of the choice. */
    saveLanguage(language: string | null): Promise<void> {
      return language ? storage.setItem(LANGUAGE_KEY, language) : storage.removeItem(LANGUAGE_KEY);
    },

    /** Begin the ledger, as the web's showLedgerSurface({ persist: true }) does. */
    async completeOnboarding(): Promise<void> {
      const state = await ledger.loadState();
      if (state.preferences.onboardingComplete) return;
      state.preferences.onboardingComplete = true;
      await ledger.saveState(state);
    },
  };
}

export type PhoneStore = ReturnType<typeof createPhoneStore>;
