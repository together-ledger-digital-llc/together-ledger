# Font decision — Hindi and Bengali (prompt 104)

**Status: proposed, waiting for the owner.** Nothing here merges until the owner has looked at the
rendered comparison and approved the two faces. If either looks wrong on a real screen, say so and
it changes. Until 105–107 ship translations, nothing a person sees changes: the web sets these
faces only for Devanagari and Bangla characters, and the phone loads them only in Hindi or Bengali,
a language nobody can choose yet.

## Proposal

| Script | Serif (headings, moment titles, the brand's voice) | Interface sans |
|---|---|---|
| Latin (English, Spanish, Hinglish) | Gelasio on the phone, Georgia on the web: **unchanged** | System sans: unchanged |
| Devanagari (Hindi) | **Tiro Devanagari Hindi**, Regular 400 only | System sans: no font bundled |
| Bangla (Bengali) | **Tiro Bangla**, Regular 400 only | System sans: no font bundled |

Both are SIL OFL 1.1, self-hosted on the web and bundled in the phone app, like Gelasio. Nothing is
fetched from a CDN at runtime.

## Why Tiro

Gelasio draws no Devanagari and no Bangla (measured: 0 of 128 code points in either block). Without a
font of our own, a Hindi heading on Android is drawn in the system's Noto Sans Devanagari beside
Gelasio, and on an iPhone in Kohinoor Devanagari: a sans, different on each phone, the seam #177
removed for Latin. So, as with Gelasio, one face has to be bundled everywhere for each script, and the
question is which.

**Tiro Devanagari Hindi and Tiro Bangla** are one design across both scripts, by Tiro Typeworks with
John Hudson and Fiona Ross (with Paul Hanslow on Devanagari and Neelakash Kshetrimayum on Bangla), made
for the Indigo project and published by Google Fonts in 2022. Four things decide it:

- **They sit at Gelasio's size.** Each Tiro face carries its own Latin, and its proportions are
  almost Gelasio's: x-height 0.477 em against Gelasio's 0.485, capital height 0.701 em against 0.693
  (measured with `fontTools`). That matters on the phone, where a heading is one font: a journey's
  Latin name inside a Hindi heading is drawn by Tiro's Latin, and it lands where Gelasio's would.
  Noto Serif's Latin x-height is 0.536 em, 11% larger. The Devanagari headline and the Bangla matra
  line sit at 0.62 em, between Gelasio's x-height and capital height, as they should beside it.
- **One voice in both scripts.** A Hindi reader and a Bengali reader see the same typographic
  decision, made by the same designers, not two unrelated faces.
- **One weight, 400.** Like Georgia, neither has a 500, so a rule that asks for 500 renders at 400.
  The rule #177 had to state for Gelasio holds here by construction. (Each also has an italic, which
  is not shipped: neither script has an italic tradition, and the web's `font-synthesis: none` keeps
  the browser from slanting one.)
