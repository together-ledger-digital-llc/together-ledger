# Translation

How the web and the phone say things in more than one language. v1 ships in five: English (`en`),
Hindi (`hi`), Bengali for Bangladesh and India alike (`bn`), Latin American Spanish (`es-419`) and
Hinglish, Hindi in Latin script (`hi-Latn`). Only English exists so far. The rest are drafts.

## The pieces

| File | What it is | Travels to another app? |
|---|---|---|
| `src/i18n/translator.js` | `t()`: formats a sentence, isolates people's text, falls back to English, translates server errors by code | Copy as is |
| `src/i18n/format.js` | Dates, numbers and money for the active language, with that language's digits | Copy as is |
| `src/i18n/catalog.js` | Reads translation files; the checks; the manifest rules; the glossary's TBX export | Copy as is |
| `src/i18n/dom.js` | `t()` on a web page: `data-i18n` attributes and `<bdi>` | Copy as is (web only) |
| `src/i18n/pseudo.js` | The pseudo-language, for testing layouts only; never shipped | Copy as is |
| `src/i18n/language-choice.js` | Which language a person reads in: their choice, else their device's languages, else English; and the language screen readers speak | Copy as is |
| `src/i18n/web.js` | This web app's wiring: loads `locales/` from its own origin, chooses the language, sets `<html lang>` | Rewrite per app |
| `apps/mobile/src/i18n/` | This phone app's wiring (`index.ts`), the Language preference (`language-provider.tsx`), and the Intl polyfills | Rewrite `index.ts` and `language-provider.tsx`; copy the polyfills |
| `src/vendor/intl-messageformat.js` | FormatJS's IntlMessageFormat for the web, made by `scripts/vendor-intl-messageformat.mjs` | Regenerate |
| `locales/en.json` | Every English sentence, with a note for translators | The format travels; the words don't |
| `locales/languages.json` | The languages manifest: status, reviewer, approval date, fallback, formatting | The shape travels |
| `locales/glossary.json` | The product's careful words | The shape travels |
| `scripts/i18n-moved-areas.json` | Every area already moved to `t()` | The shape travels |
| `scripts/check-hardcoded-sentences.mjs` | Fails `npm run check` on a sentence written straight into a moved area | Copy as is |

The core files import nothing and name nothing about Together Ledger. The web and the phone run
the same `translator.js` and `format.js` and read the same `locales/en.json`. There is never a
second copy.

## Why this approach

- **ICU MessageFormat, formatted by FormatJS's `intl-messageformat`.** ICU is the standard every
  translation platform understands, and FormatJS is the most used, best maintained JavaScript
  implementation. We don't write a parser. Plural rules, numbers and dates come from the
  platform's own `Intl`. `IntlMessageFormat` is passed into `createTranslator`, so the core works
  with any copy of it.
- **The web has no bundler**, so it loads one file, `src/vendor/intl-messageformat.js`, bundled
  from the installed package down to ES2020. FormatJS's own bundle uses class static blocks, which
  Safari can't read before 16.4, and a module that fails to parse stops the whole page.
  `tests/i18n-catalog.test.js` fails if the file isn't exactly what the installed version makes.
  After upgrading `intl-messageformat`, run `node scripts/vendor-intl-messageformat.mjs`.
- **The phone imports the package**, and Metro bundles it together with `locales/*.json`. Nothing
  is fetched at runtime.
- **The web reads `locales/en.json` from its own origin**, shipped in the same release as
  `app.js`, preloaded from `index.html`. It never goes to a CDN or a translation service.
  `src/i18n/web.js` waits for the file the way `app.js` waits for any module it imports.

## Adding a sentence

1. Choose a key (below) and add it to `locales/en.json` with a note:

   ```json
   "journey.leave.confirm": "Leave {journey}?",
   "@journey.leave.confirm": {
     "description": "Title of the question asked before leaving a journey. It cannot be undone.",
     "placeholders": { "journey": { "type": "String", "example": "Home in Fall", "description": "The journey's name, in any script." } }
   }
   ```

