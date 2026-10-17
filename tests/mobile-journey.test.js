import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import * as model from '../src/model.js';
import * as momentThemes from '../src/moment-themes.js';
import { t, webConstant, webFunction } from './fixtures/web-english.js';
import { setFormatter } from '../apps/mobile/src/i18n/sentences.js';
import { createFormatter } from '../src/i18n/format.js';

const mobile = new URL('../apps/mobile/', import.meta.url);
const read = (path) => readFile(new URL(path, mobile), 'utf8');
const web = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
const tokens = JSON.parse(await read('src/theme/tokens.json'));

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
// The phone's sentences are keys (docs/TRANSLATION.md); a date or an amount inside one is isolated
// with invisible marks, so it is compared without them.
const english = JSON.parse(await readFile(new URL('../locales/en.json', import.meta.url), 'utf8'));
const unmarked = (text) => (typeof text === 'string' ? text.replace(/[\u2068\u2069]/g, '') : text);

// The web's own functions are lifted out of src/app.js (tests/fixtures/web-english.js), so the
// phone is compared with what the web actually runs, in the English it reads from locales/en.json.
const momentKindName = webFunction('momentKindName', ['MOMENT_KIND_KEYS', webConstant('MOMENT_KIND_KEYS')]);

test('dates, money and moment types are the web\'s own functions, not copies', () => {
  assert.equal(view.dateLabel, model.dateLabel);
  assert.equal(view.money, model.money);
  assert.equal(view.MOMENT_TYPES, model.MOMENT_TYPES);
  assert.equal(view.normalizeMomentTheme, momentThemes.normalizeMomentTheme);
  assert.equal(unmarked(view.moneyContext({ moneyCents: 1250, moneyCurrency: 'USD' })), `${model.money(1250, 'USD')} is held here as context, not a score.`);
  assert.equal(english['common.moment.moneyContext'], '{amount} is held here as context, not a score.');
  assert.ok(web.includes("<p>${sentenceMarkup('common.moment.moneyContext', { amount: money(moment.moneyCents, moment.moneyCurrency, format) })}</p>"));
  assert.equal(view.moneyContext({ moneyCents: null }), null);
});

test('a journey\'s period and a moment\'s label read exactly as the web writes them', () => {
  const journeyPeriod = webFunction('journeyPeriod', ['dateLabel', model.dateLabel], ['format', null]);
  try {
    setFormatter(createFormatter({ locale: 'bn', numberingSystem: 'beng', regionalDates: true, device: 'en-US' }));
    assert.ok(view.journeyPeriod({ startDate: '2026-05-14', startDateStatus: 'exact', endDateStatus: 'forever' }).includes('১৪'), "the journey period uses the formatter");
    assert.ok(!view.journeyPeriod({ startDate: '2026-05-14', startDateStatus: 'exact', endDateStatus: 'forever' }).includes('14'), "the journey period uses the formatter");
  } finally {
    setFormatter(null);
  }
  const momentLabel = webFunction('momentLabel', ['momentKindName', momentKindName]);
  const journeys = [
    { location: 'Marlow', startDate: '2026-05-14', startDateStatus: 'exact', endDate: '2026-06-18', endDateStatus: 'date' },
    { location: '', startDateStatus: 'unknown', endDateStatus: 'forever' },
    { startDate: '2026-01-02', startDateStatus: 'exact', endDateStatus: 'unsure' },
  ];
  for (const journey of journeys) assert.equal(unmarked(view.journeyPeriod(journey)), journeyPeriod(journey));
  for (const [kind, kindLabel] of [['memory'], ['other', 'Our word'], ['other', ''], ['retired-kind']]) assert.equal(view.momentLabel(kind, kindLabel), momentLabel(kind, kindLabel));
});

test('every visibility is told by shape and word, and anything unknown reads as private', () => {
  const webCues = webConstant('VISIBILITY_CUES');
  const cue = webFunction('visibilityCue', ['VISIBILITY_CUES', webCues]);
  for (const [visibility, { glyph, label }] of Object.entries(view.VISIBILITY_CUES)) {
    assert.deepEqual({ glyph: webCues[visibility].glyph, label: t(webCues[visibility].key) }, { glyph, label }, `${visibility} matches the web`);
  }
  for (const visibility of ['private', 'share-later', 'shared-now', 'something-new', '']) assert.deepEqual(view.visibilityCue(visibility), cue(visibility));
  assert.equal(view.visibilityCue('something-new').glyph, '○', 'an unknown visibility takes the private ring');
  assert.equal(view.visibilityRole('something-new'), 'private', 'and the private colour, never a shared one');
  assert.equal(view.visibilityRole('shared-now'), 'sharedNow');
  assert.equal(view.visibilityRole('share-later'), 'shareLater');
});

