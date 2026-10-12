import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

// One Settings door on the phone, with Account settings and the journey's own settings inside it
// (owner, Oct 12, 2026; #399), and back buttons that name where they go (#411).

const mobile = new URL('../apps/mobile/', import.meta.url);

async function importMobile(path) {
  const source = await readFile(new URL(path, mobile), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const read = (path) => readFile(new URL(path, mobile), 'utf8');

const screens = await importMobile('src/shell/screens.ts');
const welcome = await read('app/index.tsx');
const settings = await read('app/settings.tsx');
const layout = await read('app/_layout.tsx');
const account = await read('app/account.tsx');

/** The JSX of one of Settings' sections, from its key to the next. */
function section(name) {
  const start = settings.indexOf(`    ${name}: `);
  assert.ok(start > 0, `Settings has a ${name} section`);
  const next = settings.slice(start + 1).search(/\n {4}[a-z]+: |\n {2}\};/);
  return settings.slice(start, start + 1 + next);
}

test('the welcome has one Settings door, beside Begin your ledger and Have an invitation?', () => {
  const buttons = welcome.split('<Button ').slice(1);
  assert.equal(buttons.length, 3);
  assert.match(buttons[0], /^label="Begin your ledger →"/);
  assert.match(buttons[1], /^kind="quiet" label=\{INVITATION_WORDS\.haveOne\}/);
  assert.match(buttons[2], /^kind="quiet" glyph=\{SETTINGS_GLYPH\} label="Settings" onPress=\{\(\) => router\.push\('\/settings'\)\} \/>/);
  assert.doesNotMatch(welcome, /label="Account"/, 'no second door beside it');
  assert.doesNotMatch(welcome, /router\.push\('\/account'\)/, 'the account is reached through Settings');
  // The ledger keeps its one Settings button in the top bar.
  assert.equal(layout.match(/router\.push\('\/settings'\)/g).length, 1);
  assert.match(layout, /<Stack\.Screen name="ledger" options=\{\{ title: 'Ledger', headerRight: \(\) => <SettingsButton \/> \}\} \/>/);
});

test('the Settings door shows a gear before the word, and is read as "Settings" alone', async () => {
  // The platform's own gear symbol, drawn as text so it takes the word's size and colour on every
  // theme (owner, Oct 12, 2026; #399). No icon font: the app bundles none.
  assert.equal(screens.SETTINGS_GLYPH, '\u2699\uFE0E');
  const pkg = JSON.parse(await read('package.json'));
  assert.ok(!Object.keys(pkg.dependencies).some((name) => /vector-icons|expo-symbols|react-native-svg/.test(name)), 'no icon library added for it');

  // The welcome: the gear is the shared button's glyph, before the label, never the icon alone.
  assert.match(welcome, /import \{ SETTINGS_GLYPH \} from '\.\.\/src\/shell\/screens';/);
  const ui = await read('src/components/ui.tsx');
  assert.match(ui, /accessibilityLabel=\{glyph \? words : undefined\}/, 'a button with a glyph is named by its words alone');
  const glyph = ui.indexOf('<Text accessibilityElementsHidden importantForAccessibility="no" style={[styles.buttonText, { color: text }]}>{glyph}</Text>');
  const words = ui.indexOf('<Text style={[styles.buttonText, { color: text }]}>{words}</Text>');
  assert.ok(glyph > 0 && words > glyph, 'the glyph is hidden from screen readers, in the label\'s size and colour, before it');
  assert.match(ui, /styles\.button, targetSize/, 'the 44-point target is unchanged');

  // The ledger's top bar: the same gear, in the word's own style, before it.
  const button = layout.slice(layout.indexOf('function SettingsButton()'), layout.indexOf('function BackButton('));
  assert.match(button, /accessibilityLabel=\{waiting \? `Settings, \$\{waiting\} to answer` : 'Settings'\}/, 'read as "Settings", with what waits, and never the gear');
  const gear = button.indexOf('<Text accessibilityElementsHidden importantForAccessibility="no" style={[styles.headerButtonText, { color: theme.colors.accent }]}>{SETTINGS_GLYPH}</Text>');
  const label = button.indexOf("<Text style={[styles.headerButtonText, { color: theme.colors.accent }]}>Settings{waiting ? ` · ${waiting}` : ''}</Text>");
  assert.ok(gear > 0 && label > gear, 'the gear sits before the word, sized and coloured with it');
  assert.match(button, /styles\.headerButton, targetSize/, 'the 44-point target is unchanged');
  assert.match(layout, /headerButton: \{ flexDirection: 'row', alignItems: 'center'/);
});

test('Settings is Appearance, the open journey, then Account settings', () => {
  assert.deepEqual(screens.settingsSections({ journeyOpen: true }), ['appearance', 'journey', 'account']);
  assert.deepEqual(screens.settingsSections({ journeyOpen: false }), ['appearance', 'account'], 'no journey open, no journey group');
  assert.match(settings, /settingsSections\(\{ journeyOpen: Boolean\(snapshot\) \}\)\.map\(\(section\) => sections\[section\]\)/, 'the screen draws them in that order');
  assert.match(settings, /const snapshot = journey\.state\.phase === 'ready' \? journey\.state\.snapshot : null;/, 'a journey is open only once it has loaded');

  assert.match(section('appearance'), /<SettingsHeading>Appearance<\/SettingsHeading>\s*<ThemePicker \/>/, 'the theme picker, unchanged');

  const journey = section('journey');
  assert.match(journey, /^ {4}journey: snapshot \? \(/, 'only while a journey is open');
  assert.match(journey, /<SettingsGroup key="journey" heading=\{journeySettingsHeading\(snapshot\.journey\.name\)\}>/, 'headed Journey settings and the journey\'s name');
  const sharing = journey.indexOf('<SettingsRow label={`Sharing${waitingSuffix(waiting)}`} onPress={() => router.push(\'/journey-settings\')} />');
  const history = journey.indexOf('<SettingsRow label="History and conversations" onPress={() => router.push(\'/history\')} />');
  assert.ok(sharing > 0 && history > sharing, 'Sharing, with today\'s waiting count, then History and conversations');
});

test('the journey heading reads "Journey settings · <name>" on screen and to screen readers', async () => {
  assert.equal(screens.journeySettingsHeading('Home in Fall'), 'Journey settings · Home in Fall');
  assert.equal(screens.journeySettingsHeading('Sample journey: Sam and Alex'), 'Journey settings · Sample journey: Sam and Alex');
  const rows = await read('src/components/settings-rows.tsx');
  // The heading is the one Text a screen reader reads: no label of its own to say anything else,
  // and no capitals laid over a journey's name.
  assert.match(rows, /<Text accessibilityRole="header" style=\{\[styles\.heading, \{ color: theme\.colors\.muted \}\]\}>\{children\}<\/Text>/);
  assert.match(rows, /<SettingsHeading>\{heading\}<\/SettingsHeading>/);
  assert.doesNotMatch(rows, /accessibilityLabel=\{accessibilityLabel\}/);
  assert.doesNotMatch(rows, /textTransform/);
  assert.doesNotMatch(settings, /heading=\{snapshot\.journey\.name\}/, 'never the bare name');
});

test('Account settings: the person, Restore purchases and Delete account signed in; one row otherwise', () => {
  const { accountSettingsRows } = screens;
  assert.deepEqual(accountSettingsRows('signed-in'), ['person', 'restore', 'delete'], 'name and email, Restore purchases, then Delete account in red');
  assert.deepEqual(accountSettingsRows('offline'), ['still-signed-in'], 'offline, a signed-in phone says it is still signed in');
  assert.deepEqual(accountSettingsRows('signed-out'), ['sign-in']);
  assert.deepEqual(accountSettingsRows('loading'), ['sign-in']);

  const group = section('account');
  assert.match(group, /<SettingsGroup key="account" heading="Account settings">\s*\{accountSettingsRows\(session\.status\)\.map\(\(row\) => accountRows\[row\]\)\}\s*<\/SettingsGroup>/, 'the rows are exactly those');
  assert.match(settings, /person: session\.status === 'signed-in' \? <SettingsRow key="person" label=\{session\.user\.displayName \|\| session\.user\.username\} detail=\{accountEmailLabel\(session\.user\.email\)\} onPress=\{\(\) => router\.push\('\/account'\)\} \/> : null,/);
  assert.match(settings, /restore: <RestorePurchases key="restore" row \/>,/);
  assert.match(settings, /'still-signed-in': session\.status === 'offline' \? <SettingsRow key="still-signed-in" label="Account settings" detail=\{STILL_SIGNED_IN\[session\.reason\]\}/, 'the still-signed-in words only ever for a phone that is');
  assert.match(settings, /'sign-in': <SettingsRow key="sign-in" label="Sign in or create an account" onPress=\{\(\) => router\.push\('\/account'\)\} \/>,/, 'one row, no line under it, to the screen that also offers Create account');
  assert.match(account, /label="Create account" onPress=\{\(\) => router\.push\('\/register'\)\}/);
  assert.equal(settings.split('STILL_SIGNED_IN[').length, 2, 'said in one place');
  assert.doesNotMatch(settings, /Sign in to manage or delete your account\./, 'the old line is gone');
});

test('a fresh install, and a phone still asking who is signed in, see one row: "Sign in or create an account"', async () => {
  const { createAccountClient } = await importMobile('src/api/client.ts');
  const { sessionAnswered } = await importMobile('src/auth/session-state.ts');
  // A fresh install holds no tokens, so the phone never asks the service and is signed out, not offline.
  const nothingHeld = { read: async () => null, write: async () => {}, clear: async () => {} };
  const client = createAccountClient({ base: () => '/api/v1', tokens: nothingHeld, fetch: async () => { throw new Error('never called'); } });
  const fresh = sessionAnswered(await client.session());
  assert.equal(fresh.status, 'signed-out');
  // Before it has an answer, the session is loading (src/auth/session.tsx).
  assert.match(await read('src/auth/session.tsx'), /useState<SessionState>\(\{ status: 'loading', user: null \}\)/);
  for (const status of [fresh.status, 'loading']) {
    const rows = screens.accountSettingsRows(status);
    assert.deepEqual(rows, ['sign-in'], `${status}: exactly one row`);
    assert.ok(!rows.includes('still-signed-in'), `${status}: never told it is still signed in`);
  }
});

test('Delete account is one tap from Settings, in the destructive colour, and leads to today\'s explain and confirm screens', async () => {
  const rows = await read('src/components/settings-rows.tsx');
  assert.match(rows, /color: destructive \? theme\.colors\.destructive : theme\.colors\.fg/);
  assert.match(settings, /destructive label="Delete account" onPress=\{\(\) => router\.push\('\/delete-account'\)\}/, 'one tap');
  assert.match(await read('app/delete-account.tsx'), /confirmConsequence\(\{ title: 'Permanently delete this account\?'/, 'then today\'s confirmation');
});

test('Privacy, Terms and Help sit at the foot for everyone, each a 44-point target, with the build label', async () => {
  const foot = settings.slice(settings.indexOf('<View style={styles.foot}>'));
  assert.ok(settings.indexOf('<View style={styles.foot}>') > settings.indexOf('.map((section) => sections[section])'), 'after every group');
  assert.ok(!foot.includes('session.'), 'nothing at the foot depends on being signed in');
  assert.match(foot, /<FootLink label="Privacy policy" onPress=\{\(\) => router\.push\('\/privacy'\)\} \/>/);
  assert.match(foot, /<FootLink label="Terms of use" onPress=\{\(\) => router\.push\('\/terms'\)\} \/>/);
  assert.match(foot, /<FootLink label="Help" expanded=\{helpOpen\}/);
  assert.match(foot, /\{helpOpen \? <Body selectable>For help using Together Ledger, write to ledger-support@together-ledger\.com\. For anything about your privacy or your data, write to legal@together-ledger\.com\.<\/Body> : null\}/, 'Help shows today\'s two addresses');
  assert.ok(foot.indexOf('{thisBuild.label}') > foot.indexOf('helpOpen ?'), 'the build label last');

  const rows = await read('src/components/settings-rows.tsx');
  const pressables = rows.split('<Pressable').length - 1;
  assert.equal((rows.match(/<Pressable[\s\S]*?targetSize[\s\S]*?>/g) || []).length, pressables, 'every row and link is at least 44 points');
});

test('the sentence under the sign-in buttons points to a screen that is really called Account settings', async () => {
  const social = await importMobile('src/auth/social-sign-in.ts');
  assert.equal(social.NEW_ACCOUNT_NAME, 'A new account starts with your first name. You can change it in Account settings.');
  assert.match(layout, /<Stack\.Screen name="account" options=\{\{ title: 'Account settings' \}\} \/>/);
  assert.equal(account.match(/<Screen title="Account settings"/g).length, 3, 'loading, offline and signed in');
  assert.match(settings, /heading="Account settings"/);
  assert.match(await read('app/journey-settings.tsx'), /title="Journey sharing"/, 'Journey sharing keeps its own name');
});

test('a back button names where it goes back to, never the screen it is on', () => {
  const { backLabel, SCREEN_TITLES } = screens;
  const stack = (...names) => names.map((name, index) => ({ key: `${name}-${index}`, name }));
  const fromWelcome = stack('index', 'settings', 'account');
  assert.equal(backLabel(fromWelcome, 'settings-1'), 'Welcome');
  assert.equal(backLabel(fromWelcome, 'account-2'), 'Settings', 'Account settings goes back to Settings (#411)');
  assert.equal(backLabel(stack('ledger', 'settings', 'journey-settings'), 'journey-settings-2'), 'Settings');
  assert.equal(backLabel(stack('ledger', 'settings'), 'settings-1'), 'Ledger');
  assert.equal(backLabel(stack('ledger', 'settings', 'history', 'history-guide'), 'history-guide-3'), 'History');
  assert.equal(backLabel(stack('ledger'), 'ledger-0'), undefined, 'nothing under it, no label');
  for (const name of Object.keys(SCREEN_TITLES)) {
    for (const below of Object.keys(SCREEN_TITLES)) {
      if (SCREEN_TITLES[name] === SCREEN_TITLES[below]) continue;
      assert.notEqual(backLabel(stack(below, name), `${name}-1`), SCREEN_TITLES[name], `${name} over ${below}`);
    }
  }

  // The titles the back buttons say are the titles the screens have.
  const declared = [...layout.matchAll(/<Stack\.Screen name="([^"]+)" options=\{\{ title: '([^']+)'/g)].map(([, name, title]) => [name, title]);
  assert.deepEqual(Object.fromEntries(declared), SCREEN_TITLES);

  // Both phones: the iPhone's own back button is told the words; Android's is drawn with them.
  assert.match(layout, /const back = backLabel\(navigation\.getState\(\)\?\.routes, route\.key\);/);
  assert.match(layout, /headerBackTitle: back,/);
  assert.match(layout, /Platform\.OS === 'android' && back \? \{ headerLeft: \(\) => <BackButton label=\{back\} \/> \}/);
  assert.match(layout, /accessibilityLabel=\{backAccessibilityLabel\(label\)\}\s*onPress=\{\(\) => router\.back\(\)\}/);
  assert.equal(screens.backAccessibilityLabel('Settings'), 'Back to Settings');
});
