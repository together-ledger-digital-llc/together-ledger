# Font recommendation — #177 (TL-M-02)

**Status: pending the owner's decision.** This is a ranked recommendation, not a settled choice — see
issue #177. `CLAUDE.md`'s font line will only be finalized once the owner has looked at the rendered
comparison below and confirmed it there.

## Recommendation

**Bundle Gelasio** (SIL OFL 1.1) as the heading/moment-title/brand serif across web, iOS, and Android,
replacing Georgia everywhere rather than per-platform. This is option 1 from the issue: a bundled font
file, not a webfont in the sense the old "no webfont" rule meant.

## Why

Georgia does not exist on Android and silently falls back to Roboto there today, losing the one
typographic choice the product actually makes. Of the candidates compared (Gelasio, Charter/Charis SIL,
Source Serif 4, Literata, Noto Serif, Tinos, PT Serif, Bitter, Crimson Pro — see the full research below),
Gelasio is the only one that:

- **Is documented as metric-compatible with Georgia** for Regular/Bold/Italic/Bold Italic, by both Google's
  own font description and the designer's (SorkinType) README. That means paragraphs set in Gelasio at the
  same size occupy the same width and line-box height as Georgia — no reflow, no truncation/overflow
  breakage. (Metric compatibility does not make glyph outlines identical — see "What this does not fix"
  below.)
- **Reproduces Georgia's old-style (text) figures by default.** This was verified directly by extracting
  digit glyph bounding boxes from the font: 0/1/2 sit at x-height, 6/8 rise to ascender height, and
  3/4/5/7/9 dip below the baseline — the same pattern documented for Georgia. Every other candidate tested
  ships lining figures by default (old-style only as an opt-in `onum` feature, where available at all).
  Georgia's numerals are part of its character, especially for dates and money in this product, so this
  matters more than it sounds.
- **Is the smallest or tied-smallest file of every candidate tested.** A static instance is ~107 KB;
  Regular + Bold + Italic as three static TTFs for Expo/`expo-font` comes to ~315 KB total. The web build
  (Latin-only WOFF2, regular + bold + italic) is ~75 KB total. Every non-Gelasio candidate that could carry
  the old-style option at all was 2×–15× larger, mostly because they carry Cyrillic/Greek/extended-Latin
  coverage this product doesn't need.
- **Is free to bundle.** SIL OFL 1.1, confirmed from `google/fonts`' own `OFL.txt` for Gelasio. Bundling in
  a commercial iOS/Android app is permitted; OFL only forbids selling the font file by itself and reserves
  the name "Gelasio" for the original project. No runtime attribution is required — keeping the license
  file alongside the bundled font is the standard OFL practice.

Rejected the other two options in the issue:

- **Platform serif per OS** (Georgia on iOS, `serif`/Noto Serif on Android) costs nothing, but it locks in
  a permanent, visible mismatch between platforms — different x-height, different numeral style — rather
  than fixing the actual problem, which is that the brand currently has no real answer on Android at all.
- **Change the face everywhere to something not tied to Georgia** (Source Serif 4, Literata, etc.) pays the
  full cost of a typeface swap — new metrics, full Playwright visual-snapshot regeneration, a genuinely
  different personality — without Gelasio's layout-safety property, for a face that measured no closer to
  Georgia's proportions than Gelasio did. There's no candidate in the set that's a better visual match to
  Georgia than the one purpose-built to be a match.

## What this does not fix

Metric compatibility protects layout, not pixels. Gelasio and Georgia share advance widths and line
height, but they are different outlines — SorkinType's own description: "Georgia is simpler and warmer,
Gelasio is a bit stricter and more sophisticated." Every existing Playwright visual-snapshot baseline that
includes serif text will still show a diff once Gelasio is wired up, and will need regenerating. Gelasio
removes the reflow/truncation risk a non-compatible swap would carry; it does not make the snapshot
regeneration free. TL-M-03 should budget for that pass explicitly.

## License