test('moments are newest first, carry their photos, and the list opens on three', () => {
  const moment = (id, kind, occurredOn, updatedAt = '2026-08-01T00:00:00.000Z') => ({ id, journeyId: 'j', kind, occurredOn, updatedAt, title: id, visibility: 'shared-now' });
  const snapshot = {
    journey: { id: 'j', name: 'Ours' },
    moments: [moment('a', 'memory', '2026-05-01'), moment('b', 'promise', '2026-07-01'), moment('c', 'memory', '2026-07-01', '2026-08-02T00:00:00.000Z'), moment('d', 'feeling', '2026-06-01')],
    images: [{ id: 'i1', momentId: 'c', filename: 'Sea.jpg', deletedAt: null }, { id: 'i2', momentId: 'c', filename: 'Old.jpg', deletedAt: '2026-08-03T00:00:00.000Z' }],
    concerns: [{ id: 't1', title: 'Open', status: 'open' }, { id: 't2', title: 'Settled', status: 'resolved' }],
  };
  const recent = view.recentMoments(snapshot);
  assert.deepEqual(recent.map(({ id }) => id), ['c', 'b', 'd', 'a']);
  assert.deepEqual(recent[0].images.map(({ id }) => id), ['i1']);
  assert.deepEqual(recent[0].removedImages.map(({ id }) => id), ['i2']);
  assert.deepEqual(view.shownMoments(recent, { expanded: false }).map(({ id }) => id), ['c', 'b', 'd']);
  assert.deepEqual(view.shownMoments(recent, { expanded: true }).map(({ id }) => id), ['c', 'b', 'd', 'a'], 'every moment, of every kind (#405)');
  // "See all 1 moment", never "See all 1 moments", on the phone and the web alike (#337).
  assert.equal(view.seeAllLabel(1), 'See all 1 moment');
  assert.equal(view.seeAllLabel(4), 'See all 4 moments');
  assert.ok(web.includes("t('common.ledger.seeAll', { count: recent.length })"), 'the web builds its label from one sentence');
  for (const count of [1, 4]) assert.equal(t('common.ledger.seeAll', { count }), view.seeAllLabel(count));
  // Shown only when the ledger is not already showing every moment (the owner, on #337).
  assert.equal(view.seeAllShown, model.seeAllShown, 'the phone uses the web\'s own rule');
  assert.ok(web.includes("$('#toggle-moments-button').hidden = !seeAllShown(recent.length, momentsExpanded);"));
  assert.ok(web.includes('recent.slice(0, RECENT_MOMENTS_SHOWN)'), 'and the web shows as many as the rule counts');
  assert.equal(view.momentFilters, undefined, 'no moment filter on the phone (#405)');
  assert.deepEqual(view.openThreads(snapshot).map(({ id }) => id), ['t1']);
  assert.equal(view.chooseJourney([{ id: 'x' }, { id: 'y' }], 'y'), 'y');
  assert.equal(view.chooseJourney([{ id: 'x' }, { id: 'y' }], 'gone'), 'x');
  assert.equal(view.chooseJourney([], null), null);

  assert.equal(view.shownDate(''), 'Date not set');
});

test('a moment\'s own atmosphere is painted in the same colours on the phone as on the web', () => {
  const roles = { bg: 'bg', fg: 'fg', muted: 'muted', accent: 'accent', border: 'border', meta: 'metaBg', 'on-accent': 'onAccent', private: 'private', 'shared-now': 'sharedNow', 'share-later': 'shareLater' };
  for (const { id } of momentThemes.MOMENT_THEMES) {
    const rule = css.match(new RegExp(`\\[data-moment-theme="${id}"\\] \\{([^}]*)\\}`))[1];
    const colors = tokens.themes.find((theme) => theme.id === id).colors;
    for (const [cssName, role] of Object.entries(roles)) {
      const value = rule.match(new RegExp(`--moment-${cssName}: ([^;]+);`))[1].trim();
      assert.equal(colors[role].replaceAll(' ', '').toLowerCase(), value.replaceAll(' ', '').toLowerCase(), `${id} ${role}`);
    }
  }
});

