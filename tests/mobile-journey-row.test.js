import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { rowEdges, scrollToShow, showsJourneyRow } from '../src/journey-row.js';

// #404: the journeys as one row that scrolls sideways, with "＋ New journey" on its own line directly
// below it, the same on the iPhone, Android and the web. The web is driven in a browser
// (tests/browser-journey-row.spec.js); the phone is held here to the same file of decisions and to
// the shape that gives it the same layout and the same announcements.

const mobile = new URL('../apps/mobile/', import.meta.url);
const read = (path) => readFile(new URL(path, mobile), 'utf8');
const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('a row is drawn only when there is more than one journey to choose between', () => {
  assert.equal(showsJourneyRow([]), false);
  assert.equal(showsJourneyRow([{ id: 'a' }]), false);
  assert.equal(showsJourneyRow([{ id: 'a' }, { id: 'b' }]), true);
  assert.equal(showsJourneyRow(undefined), false);
});

test('the open journey is scrolled just far enough to be wholly in sight beside the gutter', () => {
  const row = { scrolled: 0, visible: 320, total: 1000, inset: 24 };
  assert.equal(scrollToShow({ ...row, start: 24, end: 120 }), null, 'already in sight: the row stays where it is');
  assert.equal(scrollToShow({ ...row, start: 400, end: 520 }), 224, 'past the trailing edge: its end comes in with the gutter after it');
  assert.equal(scrollToShow({ ...row, scrolled: 500, start: 300, end: 400 }), 276, 'before the leading edge: its start comes in with the gutter before it');
  assert.equal(scrollToShow({ ...row, start: 900, end: 990 }), 680, 'never past the end of the row');
  assert.equal(scrollToShow({ ...row, scrolled: 300, start: 10, end: 90 }), 0, 'never before its start');
  assert.equal(scrollToShow({ ...row, start: 250, end: 300 }), 4, 'partly cut by the edge counts as out of sight');
});

test('an end with journeys beyond it is marked, and a row that fits marks neither', () => {
  assert.deepEqual(rowEdges({ scrolled: 0, visible: 320, total: 1000 }), { before: false, after: true });
  assert.deepEqual(rowEdges({ scrolled: 300, visible: 320, total: 1000 }), { before: true, after: true });
  assert.deepEqual(rowEdges({ scrolled: 680, visible: 320, total: 1000 }), { before: true, after: false });
  assert.deepEqual(rowEdges({ scrolled: 679.5, visible: 320, total: 1000 }), { before: true, after: false }, 'a fraction of a pixel left over is the end');
  assert.deepEqual(rowEdges({ scrolled: 0, visible: 320, total: 320 }), { before: false, after: false });
});

test('the phone\'s row scrolls sideways on one line, with each journey a 44pt radio read by its whole name', async () => {
  const row = await read('src/components/journey-row.tsx');
  assert.match(row, /from '\.\.\/\.\.\/\.\.\/\.\.\/src\/journey-row\.js'/, 'the same decisions as the web, from the same file');
  assert.match(row, /<View accessibilityRole="radiogroup" accessibilityLabel=\{label\} style=\{\{ marginHorizontal: -inset \}\}>/, 'one named group, running on past the list\'s padding to the screen\'s edge');
  assert.match(row, /<ScrollView\s+ref=\{scroller\}\s+horizontal\s/, 'one row that scrolls sideways');
  assert.doesNotMatch(row, /flexWrap/, 'never wrapping onto another line');
  assert.match(row, /contentContainerStyle=\{\[styles\.row, \{ paddingHorizontal: inset \}\]\}/);
  assert.match(row, /accessibilityRole="radio"\s+accessibilityLabel=\{item\.name\}\s+accessibilityState=\{\{ checked: active \}\}/, 'each journey a choice, announced by its whole name and as chosen');
  assert.match(row, /styles\.choice, targetSize,/, 'no journey smaller than the 44pt minimum');
  assert.match(row, /<Text numberOfLines=\{1\} ellipsizeMode="tail"/, 'a long name is cut short on screen');
  assert.match(row, /\{active \? '● ' : ''\}\{item\.name\}/, 'chosen is told by a shape as well as colour');
  assert.match(row, /choice: \{[^}]*maxWidth: 260/, 'no wider than the web lets one grow');
  assert.match(css, /\.journey-choice \{[^}]*max-width: min\(260px, 75vw\);/, 'the web caps a journey at the same width');
});

test('the phone brings the open journey into view, at once on opening and gently on a change', async () => {
  const row = await read('src/components/journey-row.tsx');
  assert.match(row, /const x = scrollToShow\(\{ \.\.\.place, \.\.\.frame\.current, inset \}\);/);
  assert.match(row, /scrollTo\(\{ x, animated: shown\.current !== null && !reduceMotion\.current \}\)/, 'no slide on opening, and none for someone who asked for less motion');
  assert.match(row, /if \(shown\.current === activeId\) return;/, 'only when the open journey changes, so a row scrolled by hand stays put');
  assert.match(row, /AccessibilityInfo\.isReduceMotionEnabled\(\)/);
});

test('the phone\'s fades show the row goes on, and are never read or touched', async () => {
  const row = await read('src/components/journey-row.tsx');
  assert.match(row, /const now = rowEdges\(frame\.current\);/);
  assert.match(row, /\{edges\.before \? <Fade side="left" color=\{colors\.bg\} \/> : null\}/);
  assert.match(row, /\{edges\.after \? <Fade side="right" color=\{colors\.bg\} \/> : null\}/);
  const fade = row.slice(row.indexOf('function Fade'));
  assert.match(fade, /pointerEvents="none"/);
  assert.match(fade, /accessibilityElementsHidden/);
  assert.match(fade, /importantForAccessibility="no-hide-descendants"/);
});

test('the ledger shows the row only for more than one journey, with New journey directly below it', async () => {
  const ledger = await read('app/ledger.tsx');
  const rowAt = ledger.indexOf("{showsJourneyRow(journeys) ? <JourneyRow label={t('mobile.ledger.journeys')}");
  const newJourneyAt = ledger.indexOf("<Button kind=\"quiet\" label={t('common.ledger.newJourney')}", rowAt);
  assert.ok(rowAt > 0, 'the row is drawn for more than one journey, and no picker for one');
  assert.ok(newJourneyAt > rowAt, 'New journey follows the row');
  assert.doesNotMatch(ledger.slice(rowAt, newJourneyAt).split('\n').slice(1).join('\n'), /<\w/, 'with nothing between them');
  assert.match(ledger, /inset=\{LIST_INSET\}/);
  assert.match(ledger, /list: \{ padding: LIST_INSET,/, 'the row runs on by exactly the list\'s padding');
  assert.doesNotMatch(ledger, /JourneyPicker/, 'the wrapping picker is gone');
});