- **A book serif, not the platform's.** Tiro is a text face with real stroke contrast, close in
  colour to Gelasio. Noto Serif Devanagari and Noto Serif Bengali are evenly weighted and are what
  stock Android already uses as its `serif` for these scripts (AOSP's `fonts.xml`, secondary source),
  so they would read as the platform rather than as the product.

The cost is size on the phone: Tiro's outlines are detailed. See "Sizes".

### Candidates

All measured from the files with `fontTools` and HarfBuzz (`uharfbuzz` 0.56). "Ink" is the tallest
and deepest point reached by shaping a set of stacked-mark and conjunct words (स्मृतियाँ, ट्रैक, ड्ढ,
हूँ, र्कि; স্মৃতি, ঊর্মি, কৃষ্ণ, শ্রী...), in em.

| Candidate | Script | Latin x / cap (Gelasio 0.485 / 0.693) | Ink top / bottom | Phone TTF (400) | Web, script only (WOFF2) | Weights | Licence |
|---|---|---|---|---|---|---|---|
| **Tiro Devanagari Hindi** | Devanagari 128/128 | **0.477 / 0.701** | 0.964 / −0.348 | 414,812 B | **63,604 B** | 400 (+ italic) | OFL 1.1 |
| Noto Serif Devanagari | Devanagari 128/128 | 0.536 / 0.714 | 0.905 / −0.300 | 234,000 B | 51,048 B | variable 100–900 | OFL 1.1 |
| Martel | Devanagari 122/128 | 0.546 / 0.758 | 1.047 / −0.385 | 167,672 B | — | 200–900 | OFL 1.1 |
| Eczar | Devanagari 126/128 | 0.468 / 0.650 | 1.016 / −0.401 | 261,912 B | — | variable 400–800 | OFL 1.1 |
| **Tiro Bangla** | Bangla 96/96 assigned | **0.477 / 0.701** | 0.921 / −0.264 | 322,200 B | **54,712 B** | 400 (+ italic) | OFL 1.1 |
| Noto Serif Bengali | Bangla 96/96 assigned | 0.536 / 0.714 | 0.920 / −0.264 | 246,744 B | 58,712 B | variable 100–900 | OFL 1.1 |

Martel misses six Devanagari code points and its Latin is the largest of the set; Eczar is a display
face with a strong personality and the deepest descent. Bangla serifs under a free licence are few:
Tiro Bangla and Noto Serif Bengali are the two text faces. The rendered specimen of all six beside
Gelasio is in the comparison page.

### Why no sans

The interface voice stays the system sans, as it is for Latin. Every platform people will use ships a
sans for both scripts: stock Android ships Noto Sans Devanagari and Noto Sans Bengali, iOS and macOS
ship Kohinoor Devanagari and Kohinoor Bangla, Windows ships Nirmala UI. **These are secondary sources,
not measured here**: no iPhone, Mac or Windows machine was available, and an OEM Android skin may
substitute its own. Bundling Noto Sans Devanagari and Noto Sans Bengali would add 362,148 B to the
phone at one weight for text the system already draws well, so the proposal is not to. If a device read turns up a
phone that draws boxes, that changes.

## Weight, tracking and line height

**Weight.** Both faces have only 400. The web's `@font-face` rules declare `font-weight: 400`, so the
sixteen `font-weight: 500` declarations in `src/styles.css` resolve to it, and `font-synthesis: none` (already on `:root`) keeps
700 from being faked. Measured in Chromium: a Hindi and a Bengali heading set at 400, 500 and 700 have
identical widths (`tests/browser-script-fonts.spec.js`). On the phone, each weight is a family name, and
only `TiroDevanagariHindi_400Regular` and `TiroBangla_400Regular` exist.

**Tracking: 0 in both scripts, everywhere.** A line of Devanagari or Bangla hangs from a headline that
joins its letters. `letter-spacing: -0.035em` (tuned to Georgia's width) jams the letters together;
the eyebrows' 0.1–0.18em and the phone's 1.9pt pull the headline apart into separate pieces, which
reads as broken text, not as small capitals. Neither script has capitals, so `text-transform:
uppercase` does nothing either. The comparison shows both at 0 and as they are today.

- Web: `:lang(hi):not(:lang(hi-Latn)) *, :lang(bn) * { letter-spacing: 0 !important; }`. `!important`
  because no rule may track these scripts, whatever it says. CSS `:lang(hi)` matches any tag beginning
  with `hi`, so Hinglish (`hi-Latn`, Latin script) is excluded here and in the line-height rule, as the
  phone's `scriptOf()` already does. A browser test holds Hinglish to English's spacing.
- Phone: every `letterSpacing` goes through `tracking()`, which returns 0 in Hindi or Bengali.

**Line height.** Marks above the headline (ि ी ँ ॅ, ঁ ি ী ৈ) and below the baseline (ु ू ृ ्, ু ূ ৃ)
need more room than Latin. Measured: Tiro Devanagari Hindi's ink spans at most 1.31 em, Tiro Bangla's
1.19 em. At the web's `line-height: 1.03` on `h1, h2`, the marks of two lines can overlap. The floor is
**1.35 for Devanagari, 1.3 for Bangla**: above each span, so no two lines' marks can touch.

- Web, in Hindi and Bengali: `h1, h2, h3`, `summary strong`, `.summary strong`, `.guided-prompt > p` and
  `.preview-body time strong` (the only rules below the floor) are set to 1.35 or 1.3. Body text is
  already 1.45–1.65.
- Phone: every serif style's `lineHeight` goes through `leading(fontSize, latin)`, which keeps the Latin
  value or raises it to the floor. Latin is unchanged. Every interface (sans) style is already at 1.33
  or more, above the 1.23 em Noto Sans Devanagari needs.

| Phone serif style | Size | Latin | Hindi | Bengali |
|---|---|---|---|---|
| Welcome headline | 40 | 44 | 54 | 52 |
| Ledger journey name | 32 | 38 | 44 | 42 |
| Screen title | 30 | 36 | 41 | 39 |
| Section title, dialog title, invite headline | 28 | 34 | 38 | 37 |
| Moment card title | 25 | 31 | 34 | 33 |
| Drop-down title | 24 | 30 | 33 | 32 |
| Guide heading, waiting card title, policy heading | 22 | 28 | 30 | 29 |
| Small section titles | 20 | 26 | 27 | 26 |
| Empty-state title | 19 | 25 | 26 | 25 |
| Moment row title | 18 | 23 | 25 | 24 |
| Policy subheading | 18 | 24 | 25 | 24 |

## Loading only when needed, and sizes

**Web.** One file per script, only the script (Google Fonts' own `devanagari` and `bengali` subsets,
the same `unicode-range` they publish), self-hosted under `src/fonts/` with the licence beside them.
Each is listed after Georgia in every serif stack, and its `unicode-range` covers no Latin, so the
browser downloads a file only when a serif element on the page holds that script. An English or
Spanish page downloads nothing new: `tests/browser-script-fonts.spec.js` watches the network to prove
it, and a Hindi page fetches only the Devanagari file.

| | Added to the web bundle | Downloaded by a visitor |
|---|---|---|
| `tiro-devanagari-hindi-devanagari.woff2` | 63,604 B | only on a page with Hindi in a serif element |
| `tiro-bangla-bengali.woff2` | 54,712 B | only on a page with Bengali in a serif element |
| `OFL-Tiro.txt` | 4,387 B | never, by the page |
| English or Spanish visitor | | **0 B** |

**Phone.** Expo bundles every font file the code imports, so both files ship in every build, as all
three Gelasio files do. Only the active language's face is read into memory at start
(`fontSources` in `apps/mobile/src/theme/fonts.ts`): Gelasio alone in English, Spanish and Hinglish;
Gelasio and Tiro Devanagari Hindi in Hindi; Gelasio and Tiro Bangla in Bengali. These are the package
files unchanged (`@expo-google-fonts/tiro-devanagari-hindi` and `tiro-bangla`, 0.4.1), imported one
file at a time like Gelasio.

| | Android build | iOS build |
|---|---|---|
| Tiro Devanagari Hindi Regular | +414,812 B installed, ≈ +190 KB to download | the same |
| Tiro Bangla Regular | +322,200 B installed, ≈ +157 KB to download | the same |
| **Together** | **+737,012 B installed (≈ 720 KB), ≈ +347 KB to download** | the same |

The download figure is the file deflated (`gzip -9`), which is how both an APK and an IPA store a font;
the store's own delivery compression may differ a little. Measured from the files, not from a build:
no build was run. Subsetting the phone files to the script plus Latin-1 saved only 11–14% (Tiro's
size is its detailed outlines, not extra scripts), not enough to justify a font pipeline of our own,
so the package files ship as they are.

## Spanish

Spanish (and Hinglish) are Latin and need no new font. Checked, character by character, for
`ñ Ñ á é í ó ú ü Á É Í Ó Ú Ü ¿ ¡ « » “ ” ‘ ’ — – … €` and all of ASCII:

| Where | Face | Result |
|---|---|---|
| Phone, headings and titles | Gelasio Regular, Italic and Bold (the three files shipped) | **Every character: measured** from each file's `cmap` (`tests/script-fonts.test.js`) |
| Phone, a Latin word inside a Hindi or Bengali heading | Tiro Devanagari Hindi, Tiro Bangla | **Every character: measured** the same way |
| Android, interface text | Roboto Regular (Google's release; a phone's system copy may differ in version) | **Every character: measured** with `fontTools` |
| iPhone, interface text | San Francisco | Covers Latin-1 and beyond: **secondary source**, not inspected |
| Web, headings | **Georgia, not Gelasio** (see below) | Covers Latin-1 (Microsoft's WGL4 set): **secondary source**, not inspected |
| Web, interface text | The system sans stack | Every system sans in the stack covers Latin-1: **secondary source** |
| Web, any Spanish text | Tiro | **Never draws a Spanish character**: measured in Chromium (`CSS.getPlatformFontsForNode`) |

**The web still sets Georgia, not Gelasio.** The prompt says Gelasio is bundled on the web; it is
bundled on the phone only. `src/styles.css` names Georgia in all eighteen serif rules and ships no
Gelasio file. #177 decided Gelasio everywhere, and its web half (TL-M-03: a `--font-serif` stack and a
self-hosted WOFF2) has not landed. That is a Latin font change and out of scope here, so this branch
puts the new faces after Georgia and leaves Latin exactly as it renders today.

## Layout at 320px

`tests/browser-script-fonts.spec.js` sets the web's welcome, home, a moment, Settings and a consequence
dialog entirely in Hindi, then in Bengali (sample text: below), at 320px and 1280px, and checks:

- the headings and moment titles are drawn by the script's Tiro face (Chromium's own record of which
  font drew the text);
- no element is tracked, and every serif heading's line height is at the script's floor or above;
- the page never scrolls sideways;
- every control that is at least 44px tall or wide in English is still at least 44px in the script.
  Nothing shrank: taller lines only grow a control.

**Latin is untouched.** In English, the welcome, home and Settings, at 320px and 1280px, Light and Dark,
render byte for byte the same screenshot with `origin/main`'s stylesheet and with this one (12 of 12
identical in Chromium), and no font file is requested.

