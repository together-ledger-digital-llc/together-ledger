import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { AREAS_FILE, hardcodedSentences, movedAreas } from '../scripts/check-hardcoded-sentences.mjs';

// The guard on areas already moved to t() (docs/TRANSLATION.md): a sentence written straight
// into one fails npm run check. Sentences are planted in memory; no file is changed.

const root = new URL('..', import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), 'utf8');
const planted = (plants) => (path) => {
  let text = read(path);
  for (const [from, to] of plants[path] || []) {
    assert.ok(text.includes(from), `${path} has ${from}`);
    text = text.replace(from, to);
  }
  return text;
};
const texts = (found) => found.map((finding) => `${finding.file}:${finding.text}`);

test('the moved areas are listed in one place, and none has a sentence written straight in', () => {
  const areas = movedAreas();
  // The web's (101A, 101B, 102A), then 101's two on the phone, then the phone's most-seen screens (103A).
  assert.deepEqual(areas.slice(0, 20).map((area) => area.file), [
    'index.html', 'src/app.js', 'src/app.js',
    ...Array(14).fill('index.html'), 'src/app.js',
    'apps/mobile/src/i18n/language-provider.tsx', 'apps/mobile/app/history.tsx',
  ]);
  const phone = areas.filter((area) => area.movedIn === '103A').map((area) => area.file);
  for (const file of ['apps/mobile/app/index.tsx', 'apps/mobile/app/ledger.tsx', 'apps/mobile/app/settings.tsx', 'apps/mobile/app/account.tsx', 'apps/mobile/app/register.tsx', 'apps/mobile/app/moment.tsx', 'apps/mobile/app/_layout.tsx', 'apps/mobile/src/components/moment-card.tsx', 'apps/mobile/src/components/language-choice.tsx', 'apps/mobile/src/auth/account-messages.ts', 'apps/mobile/src/journey/sharing-view.ts']) {
    assert.ok(phone.includes(file), `${file} is guarded`);
  }
  assert.equal(new Set(areas.map((area) => `${area.file} ${area.element || ''} ${(area.statements || []).join()}`)).size, areas.length, 'no area is listed twice');
  for (const area of areas) assert.ok(area.name && area.movedIn && ['html', 'script'].includes(area.kind), area.name);
  assert.deepEqual(hardcodedSentences(areas), []);
  assert.match(read('package.json'), /node scripts\/check-hardcoded-sentences\.mjs/, 'npm run check runs it');
});

test('it fails on a sentence planted in the web\'s Settings, in its markup and its code', () => {
  const found = hardcodedSentences(movedAreas(), planted({
    'index.html': [
      ['<h3 data-i18n="settings.backup.title"></h3>', '<h3 data-i18n="settings.backup.title"></h3><p>Backups stay private.</p>'],
      ['data-close-settings data-i18n-aria-label="settings.dialog.close"', 'data-close-settings aria-label="Close"'],
      ['<h3 data-i18n="settings.privacy.title"></h3>', '<h3>Privacy</h3>'],
    ],
    'src/app.js': [
      ["showToast(t('settings.reset.done'));", "showToast('Done');"],
      ["showToast(t('settings.backup.exported'));", 'showToast(`Saved ${count} journeys`);'],
      ["confirmLabel: t('settings.reset.confirmAction')", "confirmLabel: 'Clear ledger'"],
    ],
  }));
  assert.deepEqual(texts(found), [
    'index.html:aria-label="Close"',
    'index.html:Backups stay private.',
    'index.html:Privacy',
    'src/app.js:Saved ',
    'src/app.js:Clear ledger',
    'src/app.js:Done',
  ]);
});

test('it fails on a sentence planted in the phone\'s History: JSX text, a label, a toast, a fallback', () => {
  const found = hardcodedSentences(movedAreas(), planted({
    'apps/mobile/app/history.tsx': [
      ["{t('history.events.heading')}", 'Recorded changes'],
      ["label={t('common.action.edit')}", 'label="Edit"'],
      ["showToast(t('history.concern.deleted'));", "showToast('Conversation deleted.');"],
      ["t('common.time.notRecorded')", "'Time not recorded'"],
      ["{t('history.event.noChange')}", 'Don’t worry, nothing changed'],
    ],
  }));
  assert.deepEqual(texts(found), [
    'apps/mobile/app/history.tsx:Conversation deleted.',
    'apps/mobile/app/history.tsx:Edit',
    'apps/mobile/app/history.tsx:Recorded changes',
    'apps/mobile/app/history.tsx:Don’t worry, nothing changed',
    'apps/mobile/app/history.tsx:Time not recorded',
  ]);
});

