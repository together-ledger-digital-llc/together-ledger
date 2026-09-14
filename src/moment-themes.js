export const MOMENT_THEMES = Object.freeze([
  { id: 'light', label: 'Light', base: 'light', color: '#F3EFE6' },
  { id: 'dark', label: 'Dark', base: 'dark', color: '#1A1815' },
  { id: 'green', label: 'Green', base: 'dark', color: '#071109' },
  { id: 'rose-pine', label: 'Rosé Pine', base: 'dark', color: '#191724' },
  { id: 'flexoki', label: 'Flexoki', base: 'light', color: '#FFFCF0' },
  { id: 'tokyo-night-day', label: 'Tokyo Night Day', base: 'light', color: '#E1E2E7' },
]);

const momentThemeIds = new Set(MOMENT_THEMES.map(({ id }) => id));

export function normalizeMomentTheme(value) {
  const id = String(value || '').trim();
  return momentThemeIds.has(id) ? id : '';
}

export function momentThemeLabel(value) {
  const id = normalizeMomentTheme(value);
  return MOMENT_THEMES.find((theme) => theme.id === id)?.label || 'Use my theme';
}