SIL Open Font License 1.1. Copyright 2022 The Gelasio Project Authors
(https://github.com/SorkinType/Gelasio). Verified against `ofl/gelasio/OFL.txt` and `METADATA.pb` in
`google/fonts`. Permits bundling in a commercial app; forbids selling the font file on its own and reserves
the "Gelasio" name. No runtime attribution required.

## File size

- Web (self-hosted WOFF2, Latin subset): Regular ≈ 34.8 KB, Italic ≈ 40.1 KB — **≈ 75 KB** for the weight
  range 400–700 plus italic in two files.
- Mobile (`expo-font`, static TTF instances — React Native does not reliably honor a variable font's `wght`
  axis on `<Text>` today): Regular (400) ≈ 107.6 KB, Bold (700) ≈ 107.9 KB, Italic (400) ≈ 107.9 KB —
  **≈ 315 KB** total for the three weights this product actually uses.
- A genuine variable font (`wght` 400–700) also exists as a single file per style, ≈ 165–170 KB, if a
  future platform target can use variable fonts directly.

## Rendered comparison

[`2026-09-21-tl-m-02-font-comparison.html`](./2026-09-21-tl-m-02-font-comparison.html) — Georgia against
Gelasio, set at the product's real colours, type scale, letter-spacing and line-height, covering the brand
mark, a heading, a section heading, a moment title, and a numeral sample. Gelasio is embedded directly in
the file and renders identically everywhere. Georgia is set via `font-family: Georgia, ...` and will only
render as true Georgia on a machine that actually has it installed — macOS, Windows, and iOS all ship it
natively; this sandbox does not, so the checked-in preview PNG
([`2026-09-21-tl-m-02-font-comparison-preview.png`](./2026-09-21-tl-m-02-font-comparison-preview.png))
shows a generic Linux serif substitute in the Georgia column, not real Georgia — open the HTML file on
macOS or iOS for the real comparison.

## Before this is final

This is a recommendation, not a decision. It still needs: the owner to open the rendered comparison
below on a machine with real Georgia (macOS, Windows, or iOS) and confirm by looking, not just by this
write-up's argument; and the decision, once made, recorded on issue #177 and folded back into
`CLAUDE.md`'s font line in place of the "not yet decided" note currently there.

## What TL-M-03 needs to do with this

Out of scope here, but for the record: Georgia is currently hardcoded as `font-family: Georgia, "Times New
Roman", serif` (or `Georgia, serif`) in ~15 places in `src/styles.css` plus the SVG social card — there is
no font-family custom property today. TL-M-03 should introduce one (e.g. `--font-serif: "Gelasio", Georgia,
"Times New Roman", serif` — Georgia stays in the fallback chain, harmless, and is still what an old
browser/OS without the bundled font loaded would show), self-host the WOFF2 files for web rather than
hot-linking `fonts.gstatic.com`, and regenerate the Playwright visual snapshots.

## Research

Full candidate-by-candidate research (metric compatibility, x-height/contrast, numerals, license, file
size, platform availability — each verified against primary sources: `METADATA.pb`/`OFL.txt` from
`google/fonts`, and `fontTools` run directly against the downloaded binaries) is recorded in this issue's
resolving discussion. Summary table:

| Candidate | Metric-compat. w/ Georgia | Default numerals | License | Variable font | Static weight ≈size | Stock on Android/iOS |
|---|---|---|---|---|---|---|
| **Gelasio** | **Yes** (primary) | **Old-style** | OFL 1.1 | Yes, 400–700 | ~107 KB | No / No |
| Charis SIL | No | Lining | OFL 1.1 | No | 800 KB–1.7 MB | No / No |
| Source Serif 4 | No | Lining | OFL 1.1 | Yes, wght+opsz | ~330 KB | No / No |
| Literata | No | Lining | OFL 1.1 | Yes, wght+opsz | ~271 KB | No / No |
| Noto Serif | No | Lining | OFL 1.1 | Yes, wght+wdth | ~513 KB | Android (secondary source) / No |
| Tinos | No (clones Times, not Georgia) | Lining only | OFL 1.1 | No | ~520–600 KB | No / No |
| PT Serif | No | Lining only | OFL 1.1 | No | ~340–360 KB | No / No |
| Bitter | No | Lining | OFL 1.1 | Yes, wght | ~202 KB | No / No |
| Crimson Pro | No | Lining | OFL 1.1 | Yes, wght | ~108 KB | No / No |