The theme gate is unaffected: no colour, role or contrast pair changed, and it passes in all four
themes. On the phone, the same floors and tracking are set by `leading()` and `tracking()` and checked by
`tests/script-fonts.test.js`. The phone itself could not be run here (see below).

**Sample text, not translations.** The headings are plain Hindi and Bengali sentences written for this
check, and every other piece of text on a screen is filled with real words of the script, 15% longer
than the English, chosen for marks above and below the line (`tests/fixtures/script-samples.js`).
105–107 bring the real words. Rerun the same checks against them.

## Rendered comparison

[`2026-10-12-devanagari-bangla-font-comparison.html`](./2026-10-12-devanagari-bangla-font-comparison.html):
the five screens' type, in Hindi and Bengali, Light and Dark, as the device draws it today and in the
proposed faces, one self-contained file with the two web files embedded. **Open it on an Android phone
or an iPhone and the "today" column is that phone's real fallback.** That is the honest way to see it,
because the fallback is the device's.
[`2026-10-12-devanagari-bangla-font-comparison-preview.png`](./2026-10-12-devanagari-bangla-font-comparison-preview.png)
is the welcome screen, rendered here.

The full before/after matrix (web screenshots of the real app at 320px and 1280px, and phone mockups)
is published as a private page; its link is in the pull request. How each was made:

- **Web**: the real app in Chromium, set in sample text. "Before" is `origin/main`'s stylesheet with
  the new files blocked, and the device fallback is **Noto Sans Devanagari / Noto Sans Bengali**,
  installed for the render because this Linux machine has none. That is what Chrome on Android and
  ChromeOS draws. A Mac draws Kohinoor and Windows draws Nirmala UI instead.
- **Android and iPhone: mockups.** No phone or simulator was available. Each screen is set in HTML at
  the phone StyleSheets' exact sizes, line heights and tracking, with the exact TTF files the phone
  ships. Android's "before" uses Noto Sans for the missing glyphs, as a stock Android phone does.
  **The iPhone's "before" is a stand-in**: iOS draws Kohinoor, which is proprietary and could not be
  rendered, so its mockup shows Noto Sans in its place and is labelled so.

## Known limits

- **On the phone, a Hindi or Bengali heading's Latin is Tiro's.** React Native draws a `Text` in one
  font with no per-character fallback, so the welcome's "Together Ledger" title and a journey's Latin
  name inside a Hindi heading are drawn by Tiro's Latin, not Gelasio. Its proportions match Gelasio's
  (above), but the letters differ. The dialog signature stays Gelasio Bold. The comparison shows it.
- **People's own text in the other script.** A Bengali journey name on an English screen gets Tiro
  Bangla on the web (through `unicode-range`) but keeps Latin tracking and line height, since its
  element is not tagged `lang="bn"`. On the phone, it is drawn by the system sans beside Gelasio, as
  today. Tagging the isolated run with its script (`<bdi>` already wraps it) would fix both. Worth a
  follow-up once translations exist.