test('the visibility cue is drawn with the moment, never after it', async () => {
  const card = await read('src/components/moment-card.tsx');
  const body = card.slice(card.indexOf('export function MomentCard'), card.indexOf('function Chip'));
  assert.doesNotMatch(body, /useEffect|useState|await/, 'nothing about the card itself waits: its cue arrives with its title');
  assert.match(body, /const cue = visibilityCue\(moment\.visibility\)/);
  assert.match(body, /borderLeftColor: cueColor/, 'the border carries it');
  assert.match(body, /\{cue\.glyph\} <\/Text>\s*\{cue\.label\}/, 'the shape and the word carry it');
  assert.match(body, /accessibilityLabel=\{t\('common\.moment\.visibilitySpoken', \{ visibility: cue\.label \}\)\}/, 'and a screen reader says it');
  assert.equal(english['common.moment.visibilitySpoken'], 'Visibility: {visibility}');
});

test('a themed card wears its theme without naming it; the form and History still name it (Oct 9)', async () => {
  const card = await read('src/components/moment-card.tsx');
  const body = card.slice(card.indexOf('export function MomentCard'), card.indexOf('function Chip'));
  assert.match(body, /const colors = ownTheme \? getTheme\(ownTheme\)\.colors : app\.colors;/, 'still painted in its own theme');
  assert.doesNotMatch(card, /momentThemeLabel/, 'the card never looks up its theme\'s name');
  assert.doesNotMatch(body, /\btheme`|\btheme'|\btheme"/, 'and writes no "… theme" label beside the visibility cue');
  assert.match(body, /accessibilityLabel=\{t\('common\.moment\.visibilitySpoken', \{ visibility: cue\.label \}\)\}/, 'the cue\'s own accessible label is unchanged');
  assert.ok(!web.includes('moment-theme-chip') && !css.includes('moment-theme-chip'), 'the web card has dropped it too, with the style only it used');

  const form = await read('app/moment.tsx');
  assert.match(form, /\[\{ id: '', label: t\('common\.moment\.useMyTheme'\) \}, \.\.\.MOMENT_THEMES\.map\(\(\{ id, label \}\) => \(\{ id, label: themeName\(id, label\) \}\)\)\]/, 'the form still offers each theme by name');
  assert.match(form, /help=\{t\('common\.moment\.previewHelp', \{ theme: momentThemeName\(draft\.theme\) \}\)\}/, 'and the live preview still says which');
  assert.equal(english['common.moment.previewHelp'], '{theme} · exactly as this moment will appear in the ledger.');
  for (const theme of ['', 'light', 'dark', 'green', 'flexoki', 'rose-pine']) assert.equal(view.momentThemeName(theme), momentThemes.momentThemeLabel(theme), `${theme || 'none'}: the web's name, word for word`);
  const sharing = await importMobile('src/journey/sharing-view.ts');
  assert.equal(sharing.valueLabel('theme', 'flexoki'), 'Flexoki', 'History still names a changed theme');
});

test('switching journey, or account, never shows one journey\'s moments under another', async () => {
  const hook = await read('src/journey/use-journey.ts');
  // The open journey stays until the other has loaded (#352); its name and moments are one snapshot.
  assert.match(hook, /select: \(journeyId: string\) => \{\s*if \(!userId\) return;\s*setHeld\(\(current\) => \(current\?\.forUser === userId \? \{ forUser: userId, state: opening\(current\.state, journeyId\) \} : current\)\);/);
  assert.doesNotMatch(hook, /phase: 'loading' \} \}\)/, 'choosing a journey never blanks the ledger');
  assert.match(hook, /held\?\.forUser === userId \? held\.state : \{ phase: 'loading' \}/, 'what is held belongs to the account that loaded it');
  assert.match(hook, /if \(attempt !== latest\.current\) return;/, 'an answer that arrives late is dropped');
});

