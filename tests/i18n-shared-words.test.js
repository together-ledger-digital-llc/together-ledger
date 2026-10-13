// The web's shared sentences (common.*) read word for word as the modules the phone and the web
// both still keep English in: src/leave-journey.js, src/model.js, src/themes.js,
// src/moment-themes.js and src/photo-metadata.js. Since 103A (#425) the phone reads the theme
// names, the kinds of moment, visibility and the consequence question by key; for those, the web
// and the phone name the same keys, so a translator sees each sentence once.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { IntlMessageFormat } from 'intl-messageformat';
import { messagesOf } from '../src/i18n/catalog.js';
import { createTranslator, FSI, PDI } from '../src/i18n/translator.js';
import * as leave from '../src/leave-journey.js';
import { MOMENT_NAME_MISSING, MOMENT_TYPES, remainingLabel } from '../src/model.js';
import { MOMENT_THEMES, momentThemeLabel } from '../src/moment-themes.js';
import { PHOTO_METADATA_REMOVED } from '../src/photo-metadata.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const english = messagesOf(JSON.parse(read('locales/en.json')));
const translate = createTranslator({ locale: 'en', messages: english, MessageFormat: IntlMessageFormat });
// What a person reads: the isolate marks around inserted text are invisible.
const t = (key, values) => translate(key, values).replaceAll(FSI, '').replaceAll(PDI, '');

test('the Leave zone says what the phone says', () => {
  assert.equal(t('common.leave.title'), leave.LEAVE_ZONE_TITLE);
  assert.equal(t('common.leave.note'), leave.LEAVE_ZONE_NOTE);
  assert.equal(t('common.leave.ownerFirst'), leave.LEAVE_OWNER_FIRST);
  assert.equal(t('common.leave.safety'), leave.LEAVE_SAFETY);
  assert.equal(t('common.leave.start'), leave.LEAVE_START_LABEL);
  assert.equal(t('common.leave.fieldLabel', { word: leave.LEAVE_WORD }), leave.LEAVE_FIELD_LABEL);
  assert.equal(t('common.leave.fieldHint', { word: leave.LEAVE_WORD }), leave.LEAVE_FIELD_HINT);
  assert.equal(t('common.leave.confirm'), leave.LEAVE_CONFIRM_LABEL);
  assert.equal(t('common.leave.pending'), leave.LEAVE_PENDING_LABEL);
  assert.equal(t('common.leave.stay'), leave.LEAVE_STAY_LABEL);
  const asked = leave.leaveConsequence('Home in Fall');
  assert.equal(t('common.leave.consequenceTitle', { journey: 'Home in Fall' }), asked.title);
  assert.equal(t('common.leave.consequence'), asked.consequence);
  assert.equal(t('common.leave.continue'), asked.confirmLabel);
  assert.equal(t('common.leave.left', { journey: 'Home in Fall' }), leave.leftJourney('Home in Fall'));
});

test('a countdown reads as src/model.js writes it, in every unit and past a thousand days', () => {
  const now = Date.parse('2026-10-12T15:04:00Z');
  const at = (minutes) => new Date(now + minutes * 60000).toISOString();
  const web = (expiresAt) => {
    const deadline = new Date(expiresAt).getTime();
    if (!expiresAt || Number.isNaN(deadline)) return t('common.time.noEnd');
    const remaining = deadline - now;
    if (remaining <= 0) return t('common.time.none');
    const minutes = Math.floor(remaining / 60000);
    if (minutes < 1) return t('common.time.underAMinute');
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const rest = minutes % 60;
    if (days > 0) return t('common.time.days', { days, hours, minutes: rest });
    if (hours > 0) return t('common.time.hours', { hours, minutes: rest });
    return t('common.time.minutes', { minutes: rest });
  };
  for (const expiresAt of ['', 'not a date', at(-5), at(0.5), at(7), at(59), at(61), at(23 * 60 + 7), at(1440 * 3 + 247), at(1440 * 26672 + 1)]) {
    assert.equal(web(expiresAt), remainingLabel(expiresAt, now), expiresAt);
  }
  // app.js's remainingText is the function above, line for line.
  assert.match(read('src/app.js'), /function remainingText\(expiresAt, now = Date\.now\(\)\) \{/);
});

test('themes, kinds of moment, visibility and the moment form\'s shared lines read as before', () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(read('src/themes.js'), sandbox);
  const themes = sandbox.globalThis.TOGETHER_THEMES;
  for (const theme of themes) assert.equal(t(`common.theme.name.${theme.id}`), theme.label);
  for (const theme of MOMENT_THEMES) assert.equal(t(`common.theme.name.${theme.id}`), theme.label);
  assert.equal(t('common.moment.useMyTheme'), momentThemeLabel(''));
  const kinds = { 'missed-chance': 'missedChance', 'heart-to-heart': 'heartToHeart', 'repair-request': 'repairRequest', 'learned-something': 'learnedSomething', 'call-me': 'callMe', 'called-you': 'calledYou', 'practical-matter': 'practicalMatter' };
  for (const [value, label] of MOMENT_TYPES) assert.equal(t(`common.momentKind.${kinds[value] || value}`), label, value);
  assert.equal(t('common.moment.nameMissing'), MOMENT_NAME_MISSING);
  assert.equal(t('moment.form.photoMetadataRemoved'), PHOTO_METADATA_REMOVED);
});

// A key map written as `const NAME = Object.freeze({ id: 'key', … })`, read from a file's text.
const keyMap = (path, name) => {
  const body = read(path).match(new RegExp(`const ${name}[^=]*= Object\\.freeze\\(\\{([\\s\\S]*?)\\}\\)`))?.[1];
  assert.ok(body, `${path} has ${name}`);
  return Object.fromEntries([...body.matchAll(/^\s*'?([\w-]+)'?: '([^']+)'/gm)].map(([, id, key]) => [id, key]));
};

test('the web and the phone name the theme names and the kinds of moment by the same keys', () => {
  assert.deepEqual(keyMap('src/app.js', 'THEME_NAME_KEYS'), keyMap('apps/mobile/src/i18n/theme-names.js', 'THEME_NAMES'));
  assert.deepEqual(keyMap('src/app.js', 'MOMENT_KIND_KEYS'), keyMap('apps/mobile/src/journey/journey-view.ts', 'KIND_KEYS'));
  assert.equal(Object.keys(keyMap('src/app.js', 'MOMENT_KIND_KEYS')).length, MOMENT_TYPES.length);
});

test('visibility and the consequence question are the same keys on the web and the phone', () => {
  const web = `${read('src/app.js')}\n${read('index.html')}`;
  const phone = {
    'common.visibility.private': 'apps/mobile/src/journey/journey-view.ts',
    'common.visibility.shareLater': 'apps/mobile/src/journey/journey-view.ts',
    'common.visibility.sharedNow': 'apps/mobile/src/journey/journey-view.ts',
    'common.dialog.keep': 'apps/mobile/src/shell/defaults.ts',
    'common.dialog.eyebrow': 'apps/mobile/src/components/dialogs.tsx',
  };
  for (const [key, path] of Object.entries(phone)) {
    assert.ok(read(path).includes(`t('${key}')`), `${path} reads ${key}`);
    assert.ok(web.includes(`'${key}'`) || web.includes(`"${key}"`), `the web reads ${key}`);
  }
});
