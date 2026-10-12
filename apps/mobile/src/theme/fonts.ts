// One import per weight, never the package's main entry: that entry requires all eight
// Gelasio files, and every file it requires ships inside the app.
import { Gelasio_400Regular } from '@expo-google-fonts/gelasio/400Regular';
import { Gelasio_400Regular_Italic } from '@expo-google-fonts/gelasio/400Regular_Italic';
import { Gelasio_700Bold } from '@expo-google-fonts/gelasio/700Bold';
import { TiroBangla_400Regular } from '@expo-google-fonts/tiro-bangla/400Regular';
import { TiroDevanagariHindi_400Regular } from '@expo-google-fonts/tiro-devanagari-hindi/400Regular';
import { isLoaded, loadAsync } from 'expo-font';
import type { TextStyle } from 'react-native';
import { language } from '../i18n';
import { leadingFor, scriptOf, trackingFor, type Script } from './scripts';

/**
 * The serif is Gelasio (SIL OFL 1.1), bundled, decided in #177 and
 * docs/2026-09-21-tl-m-02-font-decision.md. Gelasio draws no Devanagari or Bangla, so Hindi's
 * serif is Tiro Devanagari Hindi and Bengali's is Tiro Bangla (both SIL OFL 1.1), decided in
 * docs/2026-10-12-devanagari-bangla-font-decision.md. Interface text stays in the system sans,
 * which draws all three scripts on both phones, so it has no entry here.
 *
 * Headings and moment titles render at weight 400, not 500: Georgia rounded the web's 500 down to
 * 400, and 400 is what the design was drawn against. The Tiro faces have only 400.
 *
 * The type follows the active language's script. `script` is the one the app opened in, loaded
 * before the first screen; a language in another script chosen while the app is open has its
 * serif loaded first (loadScriptFonts), and only then do the words and the type change together
 * (src/i18n/language-provider.tsx), so Devanagari or Bangla is never drawn without its serif or
 * with Latin spacing.
 */
export const script: Script = scriptOf(language);

const scriptSources = {
  Latn: {},
  Deva: { TiroDevanagariHindi_400Regular },
  Beng: { TiroBangla_400Regular },
};

/**
 * What the app loads before it shows anything: Gelasio always, for the brand and Latin text, and a
 * script's serif only in a language written in it. Every file imported above ships in the app;
 * only these are read into memory.
 */
export const fontSources = { Gelasio_400Regular, Gelasio_400Regular_Italic, Gelasio_700Bold, ...scriptSources[script] };

let active: Script = script;

/** The script the type is set for now. */
export const activeScript = (): Script => active;

/** Whether a script's serif is in memory: Latin's always is, once the app has drawn. */
export function scriptFontsLoaded(next: Script): boolean {
  return Object.keys(scriptSources[next]).every((family) => isLoaded(family));
}

/** Reads a script's serif into memory, if it isn't already. Latin has nothing more to load. */
export async function loadScriptFonts(next: Script): Promise<void> {
  if (!scriptFontsLoaded(next)) await loadAsync(scriptSources[next]);
}

/**
 * Sets the type for a script. Called by the Language preference as it draws, once the script's
 * serif is loaded; a script whose serif could not be loaded keeps Latin's type rather than name a
 * face the phone doesn't have.
 */
export function setActiveScript(next: Script) {
  active = next === 'Latn' || scriptFontsLoaded(next) ? next : 'Latn';
}

const serifFamilies = { Latn: 'Gelasio_400Regular', Deva: 'TiroDevanagariHindi_400Regular', Beng: 'TiroBangla_400Regular' } as const;

/**
 * React Native picks a weight by family name, not by fontWeight, on Android, so each weight
 * is its own family and fontWeight stays 'normal'. Devanagari and Bangla have no italic, so
 * serifItalic is upright in them. serifBold carries only the brand, which is always Latin. Read
 * as the screen draws, so each is the active script's.
 */
const faces = Object.fromEntries((['Latn', 'Deva', 'Beng'] as const).map((each) => [each, {
  serif: { fontFamily: serifFamilies[each], fontWeight: 'normal' },
  serifItalic: { fontFamily: each === 'Latn' ? 'Gelasio_400Regular_Italic' : serifFamilies[each], fontWeight: 'normal' },
  serifBold: { fontFamily: 'Gelasio_700Bold', fontWeight: 'normal' },
} as const])) as Record<Script, { serif: TextStyle; serifItalic: TextStyle; serifBold: TextStyle }>;

export const fonts = {
  get serif() { return faces[active].serif; },
  get serifItalic() { return faces[active].serifItalic; },
  get serifBold() { return faces[active].serifBold; },
};

/** A style's lineHeight in the active script: room for marks above and below the line. */
export const leading = (fontSize: number, latin: number) => leadingFor(active, fontSize, latin);

/** A style's letterSpacing in the active script: none in Devanagari or Bangla. */
export const tracking = (latin: number) => trackingFor(active, latin);

/**
 * A screen's styles, made once for each script they are drawn in and read as the screen draws:
 * `const styles = scriptStyles(() => StyleSheet.create({ ... }))`. Any leading() or tracking()
 * inside is worked out for the script active when it is first read, so a change of language
 * redraws a screen in its new script's spacing without the app starting again.
 */
export function scriptStyles<T extends object>(make: () => T): T {
  const made = new Map<Script, T>();
  const current = () => {
    let sheet = made.get(active);
    if (!sheet) {
      sheet = make();
      made.set(active, sheet);
    }
    return sheet;
  };
  return new Proxy({} as T, {
    get: (_, name) => current()[name as keyof T],
    has: (_, name) => name in current(),
    ownKeys: () => Reflect.ownKeys(current()),
    getOwnPropertyDescriptor: (_, name) => Reflect.getOwnPropertyDescriptor(current(), name),
  });
}