2. Use it. On the phone: `t('journey.leave.confirm', { journey: name })` from `src/i18n`. On the
   web: `t()` from `src/i18n/web.js` for text and attributes, `renderSentence(element, key, values)`
   or `sentenceHtml(key, values)` when the sentence carries a person's text, and
   `data-i18n="key"` / `data-i18n-aria-label="key"` in `index.html`.
3. `npm test` checks that the key exists, has a note, parses, and is used.

Rules:

- **Never build a sentence by joining pieces.** One sentence is one key, with placeholders. Word
  order differs between languages, and so does where a name or number falls.
- **Plurals and choices go inside the sentence**:
  `{count, plural, one {# moment} other {# moments}}` and `{status, select, open {Open} other {Resolved}}`.
  Every plural and select needs an `other`.
- **A sentence about a person carries `{gender, select, ...}` in English too**, even when every
  English branch reads the same. Hindi verbs agree with the person's gender, and a translator can't
  add a placeholder English lacks. The product doesn't hold anyone's grammatical gender yet, so
  until it does, Hindi gets `other`, and its translators should write that branch in a neutral
  form.
- **Numbers inside a sentence** use `{n, number}` (or `{n, number, ::group-off}` with no thousands
  separator), so they get the language's digits. Dates are formatted with `format.dateTime()` and
  passed in.
- **Apostrophes:** write ’ (U+2019), as the product already does. In ICU an ASCII `'` before `{`, `}`
  or `#` starts a quotation.
- **No markup in sentences.** Messages are parsed with `ignoreTag`, so `<b>` is just text.

## The pseudo-language

A test language, never offered to people. Every sentence comes out about 30% longer than English,
with its letters accented and the whole of it in brackets:

```
Backup and restore             →  [Bááçķúp ááñď ŕééšťóóŕé]
{journey} history              →  [{journey} ĥííšťóóŕý]
{status, select, open {Open} other {Resolved}}  →  [{status, select, open {Óópéñ} other {Ŕééšóóľvéď}}]
```

It shows three things before any translation exists: a sentence cut off (its closing bracket is
missing), a sentence that overflows or wraps where English didn't (Hindi, Bengali and Spanish run
about 30% longer), and a sentence still written straight into a screen (the one without accents).
The accents also sit above the capitals, so a line height that clips them shows. Only the words
change. Placeholders, plurals, selects, `#`, ICU's quoting apostrophes and HTML tags stay exactly
as they are, so every sentence formats with the same values, and a person's own text (a name, a journey)
comes through unaccented.

**Switching it on.** It's a development-only switch, never a setting, and it has no screen or
route of its own:

- **Web:** `npm run dev`, then open `http://127.0.0.1:4173/?pseudo`. It works only when the page
  is served from `localhost` or `127.0.0.1`. `src/i18n/web.js` imports `pseudo.js` only then, and
  only dynamically. The website's build (`scripts/build-public-site.mjs`) doesn't list the file,
  and `.dockerignore` keeps it out of the server image, so in production there is nothing to load.
- **Phone:** `EXPO_PUBLIC_I18N_PSEUDO=1 npx expo start`, with a development build. The switch is
  `if (__DEV__ && process.env.EXPO_PUBLIC_I18N_PSEUDO === '1')` in `apps/mobile/src/i18n/index.ts`.
  A release build compiles `__DEV__` to `false`, and Metro drops the branch and the file it requires.
  This was checked: an `npx expo export` for Android, with the variable set, has no trace of it;
  the same export with `--dev` has.

Its tag is `en-XA`, the pseudo-locale Android and Chromium use. It formats with English's plural
rules, dates and numbers. It isn't in `locales/languages.json` and has no translation file, so
`offeredLanguages()` can never return it. `tests/i18n-pseudo.test.js` holds all of that.

