/**
 * How the phone sets type for each script the product is written in. Pure, so the theme gate can
 * test it without the font files: fonts.ts applies it to the active language.
 * Decided in docs/2026-10-12-devanagari-bangla-font-decision.md.
 */
export type Script = 'Latn' | 'Deva' | 'Beng';

/**
 * The script a language tag is written in. Hindi is Devanagari and Bengali is Bangla, unless the
 * tag says otherwise: Hinglish (hi-Latn) is Latin, as are English and Spanish.
 */
export function scriptOf(tag: string): Script {
  const [language, ...subtags] = tag.split(/[-_]/);
  const named = subtags.find((subtag) => /^[A-Za-z]{4}$/.test(subtag));
  if (named) {
    const script = named[0].toUpperCase() + named.slice(1).toLowerCase();
    return script === 'Deva' || script === 'Beng' ? script : 'Latn';
  }
  if (language.toLowerCase() === 'hi') return 'Deva';
  if (language.toLowerCase() === 'bn') return 'Beng';
  return 'Latn';
}

/**
 * The least line height, as a multiple of the font size, at which two lines' marks cannot touch.
 * Measured from the serif's tallest and deepest marks: Tiro Devanagari Hindi's ink spans 1.31em,
 * Tiro Bangla's 1.19em. Latin keeps each style's own line height.
 */
export const MIN_LEADING: Record<Script, number> = { Latn: 0, Deva: 1.35, Beng: 1.3 };

/** A style's line height in a script: its Latin value, or more if the script's marks need it. */
export function leadingFor(script: Script, fontSize: number, latin: number): number {
  return Math.max(latin, Math.ceil(fontSize * MIN_LEADING[script]));
}

/**
 * A style's letter spacing in a script. Devanagari and Bangla hang from a headline that joins the
 * letters, and any tracking breaks it apart, so they are never tracked.
 */
export function trackingFor(script: Script, latin: number): number {
  return script === 'Latn' ? latin : 0;
}
