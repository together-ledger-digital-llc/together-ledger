import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const mobile = new URL('../apps/mobile/', import.meta.url);
const read = (path) => readFile(new URL(path, mobile), 'utf8');

// The phone's own TypeScript, compiled on the spot. Its relative imports of the web's modules
// are pointed at the real files, so the phone and these tests share one copy of each.
async function importMobile(path) {
  const url = new URL(path, mobile);
  const source = await readFile(url, 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  const linked = outputText.replace(/from '(\.[^']+\.js)'/g, (_, specifier) => `from '${new URL(specifier, url).href}'`);
  return import(`data:text/javascript;base64,${Buffer.from(linked).toString('base64')}`);
}

const view = await importMobile('src/journey/journey-view.ts');
const { createPhoneStore, DEFAULT_MOMENT_VIEW, MOMENT_VIEW_KEY, SAVE_FAILED_MESSAGE } = await importMobile('src/storage/ledger-store.ts');

// The phone's storage answers later, and can refuse to read or to write.
function phoneStorage(seed = {}, { failReads = false, failWrites = false } = {}) {
  const values = new Map(Object.entries(seed));
  const later = (work) => new Promise((resolve, reject) => setTimeout(() => {
    try { resolve(work()); } catch (error) { reject(error); }
  }, 0));
  return {
    values,
    getItem(key) { return later(() => { if (failReads) throw new Error('blocked'); return values.get(key) ?? null; }); },
    setItem(key, value) { return later(() => { if (failWrites) throw new Error('disk full'); values.set(key, String(value)); }); },
    removeItem(key) { return later(() => { values.delete(key); }); },
  };
}

const moment = (overrides = {}) => ({ id: 'm1', journeyId: 'j', kind: 'repair', occurredOn: '2026-10-09', updatedAt: '2026-10-09T00:00:00.000Z', title: 'We talked it through on the long walk home', visibility: 'share-later', images: [], removedImages: [], ...overrides });