**The check on it.** `pseudoProblems()` runs every key in `locales/en.json` through the
pseudo-language and fails if any placeholder, plural, select or `#` is lost, added, renamed or moved,
if any HTML tag in a sentence changes, if a sentence doesn't parse, or if one comes out no longer,
unaccented or unbracketed. It compares each sentence's whole structure without its words, so a
renamed branch (`one` → `few`) or a changed number skeleton fails too. The same test runs each
result through the gate an approved translation passes. A new key is covered automatically.

### What it found, at 101C

The web's Settings and the phone's History, at 320px and desktop width, Light and Dark. The
phone's were mockups, not a real phone. Nothing is cut off. Nothing overlaps, and nothing scrolls
sideways. For 102 and 103 to fix:

- **Web, the × that closes Settings** is 31px wide at 320px (in English too). At desktop width
  the longer title squeezes it to 38px. Its height is 44px throughout.
- **Web, Export all journeys** wraps onto two lines at 320px. So do the Journey settings and
  Backup and restore headings, and the reset question takes three lines.
- **Phone, a Button that wraps** (Start a return-to conversation, at 320pt, in English too) has no
  padding above or below, so two lines fill it from edge to edge.
- **Still in English inside a moved area:** the theme names (`src/themes.js`), Journey sharing,
  the reset question's eyebrow and Keep things as they are, and History's How to read your history.

## Moved areas, and the guard

`scripts/i18n-moved-areas.json` lists every area whose sentences have moved to `t()`. It's the one
place to list them. `scripts/check-hardcoded-sentences.mjs`, run by `npm run check`, fails when a
sentence is written straight into one of them:

```
A sentence is written straight into an area that has moved to t(). Add it to locales/en.json and use its key (docs/TRANSLATION.md):
  apps/mobile/app/history.tsx:73  The phone's History: "Recorded changes"
```

An area is a file, with how much of it has moved:

- `"kind": "html"` with `element`: that element and everything in it (`<dialog id="settings-dialog">`).
  `except` lists elements inside it that haven't moved yet, each with the prompt that moves them.
  It flags any text between tags with a letter in it, and any `aria-label`, `placeholder`, `title`
  or `alt` with one. A moved element stays empty and names its key in `data-i18n`.
- `"kind": "script"`: the whole file, or with `statements` only the statements that begin with
  those words (in `src/app.js`, Settings is a few statements among many). It flags text between
  JSX tags, a string with a letter in it given to something people read (`label`, `title`, `lead`,
  `textContent`, a toast, a status...), and any other string that reads as words: a capital and then
  a space, or a word and then a full stop, question mark or colon. Keys, paths, style values and
  select values (`'yes'`, `'open'`) are none of these.
- `allow`, on any area: exact text that is never translated.

An element or statement that can't be found fails too, so the list never silently checks nothing.

**When 102 and 103 move an area,** add it to the list in the same change. When they move what an
area left out, take it out of `except`. `tests/i18n-hardcoded-sentences.test.js` plants a sentence
in each kind of area, in memory, and proves the guard fails on it and passes without it.

The guard reads; it doesn't parse. A regular-expression literal with a quote in it can confuse it.
None of the moved areas has one.

## Keys

`area.thing.element`, each part lowerCamelCase: `journey.leave.confirm`,
`settings.backup.export`, `history.event.record`. A key names what the sentence means, never its
English words, so it keeps its name when the wording changes.

- `common.*` is for a sentence used on more than one screen or on both platforms:
  `common.theme.note` is under the theme menu on the web and on the phone.
- The same wording with the same job uses the same key. The same English words with different jobs
  don't: `settings.reset.title` (a heading) and `settings.reset.action` (a button) both read
  "Start fresh" in English, and Hindi may need a noun for one and a verb for the other.
- Server errors read under `error.server.<code>`, camelCased: `rate_limit_exceeded` →
  `error.server.rateLimitExceeded` (`errorKey()`).

## Notes for translators

Translation files are **ARB** (Application Resource Bundle): one flat JSON object. `"key": "ICU
message"` holds a sentence, `"@key"` holds its note (`description`, plus `placeholders` with a
type, an example and a description for each), and `"@@locale"` names the language. Notes live
only in English. A translation file has `@@locale` and the sentences:

```json
{ "@@locale": "hi", "journey.leave.confirm": "{journey} छोड़ें?" }
```

A note says where the sentence appears, what it does, and anything a translator could get wrong:
that it cannot be undone, that a word is a glossary term, that a name can be in any script.

ARB was chosen because the three common platforms import it with its notes and ICU plurals, and
because one file per language, notes included, needs no tooling of our own. Checked:

- **Weblate**: run, not just read about. Its file engine, translate-toolkit 3.20 (`ARBJsonFile`),
  read all 44 keys of `locales/en.json` in order, with every note, and wrote a translation back
  with the dotted keys and the ICU intact. It also read `glossary.tbx`. In Weblate, choose the
  "ARB file" format.
- **Crowdin**: from its documentation. ARB is native (API type `arb`), with plurals and with
  descriptions as context. Our files end in `.json`, so set `type: arb` for them in `crowdin.yml`.
- **Lokalise**: from its documentation. ARB is supported, with description, context and
  placeholders, but it calls ICU plurals and genders in ARB experimental. Upload with an `.arb`
  file name (the API takes the name apart from the content), and check a plural survives the round
  trip before relying on it.

Nothing has been uploaded to Crowdin or Lokalise yet: no project exists on either.

## The glossary

`locales/glossary.json` holds the product's careful words: *rests*, *another person*, *another
place*, *journey*, *moment* and *journeyer*. Each entry has its meaning, an example, the words it
must never become (*seat*, *license*, *slot*, *removed*...), and a place for each language's
agreed term, `{ "term": "...", "note": "..." }`, which 105–109 fill in. Platforms import a glossary
as TBX: `node scripts/export-glossary.mjs > glossary.tbx`.

## The languages manifest, and how a language is approved

`locales/languages.json` lists every language with:

- `status`: `draft` → `in-review` → `approved`.
- `reviewer` and `approvedOn` (YYYY-MM-DD): required once a language is approved, empty before.
- `fallback`: always `en`. Hinglish falls back to English, never to Hindi: a reader of Latin
  script may not read Devanagari.