test('the phone asks for journeys, snapshots and photos as the signed-in app', async () => {
  const { createAccountClient } = await importMobile('src/api/client.ts');
  let held = { token: 'access-1', tokenExpiresAt: '2026-10-01T00:00:30.000Z', refreshToken: 'refresh-1', refreshTokenExpiresAt: '2026-10-30T00:00:00.000Z' };
  const calls = [];
  const client = createAccountClient({
    base: () => 'https://api.example.test/api/v1',
    tokens: { read: async () => held, write: async (value) => { held = value; }, clear: async () => { held = null; } },
    fetch: async (url, init) => {
      calls.push(`${init.method} ${url} ${init.headers.Authorization || ''}`.trim());
      const data = url.endsWith('/auth/refresh')
        ? { user: { id: 'u' }, token: 'access-2', tokenExpiresAt: '2026-10-01T01:00:00.000Z', refreshToken: 'refresh-2', refreshTokenExpiresAt: '2026-10-30T00:00:00.000Z' }
        : url.endsWith('/journeys') ? { journeys: [{ id: 'j 1' }] } : { journey: { id: 'j 1' }, moments: [] };
      return { ok: true, status: 200, json: async () => ({ data }) };
    },
  });
  assert.deepEqual(await client.journeys(), [{ id: 'j 1' }]);
  await client.snapshot('j 1');
  const photo = await client.imageSource('j 1', 'm', 'i', Date.parse('2026-10-01T00:00:00.000Z'));
  assert.deepEqual(calls, [
    'GET https://api.example.test/api/v1/journeys Bearer access-1',
    'GET https://api.example.test/api/v1/journeys/j%201/snapshot Bearer access-1',
    'POST https://api.example.test/api/v1/auth/refresh',
  ], 'a token with under a minute left is refreshed before a photo is asked for');
  assert.deepEqual(photo, { uri: 'https://api.example.test/api/v1/journeys/j%201/moments/m/images/i', headers: { Authorization: 'Bearer access-2', 'x-together-client': 'app' } });
});

test('pull to refresh re-reads the snapshot, and the list only draws what is on screen', async () => {
  const ledger = await read('app/ledger.tsx');
  assert.match(ledger, /<FlatList/, 'a virtualised list, so photos load as their moments scroll in');
  assert.match(ledger, /\{listing\.seeAll \? <Button kind="quiet" label=\{expanded \? t\('home\.moments\.showRecent'\) : seeAllLabel\(recent\.length\)\}/, '"See all" only when there is more to see (#337)');
  assert.match(await read('src/journey/journey-view.ts'), /seeAll: !compact && seeAllShown\(recent\.length, expanded\)/, 'still the web\'s own rule, in the full view');
  assert.match(ledger, /<RefreshControl refreshing=\{journey\.refreshing\} onRefresh=\{journey\.refresh\}/);
  assert.match(ledger, /<EmptyState title=\{t\('common\.ledger\.emptyTitle'\)\} body=\{t\('common\.ledger\.emptyBody'\)\} \/>/);
  assert.deepEqual([english['common.ledger.emptyTitle'], english['common.ledger.emptyBody']], ['No moments here yet', 'A small truth is enough to begin.']);
  assert.doesNotMatch(ledger + web, /choose another filter to see more/, 'no sentence that asks for a filter that is gone (#405)');
  assert.match(ledger, /<EmptyState compact title=\{t\('common\.threads\.emptyTitle'\)\} body=\{t\('common\.threads\.emptyBody'\)\} \/>/);
  assert.deepEqual([english['common.threads.emptyTitle'], english['common.threads.emptyBody']], ['No open threads', 'That can be a good place to rest.']);
  assert.ok(web.includes("emptyState(escapeHtml(t('common.ledger.emptyTitle')), escapeHtml(t('common.ledger.emptyBody')))"));
  assert.deepEqual([english['common.ledger.emptyTitle'], english['common.ledger.emptyBody']], ['No moments here yet', 'A small truth is enough to begin.']);
  assert.ok(web.includes("emptyState(escapeHtml(t('common.threads.emptyTitle')), escapeHtml(t('common.threads.emptyBody')), { compact: true })"));
  assert.deepEqual([english['common.threads.emptyTitle'], english['common.threads.emptyBody']], ['No open threads', 'That can be a good place to rest.']);
});