test('the choice above the list, in the words for the owner to approve, opens on Compact', async () => {
  assert.equal(view.MOMENT_VIEW_LABEL, 'Show moments');
  assert.deepEqual(view.MOMENT_VIEWS, [['full', 'In full'], ['compact', 'Compact']], 'the order stays In full, then Compact');
  assert.equal(DEFAULT_MOMENT_VIEW, 'compact', 'a phone that has never chosen shows one short row each (Oct 12)');
  assert.equal(view.MOMENT_VIEWS[1][0], DEFAULT_MOMENT_VIEW, 'only which one starts selected changed: the default is the second button');

  const ledger = await read('app/ledger.tsx');
  assert.match(ledger, /<Choices label=\{MOMENT_VIEW_LABEL\} options=\{MOMENT_VIEWS\} selected=\{momentView\.view\} onSelect=/, 'the existing Choices, so the chosen one is marked by shape as well as colour');
  const header = ledger.slice(ledger.indexOf('ListHeaderComponent'), ledger.indexOf('ListEmptyComponent'));
  assert.ok(header.lastIndexOf('MOMENT_VIEW_LABEL') < header.indexOf('listing.seeAll'), 'above "See all" and the filter, so Compact bringing the filter in never moves it under the thumb');
  assert.ok(header.indexOf('MOMENT_VIEW_LABEL') > header.indexOf('<WaitingMoments'), 'and below the moments waiting to send, right above the list');
  assert.match(ledger, /\{recent\.length \? \(\s*<View style=\{styles\.viewChoice\}>/, 'and only once there is a moment to show either way');

  const provider = await read('src/journey/use-moment-view.tsx');
  assert.match(provider, /initialView = DEFAULT_MOMENT_VIEW/);
});

test('a compact row is the date, the title on one line, the kind and the visibility cue, and nothing more', async () => {
  const row = await read('src/components/moment-row.tsx');
  const body = row.slice(row.indexOf('export function MomentRow'), row.indexOf('const styles'));
  assert.match(body, /<Text numberOfLines=\{1\} ellipsizeMode="tail" style=\{\[styles\.title, fonts\.serif, \{ color: colors\.fg \}\]\}>\{moment\.title\}<\/Text>/, 'the title on one line, cut with an ellipsis');
  assert.match(body, /\{dateLabel\(moment\.occurredOn\)\} · \{momentLabel\(moment\.kind, moment\.kindLabel\)\}/, 'the date and the kind');
  assert.match(body, /const cue = visibilityCue\(moment\.visibility\)/);
  assert.match(body, /\{cue\.glyph\} <\/Text>\s*\{cue\.label\}/, 'the cue\'s shape and word');
  assert.match(body, /styles\.chip, \{ borderColor: colors\.border/, 'inside its own border');
  assert.match(body, /borderLeftColor: cueColor/, 'and the row\'s left border keeps the cue colour');
  assert.match(body, /const colors = ownTheme \? getTheme\(ownTheme\)\.colors : app\.colors;/, 'a moment with its own theme keeps its own colours');
  for (const left of [/moment\.detail/, /locationContext|places/, /MomentPhoto|moment\.images/, /moneyContext/, /Held by/, /CardAction/]) {
    assert.doesNotMatch(body.slice(0, body.indexOf('{open ?')), left, `the row itself leaves out ${left}`);
  }
  assert.doesNotMatch(row, /useEffect|await/, 'nothing about the row waits: its cue arrives with its title');

  // Every visibility, an unknown one too, gets its glyph and word: never colour alone.
  for (const [visibility, glyph, word] of [['private', '○', 'Private'], ['share-later', '◐', 'Share later'], ['shared-now', '●', 'Shared now'], ['something-new', '○', 'something new']]) {
    const cue = view.visibilityCue(visibility);
    assert.deepEqual([cue.glyph, cue.label], [glyph, word], visibility);
  }
});

test('a row is a button that says its title, date, visibility and whether it is open', async () => {
  // The date as the card writes it, the same function, so the two never disagree.
  assert.equal(view.compactRowLabel(moment()), 'We talked it through on the long walk home, Oct 9, Visibility: Share later');
  assert.equal(view.compactRowLabel(moment({ visibility: 'shared-now', title: 'Tea' })), 'Tea, Oct 9, Visibility: Shared now');
  assert.equal(view.compactRowLabel(moment({ visibility: 'private', occurredOn: '' })), 'We talked it through on the long walk home, Date not set, Visibility: Private');

  const row = await read('src/components/moment-row.tsx');
  assert.match(row, /accessibilityRole="button"\s*accessibilityLabel=\{compactRowLabel\(moment\)\}\s*accessibilityState=\{\{ expanded: open \}\}/);
  assert.match(row, /\[styles\.row, targetSize,/, 'at least 44 points tall and wide');
});

test('tapping a row opens that one moment as its full card, with its actions; tapping again folds it', async () => {
  const row = await read('src/components/moment-row.tsx');
  assert.match(row, /onPress=\{onToggle\}/);
  assert.match(row, /\{open \? <MomentCard moment=\{moment\} actions=\{actions\} \/> : null\}/, 'the full card, unchanged, in place');
  assert.match(row, /\{open \? '−' : '\+'\}/, 'and the row shows which way it will go, as the card\'s own disclosures do');

  const ledger = await read('app/ledger.tsx');
  assert.match(ledger, /\? <MomentRow moment=\{item\} open=\{opened\.has\(item\.id\)\} onToggle=\{\(\) => toggle\(item\.id\)\} actions=\{cardActions\} \/>\s*: <MomentCard moment=\{item\} actions=\{cardActions\} \/>/, 'the same Edit and Share now in both views');
  assert.match(ledger, /if \(!next\.delete\(id\)\) next\.add\(id\);/, 'one tap opens, the next folds');
  assert.match(ledger, /extraData=\{\{ compact, opened \}\}/, 'the list redraws when a row opens or the view changes');
  assert.match(ledger, /setExpanded\(false\); setOpened\(new Set\(\)\); journey\.select\(id\);/, 'another journey opens with every row folded');

  // The toggle itself, run as written.
  const toggle = new Function('setOpened', `return ${ledger.match(/const toggle = (\(id: string\) => setOpened\(\(current\) => \{[\s\S]*?\}\));/)[1].replace('(id: string)', '(id)')}`);
  let opened = new Set();
  const run = toggle((update) => { opened = update(opened); });
  run('a');
  assert.deepEqual([...opened], ['a']);
  run('b');
  assert.deepEqual([...opened], ['a', 'b'], 'opening one leaves the others as they are');
  run('a');
  assert.deepEqual([...opened], ['b'], 'a second tap folds it back');
});

test('the choice is remembered on this phone between launches, and a phone that never chose shows Compact', async () => {
  const phone = phoneStorage();
  assert.equal(await createPhoneStore(phone).loadMomentView(), 'compact', 'a fresh phone: nothing saved');
  await createPhoneStore(phone).saveMomentView('full');
  assert.equal(phone.values.get(MOMENT_VIEW_KEY), 'full');
  assert.equal(await createPhoneStore(phone).loadMomentView(), 'full', 'a fresh launch reads In full back');
  await createPhoneStore(phone).saveMomentView('compact');
  assert.equal(await createPhoneStore(phone).loadMomentView(), 'compact');

  // A phone that chose before the default changed keeps what it chose, In full included.
  assert.equal(await createPhoneStore(phoneStorage({ [MOMENT_VIEW_KEY]: 'full' })).loadMomentView(), 'full', 'a saved In full is not turned into Compact');
  assert.equal(await createPhoneStore(phoneStorage({ [MOMENT_VIEW_KEY]: 'compact' })).loadMomentView(), 'compact', 'a saved Compact stays Compact');

  assert.equal(await createPhoneStore(phoneStorage({ [MOMENT_VIEW_KEY]: 'full' }, { failReads: true })).loadMomentView(), 'compact', 'a blocked store still renders, on the default');
  for (const unknown of ['tiny', '', 'Full', 'COMPACT', ' full']) {
    assert.equal(await createPhoneStore(phoneStorage({ [MOMENT_VIEW_KEY]: unknown })).loadMomentView(), 'compact', `anything unknown is the default: ${JSON.stringify(unknown)}`);
  }
  assert.notEqual(MOMENT_VIEW_KEY, 'theme');

  const prefs = await read('src/storage/use-stored-preferences.ts');
  assert.match(prefs, /store\.loadMomentView\(\),\s*store\.loadLanguage\(\),\s*\]\)\.then\(\(\[theme, onboardingComplete, momentView, language\]\) => \{\s*if \(live\) setStored\(\{ theme, onboardingComplete, momentView, language \}\);/, 'read at launch with the theme, before the first screen');
  const layout = await read('app/_layout.tsx');
  assert.match(layout, /<MomentViewProvider initialView=\{stored\.momentView\} onViewChange=\{saveMomentView\}>/);
  const provider = await read('src/journey/use-moment-view.tsx');
  assert.match(provider, /setViewState\(next\);\s*onViewChange\?\.\(next\);/, 'shown at once, and written to the phone');
});

test('a choice that cannot be saved is said in the status region, as the theme\'s is', async () => {
  const store = createPhoneStore(phoneStorage({}, { failWrites: true }));
  await assert.rejects(store.saveMomentView('compact'), /disk full/);
  const prefs = await read('src/storage/use-stored-preferences.ts');
  assert.match(prefs, /const saveMomentView = useCallback\(\(view: MomentView\) => \{\s*store\.saveMomentView\(view\)\.catch\(failed\);/, 'the same failure path the theme takes');
  const layout = await read('app/_layout.tsx');
  assert.match(layout, /<SaveFailureNotice failure=\{failure\} \/>/);
  assert.match(layout, /showStatus\(failure\.message, \{ tone: 'caution', source: 'storage' \}\)/);
  assert.match(SAVE_FAILED_MESSAGE, /^This phone could not save that change\./);
});

test('the choice stays on the phone: nothing about it reaches the server', async () => {
  for (const file of ['src/journey/use-moment-view.tsx', 'src/components/moment-row.tsx']) {
    const source = await read(file);
    assert.doesNotMatch(source, /useSession|client\.|fetch\(/, file);
  }
  const client = await read('src/api/client.ts');
  assert.doesNotMatch(client, /moment-?view|momentView/i);
});

test('the row uses the semantic roles only, never the destructive colour, and every target is 44 points', async () => {
  const row = await read('src/components/moment-row.tsx');
  const roles = [...row.matchAll(/colors\.(\w+)/g)].map(([, role]) => role);
  assert.deepEqual([...new Set(roles)].sort(), ['bg', 'border', 'fg', 'muted', 'surface']);
  assert.match(row, /colors\[visibilityRole\(moment\.visibility\)\]/, 'and the visibility\'s own role for the cue');
  assert.doesNotMatch(row, /destructive|--red|#[0-9a-f]{3,6}\b/i);
  const ledger = await read('app/ledger.tsx');
  assert.doesNotMatch(ledger.slice(ledger.indexOf('viewChoice'), ledger.indexOf('ListEmptyComponent')), /destructive/);
  const choices = await read('src/components/choices.tsx');
  assert.match(choices, /\[styles\.choice, targetSize,/, 'the choice\'s own options are already 44 points');
});

test('pull to refresh and the moments waiting to send are the same in both views', async () => {
  const ledger = await read('app/ledger.tsx');
  assert.equal((ledger.match(/<FlatList/g) || []).length, 1, 'one list, whichever view');
  assert.match(ledger, /const listing = momentListing\(recent, \{ compact, expanded \}\);\s*const shown = listing\.shown;/);
  assert.match(ledger, /data=\{shown\}/);
  assert.match(ledger, /\{listing\.seeAll \? <Button kind="quiet" label=\{expanded \? 'Show recent' : seeAllLabel\(recent\.length\)\} onPress=\{\(\) => setExpanded\(!expanded\)\} \/> : null\}/);
  assert.match(ledger, /<RefreshControl refreshing=\{journey\.refreshing\} onRefresh=\{journey\.refresh\}/);
  assert.match(ledger, /<WaitingMoments activeJourneyId=\{activeId\} \/>/);
  assert.match(ledger, /onSelect=\{\(value\) => momentView\.setView\(value as MomentView\)\}/, 'changing view leaves "See all" alone');
});

// Five moments, newest first: two repairs, a joy, a repair, a joy.
const journey = [
  moment({ id: 'm5', kind: 'repair', occurredOn: '2026-10-09' }),
  moment({ id: 'm4', kind: 'joy', occurredOn: '2026-10-08' }),
  moment({ id: 'm3', kind: 'repair', occurredOn: '2026-10-07' }),
  moment({ id: 'm2', kind: 'repair', occurredOn: '2026-10-06' }),
  moment({ id: 'm1', kind: 'joy', occurredOn: '2026-10-05' }),
];
const listing = (options) => {
  const { shown, seeAll, ...rest } = view.momentListing(journey, options);
  return { shown: shown.map((item) => item.id), seeAll, ...rest };
};

test('in full is today\'s ledger exactly: three recent, then "See all" shows every moment', () => {
  assert.deepEqual(listing({ compact: false, expanded: false }), { shown: ['m5', 'm4', 'm3'], seeAll: true });
  assert.deepEqual(listing({ compact: false, expanded: true }), { shown: ['m5', 'm4', 'm3', 'm2', 'm1'], seeAll: true }, '"Show recent" once all are shown');
  for (const expanded of [false, true]) {
    const full = view.momentListing(journey, { compact: false, expanded });
    assert.deepEqual(full.shown, view.shownMoments(journey, { expanded }), `${expanded}`);
    assert.equal(full.seeAll, view.seeAllShown(journey.length, expanded));
  }
  const three = journey.slice(0, 3);
  assert.equal(view.momentListing(three, { compact: false, expanded: false }).seeAll, false, 'no "See all" when three are all there are (#337)');
});

test('compact shows every moment in the journey, with no "See all"', () => {
  assert.deepEqual(listing({ compact: true, expanded: false }), { shown: ['m5', 'm4', 'm3', 'm2', 'm1'], seeAll: false }, 'more than three, from the start');
  assert.deepEqual(listing({ compact: true, expanded: true }), { shown: ['m5', 'm4', 'm3', 'm2', 'm1'], seeAll: false }, 'whatever "See all" was left at in full');
  assert.deepEqual(view.momentListing([], { compact: true, expanded: false }), { shown: [], seeAll: false });
  const one = view.momentListing([journey[0]], { compact: true, expanded: false });
  assert.deepEqual([one.shown.length, one.seeAll], [1, false]);
});

test('the view is In full or Compact and nothing else: no filter, and an old one cannot narrow the list (#405)', async () => {
  assert.equal(view.momentFilters, undefined, 'the filter choices are gone');
  // A filter chosen before this change, handed in as before, is ignored: every moment of every kind stays in reach.
  for (const compact of [false, true]) for (const filter of ['joy', 'repair', 'other', 'all']) {
    const old = listing({ compact, expanded: true, filter });
    assert.deepEqual(old, { shown: ['m5', 'm4', 'm3', 'm2', 'm1'], seeAll: !compact }, `${compact} ${filter}`);
  }
  assert.deepEqual(Object.keys(view.momentListing(journey, { compact: true, expanded: false })).sort(), ['seeAll', 'shown'], 'nothing that could bring a filter row back');
  const ledger = await read('app/ledger.tsx');
  assert.doesNotMatch(ledger, /Moment types|setFilter|momentFilters|All moments'|Add your own moment/, 'no filter row and no "＋ Add your own moment" on the ledger');
  assert.equal((ledger.match(/<Choices /g) || []).length, 1, 'one set of choices: In full / Compact');
  assert.match(ledger, /<Button label="＋ Hold a moment" onPress=\{\(\) => router\.push\('\/moment'\)\} \/>/, '"＋ Hold a moment" stays the way in');
  // ... including for a kind the person names: the moment screen still offers "other" with its own name.
  const momentScreen = await read('app/moment.tsx');
  assert.match(momentScreen, /draft\.kind === 'other' \? <Field label="Name this kind of moment"/, 'a moment of a kind the person names is still held from "＋ Hold a moment"');
  // Nothing about the filter is kept on the phone, so nothing from before can come back filtered.
  const store = await read('src/storage/ledger-store.ts');
  assert.doesNotMatch(store, /filter/i);
});

test('the heading reads "All moments" in Compact only; In full keeps "Recent moments"', async () => {
  assert.equal(view.momentListHeading(false), 'Recent moments', 'in full, as today');
  assert.equal(view.momentListHeading(true), 'All moments', 'compact, which holds every moment');
  const ledger = await read('app/ledger.tsx');
  assert.match(ledger, /<Text accessibilityRole="header" style=\{\[styles\.sectionTitle, fonts\.serif, \{ color: colors\.fg \}\]\}>\{momentListHeading\(compact\)\}<\/Text>/, 'still a header for screen readers, following the view');
  assert.match(ledger, /const compact = momentView\.view === 'compact';/);
  assert.doesNotMatch(ledger, />Recent moments</, 'never written in place, so the two cannot drift apart');
});

test('the full card is unchanged, in In full and when a compact row opens', async () => {
  const card = await read('src/components/moment-card.tsx');
  assert.match(card, /card: \{ borderWidth: 1, borderLeftWidth: 5, padding: 18 \}/);
  // 31 in Latin; leading() gives Hindi and Bengali room for their marks (scripts.ts).
  assert.match(card, /title: \{ fontSize: 25, lineHeight: leading\(25, 31\) \}/);
});