// 102A: the welcome page, the ledger's home, holding a moment, signing in, and what Journey
// sharing's code writes. A listed function is checked to its closing brace, and no further.
test('it fails on a sentence planted in the areas 102A moved, and a listed function ends where its body does', () => {
  const found = hardcodedSentences(movedAreas(), planted({
    'index.html': [
      ['<h2 id="closing-title" data-i18n="welcome.closing.title"></h2>', '<h2 id="closing-title">Start with one thing.</h2>'],
      ['data-i18n-placeholder="common.moment.nameExample"', 'placeholder="e.g. A walk"'],
      ['<h3 data-i18n="common.screen.journeySettings.title"></h3>', '<h3>Journey sharing</h3>'],
      ['<h3 data-i18n="common.screen.register.title"></h3>', '<h3>Create account</h3>'],
    ],
    'src/app.js': [
      ["return t('sharing.invitation.status', { status });", "return 'Waiting on them';"],
      ["showToast(t('common.moment.sharedWithJourneyer'));", "showToast('Shared with them.');"],
      // The line after renderLeaveJourney's body is not part of it, so this one is let through.
      ["$('#leave-journey-button').addEventListener(", "const after = 'Not checked here.';\n$('#leave-journey-button').addEventListener("],
    ],
  }));
  assert.deepEqual(texts(found), [
    'index.html:Journey sharing',
    'index.html:Start with one thing.',
    'index.html:placeholder="e.g. A walk"',
    'index.html:Create account',
    'src/app.js:Waiting on them',
    'src/app.js:Shared with them.',
  ]);
});

test('it leaves alone what hasn\'t moved yet, and what isn\'t a sentence', () => {
  const found = hardcodedSentences(movedAreas(), planted({
    // The resting order and Account settings once signed in haven't moved.
    'index.html': [
      ['<h4>If the payment lapses</h4>', '<h4>If the payment lapses, still English</h4>'],
      ['<h3 id="change-password-title">Change password</h3>', '<h3 id="change-password-title">Change password, still English</h3>'],
    ],
    // Elsewhere in app.js, and keys, paths, style values and select values inside a moved area.
    'src/app.js': [["{ tone: 'waiting', message: 'This journey is waiting for payment confirmation.' }", "{ tone: 'waiting', message: 'This journey is still waiting for payment confirmation.' }"]],
    'apps/mobile/app/history.tsx': [["hasPrevious: event.previousEventId ? 'yes' : 'no',", "hasPrevious: event.previousEventId ? 'yes' : 'no', kind: 'quiet', route: '/history-guide', weight: '700',"]],
  }));
  assert.deepEqual(found, []);
});

test('an area that can no longer be found fails too, so the list is kept up to date', () => {
  const found = hardcodedSentences(movedAreas(), planted({
    'index.html': [['<section id="unpaid-capacity-rest"', '<section id="unpaid-capacity-resting"']],
    'src/app.js': [["$('#reset-button').addEventListener(", "$('#start-fresh-button').addEventListener("]],
  }));
  assert.deepEqual(texts(found), [
    `index.html:<section id="unpaid-capacity-rest" is no longer in index.html; update ${AREAS_FILE}`,
    // And what it kept out is checked again, since nothing excepts it any more.
    'index.html:If the payment lapses',
    'index.html:Nobody is removed and no history is lost. If this journey stays unpaid, you and one person you choose can still add to it, and everyone else can still read everything.',
    `src/app.js:$('#reset-button').addEventListener( is no longer in src/app.js; update ${AREAS_FILE}`,
  ]);
});

test('an area\'s allow list lets through words that are never translated', () => {
  const areas = movedAreas().map((area) => (area.file === 'apps/mobile/app/history.tsx' ? { ...area, allow: ['Together Ledger'] } : area));
  const found = hardcodedSentences(areas, planted({ 'apps/mobile/app/history.tsx': [["{t('history.events.heading')}", 'Together Ledger']] }));
  assert.deepEqual(found, []);
});

test('a sentence not moved yet is listed as pending, with the prompt that moves it, and a stale one fails', () => {
  const view = movedAreas().find((area) => area.file === 'apps/mobile/src/journey/journey-view.ts');
  assert.ok(view.pending.every((entry) => entry.text && entry.until), 'each names what moves it');
  const without = { ...view, pending: [] };
  assert.deepEqual(texts(hardcodedSentences([without])).sort(), view.pending.map((entry) => `apps/mobile/src/journey/journey-view.ts:${entry.text}`).sort(), 'without the list they are found');
  const stale = { ...view, pending: [...view.pending, { text: 'A sentence that is not there', until: 'never' }] };
  assert.match(texts(hardcodedSentences([stale])).join('\n'), /"A sentence that is not there" is listed as pending but is no longer written/);
});

test('a function a statement list names ends at its own closing brace, not at the next semicolon', () => {
  const area = movedAreas().find((entry) => entry.file === 'apps/mobile/src/journey/waiting-moments.ts');
  // unsentWhenLeaving follows signOutEverywhereConsequence and still writes its sentences in English.
  assert.deepEqual(hardcodedSentences([area]), []);
  const plantedSentence = planted({ 'apps/mobile/src/journey/waiting-moments.ts': [["title: t('mobile.signOutEverywhere.waitingTitle'),", "title: 'Sign out everywhere with moments waiting?',"]] });
  assert.deepEqual(texts(hardcodedSentences([area], plantedSentence)), ['apps/mobile/src/journey/waiting-moments.ts:Sign out everywhere with moments waiting?']);
});
