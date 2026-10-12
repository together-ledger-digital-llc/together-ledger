// The four themes' names in the active language, shared by the theme choice, a moment's own theme
// and History's record of a change of theme. Plain JavaScript, like ./sentences.js, so the helpers
// that name a theme stay free of React and can be tested as they are.
import { momentThemeLabel, normalizeMomentTheme } from '../../../../src/moment-themes.js';
import { t } from './sentences.js';

/** @type {Readonly<Record<string, string>>} */
const THEME_NAMES = Object.freeze({
  light: 'common.themeName.light',
  dark: 'common.themeName.dark',
  green: 'common.themeName.green',
  flexoki: 'common.themeName.flexoki',
});

/**
 * A theme's name in the active language; one without a sentence keeps the name it came with.
 * @param {string} id
 * @param {string} [label]
 * @returns {string}
 */
export function themeName(id, label = id) {
  return THEME_NAMES[id] ? t(THEME_NAMES[id]) : label;
}

/**
 * A moment's own theme, named in the active language, or "Use my theme" for none: the web's
 * momentThemeLabel (src/moment-themes.js), word for word in English.
 * @param {string | null | undefined} theme
 * @returns {string}
 */
export function momentThemeName(theme) {
  const id = normalizeMomentTheme(theme);
  return id ? themeName(id, momentThemeLabel(id)) : t('common.momentTheme.own');
}