- **It depends on 101B.** The web's rules key on `<html lang>`, which must be set to the active
  language's tag when the Language preference lands. The phone chooses its faces once, at start, from
  the active language. A language change applies on the next start, unless 101B makes these values
  follow the language live.
- **Not seen on a device.** No phone build was made and no real iPhone, Android phone, Mac or Windows
  machine was used. Read the comparison page on real phones before approving.

## What was verified, and what was not

| Claim | Status |
|---|---|
| Gelasio draws no Devanagari or Bangla | **Measured**: `cmap` of the three shipped files |
| Each Tiro face covers its whole Unicode block, every sample word, Latin and Spanish | **Measured**: `cmap` (`tests/script-fonts.test.js`) |
| Latin x-height and capital height; headline height; ink extents of shaped words | **Measured**: `fontTools` and HarfBuzz on the files |
| Sizes (phone TTF, web WOFF2, deflated) | **Measured** from the files; not from a store build |
| Licences: both OFL 1.1, © 2020 The Indigo Project Authors, no Reserved Font Name | **Verified**: `OFL.txt` and `METADATA.pb` in `google/fonts` |
| The web file is fetched only for its script; never for English or Spanish | **Measured**: Chromium network log |
| Headings render at 400 when asked for 500 or 700; untracked; at the line-height floor; no overflow; targets kept | **Measured**: Chromium, 320px and 1280px |
| English renders exactly as before | **Measured**: identical screenshots against `origin/main`'s stylesheet |
| Android's and iOS's system sans draw both scripts; Android's `serif` is Noto Serif for both | **Secondary sources only** |
| How a real phone draws any of this | **Not verified**: mockups only |

## Licence

SIL Open Font License 1.1. Copyright 2020 The Indigo Project Authors
(https://github.com/TiroTypeworks/Indigo). Verified against `ofl/tirodevanagarihindi/OFL.txt`,
`ofl/tirobangla/OFL.txt` and their `METADATA.pb` in `google/fonts`. Neither names a Reserved Font Name,
so the script-only web subsets may keep the faces' names. Bundling in a commercial app is permitted, and
selling the font files on their own is not. No attribution is required at runtime. The licence ships beside
the web files as `src/fonts/OFL-Tiro.txt`, and inside each npm package for the phone.