- `formatting`: `locale` (what dates, numbers and money are written in), `regionalDates` (keep the
  person's own region in dates, so a phone set to en-GB writes 12 Oct 2026), and
  `numberingSystem` (`latn`, `beng`, `deva`..., or `null` for the locale's own default).

A language is:

1. **Drafted**: its `locales/<tag>.json` is written, with the glossary terms agreed for it.
2. **In review**: a fluent reviewer reads every sentence on screen, on the web and the phone.
3. **Approved**: once the reviewer signs off, set `status`, `reviewer` and `approvedOn` in one
   commit. From then on, `tests/i18n-catalog.test.js` fails if its file is missing a key, has one
   English doesn't, drops or renames a placeholder, or changes a placeholder's kind.

**Only an approved language may ever be offered to people** (`offeredLanguages()`). English is the
source: approved by being the product's own words, with no reviewer to record.

## People's text inside a sentence

Names, journey names, emails, IDs: anything inserted as `{name}` is isolated, so a Bengali name in
an English sentence (or the other way round) lays out as its own run. The phone wraps it in Unicode
isolate marks (U+2068 … U+2069), which are invisible. The web puts it in a `<bdi>`, or uses the same
marks in an attribute, where an element can't go. It happens automatically for every string
inserted as plain text, but never for a value a `select` chooses by.

## Fallback

A key a language lacks reads in English, and in development the console warns once per key. A key
English lacks shows the key itself, with the same warning. A sentence that fails to format (a
missing value, a broken translation) falls back to English rather than breaking the screen.

## Choosing the language

Which language a person reads in is decided the same way on the web and the phone, by
`src/i18n/language-choice.js`:

1. **A language they chose by hand**, if the manifest still offers it.
2. Otherwise **"Follow my device"**: the device's own languages are walked **in order, the whole
   list**, not only the first, and the first one that matches an offered language wins.
3. Otherwise English.

A choice is a tag or nothing. Nothing is "Follow my device", and it is never stored as English:
someone who chose English stays in English on a phone that moves to Hindi, and someone who never
chose follows the phone when it changes.

**How a device's language matches** (`matchLanguage`): the same language in the same script
matches, whatever the region. So:

| The device says | Reads in |
|---|---|
| `es-419`, `es-MX`, `es-AR`, `es-US`, `es-CO`, **`es-ES`**, `es` (every Spanish) | `es-419` |
| `bn`, `bn-BD`, `bn-IN` | `bn` |
| `hi`, `hi-IN` | `hi` |
| `hi-Latn`, `hi-Latn-IN` ("Hindi (Latin)", offered by Android 14 and later) | `hi-Latn` |
| `en-US`, `en-GB`, `en-IN`... | `en` |
| anything else | the next language in the device's list; English if none matches |

Spain's Spanish reads in Latin American Spanish: one Spanish for every Spanish speaker, decided by
the owner on Oct 12, 2026. A language with no script in its tag is in its own script (Hindi:
Devanagari, Bengali: Bengali), so `hi-IN` is never Hinglish. Hinglish is reached from the device
only when the device itself names Hindi in Latin script; everywhere else it is only ever chosen
by hand. A device in Hindi (Latin) when Hinglish isn't offered is not given Devanagari Hindi
either: a reader of Latin script may not read Devanagari, so the walk goes on to the next language.

**Only an approved language is ever offered, matched or read.** A draft can't be chosen, can't be
reached from the device, and is refused by the server.

### Where the choice is kept

- **Before signing in**, on the device: `localStorage` on the web, the phone's key-value store on
  the phone, both under the key `language`.
- **At sign-in**, a choice made on the device carries into the account, **unless the account
  already has one**, which then wins and the device follows it. The server decides
  (`PATCH /account/language` with `unlessChosen`, `docs/API.md`), so two devices signing in at
  once can't both win.
- **Signed in**, the account's choice is the one that counts. Choosing a language saves it to the
  account first. The device keeps a copy, so the page or app opens in the right language before
  the account has answered. The phone reads that copy at once as it starts
  (`savedLanguageNow()`), so its first screen and its type (`src/theme/fonts.ts`) are already in
  the language; a change made while the app is open reaches the type at the next start.
- Server error messages and emails stay in English in v1; the account keeps the preference so they
  can follow it later.

### The Language row

On the web, Settings has a **Language** row (`#language-settings`). It lists "Follow my device",
then each approved language in its own name and script, from the manifest's `nativeName`: English,
हिन्दी, বাংলা, Español (Latinoamérica), Hinglish (Hindi in Latin script). Each option carries its
own `lang`, so a screen reader says हिन्दी in Hindi. **While English is the only approved
language, the row stays hidden.** The phone's row comes in 103; `useLanguage()`
(`apps/mobile/src/i18n/language-provider.tsx`) is what it will use.

Approving a language (`status`, `reviewer`, `approvedOn`) is all it takes for it to appear: the
web ships `locales/<tag>.json` for every approved language (`scripts/build-public-site.mjs`), and
the server accepts it. The phone also needs its file imported in `apps/mobile/src/i18n/index.ts`
(`BUNDLED`), because Metro bundles only what is imported by name.

### Screen readers

- **Web:** `<html lang>` is always the active language, Hinglish included (`hi-Latn`), so screen
  readers pronounce the page in it.
- **Phone:** each screen built on `Screen` (`apps/mobile/src/components/ui.tsx`) sets iOS's
  `accessibilityLanguage` from the active language. Android's TalkBack takes no language from a
  React Native app (`docs/HINGLISH_STYLE.md` §8.4).
- **Hinglish asks for no voice of its own** (`docs/HINGLISH_STYLE.md` §8.6): its content is
  declared `hi-Latn`, and no separate speech language is set until the owner has run the device
  check in §8.7 (open choice O7). The one place that is decided is `SPEECH_LANGUAGES` in
  `src/i18n/language-choice.js`. If Indian English turns out to read it better, that line becomes
  `'hi-Latn': 'en-IN'`: the web then puts `lang="en-IN"` on `<body>`, keeping `hi-Latn` on
  `<html>`, and the phone asks VoiceOver for `en-IN`. Nothing else changes.

## Server errors

The server answers `{ error: { code, message } }`, and `message` is English. The apps translate an
error by its `code`: `errorMessage(t, error, fallback)` looks up `error.server.<code>` and uses the
server's message only when no sentence exists for that code yet. The server doesn't change. Today
the apps still show the server's message; 102 and 103 move them onto `errorMessage`.

## Dates, numbers and money

`format.date()`, `format.dateTime()`, `format.number()` and `format.money()` (in
`src/i18n/web.js` on the web, `src/i18n` on the phone) write for the active language:

- Dates use the language with the person's own region (en-GB, en-IN, es-MX, bn-BD...).
- Numbers and money use the language's own `formatting.locale` (English: en-US, as before).
- The digits are always the language's `numberingSystem`. The helper rewrites digits itself, because
  Hermes on iOS ignores the option.

Anything a machine reads (a file name, a stored day, a sort key) never goes through the helper.

### Every Intl and toLocale use, as of 101A

| Where | What | For |
|---|---|---|
| `apps/mobile/app/history.tsx` (`when`) | History's dates | People: **moved** to `format.dateTime` |
| `src/model.js:151-152` (`money`) | Amounts, en-US | People: moves in 102/103 (the phone's History change values still use it, through `valueLabel`) |
| `src/model.js:179` (`dateLabel`) | A moment's day, en-US, UTC | People: 102/103 |
| `src/app.js:536` (`dateTimeLabel`) | Journey record and invitation times, device locale | People: 102 |
| `src/app.js:1398`, `:1401` (`toLocaleString`) | The web's history times | People: 102 |
| `apps/mobile/src/journey/sharing-view.ts:117` (`dateTimeLabel`) | Journey settings times on the phone | People: 103 |
| `apps/mobile/src/billing/store-provider.tsx:69` | Renewal date | People: 103 |
| `apps/mobile/src/invitations/invitation-words.ts:69` | Invitation expiry | People: 103 |
| `src/app.js:933` (`en-CA`) | Builds a YYYY-MM-DD day | Machines: must never change |
| `src/display-text.js:30-31` (`Intl.Segmenter`) | Counts characters as people see them | Machines: grapheme counting, not language |
| `src/app.js:950`, `:1226`, `:1389`; `sharing-view.ts:425`; `journey-view.ts:124`; `server/platform.js:1577`, `:1979`, `:1982`; `scripts/capture-outbound.mjs:1082` (`localeCompare`) | Sort ISO timestamps, days and IDs | Machines: the order must not follow the language |
| `src/model.js:235` (`toLocaleLowerCase()`) | Tells two names apart | Machines: it uses the device's locale; worth pinning |
| `server/security.js:5` (`toLocaleLowerCase('en-US')`) | Normalises an email | Machines: pinned already |

## Intl on the phone

React Native 0.86 runs Hermes V1 (250829098.0.17). Its `Intl` has `Collator`, `DateTimeFormat`,
`NumberFormat` and `getCanonicalLocales` on iOS and Android, and nothing else.
`apps/mobile/src/i18n/intl-polyfills.ts` adds only what is missing:

- **`Intl.PluralRules`** (`@formatjs/intl-pluralrules`, with the en, hi, bn and es plural data).
  Without it no plural can choose `one` or `other`.
- **`Intl.Locale`** (`@formatjs/intl-locale`), which the plural rules use to match a language.

Two gaps are handled in `format.js` instead of polyfilled:

- On iOS, `numberingSystem` is ignored for numbers and dates alike, so the helper writes the digits.
- On iOS, `NumberFormat.prototype.formatToParts` is `llvm_unreachable` (it stops the app), so
  nothing calls it. `intl-messageformat` doesn't either.

`tests/i18n-hermes.test.js` cuts Node's `Intl` down to Hermes's and runs the phone's own polyfills
and helpers for the five languages. With `HERMES` set to a Hermes binary built with Intl, it also
runs them in the real engine (`scripts/probe-hermes-intl.mjs` says how to build one). On Linux,
Hermes's `NumberFormat` is a stub, so real numbers are only shown by a phone. In a development build
the app prints `intlReport()` when it first loads its translations: what is native, what is polyfilled, and what each language
writes. Read it from a real iPhone and a real Android phone on build day.

## Scripts and fonts

Hindi is Devanagari and Bengali is Bangla; English, Spanish and Hinglish are Latin. Gelasio and Georgia
draw only Latin, so headings and moment titles in Hindi and Bengali use Tiro Devanagari Hindi and Tiro
Bangla (`docs/2026-10-12-devanagari-bangla-font-decision.md`). Interface text stays in the system sans.

- **The web** keys on `<html lang>`: the Language preference must set it to the active language's tag.
  Each face is one self-hosted file, fetched only when its script is on the page.
- **The phone** chooses its faces once, at start, from the active language (`script` in
  `apps/mobile/src/theme/fonts.ts`), and loads a Tiro face only in Hindi or Bengali.
- **Never track Devanagari or Bangla**, and give their marks room: a serif line height of at least 1.35
  (Hindi) or 1.3 (Bengali). On the phone, a serif style's `lineHeight` goes through `leading()` and any
  `letterSpacing` through `tracking()`; on the web, `src/styles.css` does both under `:lang(hi)` and
  `:lang(bn)`. `:lang(hi)` also matches Hinglish (`hi-Latn`), so those rules exclude it: Hinglish is
  Latin and keeps English's spacing.
- `tests/browser-script-fonts.spec.js` sets the screens in sample Hindi and Bengali and checks the layout
  at 320px. Rerun it with the real translations.

## Copying this into I'm Home or Green Light

Both are Expo phone apps with a Cloudflare Workers and Hono server. Copy, never share a package:
the company's apps copy structure and don't import from each other.

**Copy as is:** `src/i18n/translator.js`, `format.js`, `catalog.js`, `pseudo.js`, `language-choice.js`
(and `dom.js` for a web client), `scripts/check-hardcoded-sentences.mjs` with its own `i18n-moved-areas.json`, `apps/mobile/src/i18n/intl-polyfills.ts` and `intl-native.ts`,
`scripts/vendor-intl-messageformat.mjs` (for a web client), `scripts/export-glossary.mjs`,
`scripts/probe-hermes-intl.mjs` and `scripts/intl-probe.entry.js`, and the tests
`tests/i18n-core.test.js`, `tests/i18n-language-choice.test.js`, `tests/i18n-hermes.test.js`, `tests/i18n-pseudo.test.js` and the checks in
`tests/i18n-catalog.test.js`, with `tests/fixtures/i18n/`.

**Each app changes:**

- Where the files live: the import paths in its phone wiring (`apps/mobile/src/i18n/index.ts`), and,
  for a web client, the URL `web.js` loads from and the build that ships it. I'm Home's
  `apps/web` and Green Light's paired-room SPA load `locales/` from their own origin, the same way.
  Green Light's zero-JS QR landing is rendered by Hono on the server, so it needs the core on the
  Worker: import `translator.js` and the JSON there, never a fetch.
- Its own `locales/en.json`, `languages.json` (its languages, statuses and formatting) and
  `glossary.json` (its own careful words: I'm Home's *Sent* and *Delivered*, Green Light's *tap*,
  *match* and *presence*).
- Its polyfill locale data, if its languages differ.
- How its server's errors are shaped: `errorMessage()` expects `{ code, message }`. Map the server's
  shape onto that at the call.
- Which areas are "for machines" in its inventory. I'm Home stores UTC and renders in the viewer's
  zone: its formatter calls pass `timeZone` as they do today.
