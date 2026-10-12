// One import per weight, never the package's main entry: that entry requires all eight
// Gelasio files, and every file it requires ships inside the app.
import { Gelasio_400Regular } from '@expo-google-fonts/gelasio/400Regular';
import { Gelasio_400Regular_Italic } from '@expo-google-fonts/gelasio/400Regular_Italic';
import { Gelasio_700Bold } from '@expo-google-fonts/gelasio/700Bold';
import { TiroBangla_400Regular } from '@expo-google-fonts/tiro-bangla/400Regular';
import { TiroDevanagariHindi_400Regular } from '@expo-google-fonts/tiro-devanagari-hindi/400Regular';
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
 * The script is the active language's, chosen once when the app starts.
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

const serifFamily = { Latn: 'Gelasio_400Regular', Deva: 'TiroDevanagariHindi_400Regular', Beng: 'TiroBangla_400Regular' }[script];

/**
 * React Native picks a weight by family name, not by fontWeight, on Android, so each weight
 * is its own family and fontWeight stays 'normal'. Devanagari and Bangla have no italic, so
 * serifItalic is upright in them. serifBold carries only the brand, which is always Latin.
 */
export const fonts = {
  serif: { fontFamily: serifFamily, fontWeight: 'normal' },
  serifItalic: { fontFamily: script === 'Latn' ? 'Gelasio_400Regular_Italic' : serifFamily, fontWeight: 'normal' },
  serifBold: { fontFamily: 'Gelasio_700Bold', fontWeight: 'normal' },
} as const;

/** A style's lineHeight in the active script: room for marks above and below the line. */
export const leading = (fontSize: number, latin: number) => leadingFor(script, fontSize, latin);

/** A style's letterSpacing in the active script: none in Devanagari or Bangla. */
export const tracking = (latin: number) => trackingFor(script, latin);
