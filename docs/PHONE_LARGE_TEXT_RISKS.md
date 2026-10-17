# Phone large text risks

The following layout risks could cause text to clip at the largest text size because they use fixed constraints that prevent text from wrapping or growing:

| File | Line | What could clip | Likelihood |
| ---- | ---- | --------------- | ---------- |
| `apps/mobile/src/components/moment-row.tsx` | 33 | `numberOfLines={1}` on moment list title | High |
| `apps/mobile/src/components/moment-row.tsx` | 34 | `numberOfLines={1}` on moment list meta (date/kind) | High |
| `apps/mobile/src/components/moment-row.tsx` | 51 | `row` style has `flexDirection: 'row'` without `flexWrap` | Medium |
| `apps/mobile/app/moment.tsx` | 276 | `option` style has `flexDirection: 'row'` without `flexWrap` (moment view visibility option) | High |
| `apps/mobile/app/moment.tsx` | 280 | `visibility` style has `flexDirection: 'row'` without `flexWrap` (moment view visibility) | High |
| `apps/mobile/app/moment.tsx` | 283 | `place` style has `flexDirection: 'row'` without `flexWrap` (moment view place) | High |
| `apps/mobile/app/moment.tsx` | 278 | `swatch` style has fixed `height` of 26 (moment view theme swatch) | Low |
| `apps/mobile/app/moment.tsx` | 279 | `swatchInner` style has fixed `height` and `width` of 14 (moment view theme swatch) | Low |
| `apps/mobile/src/components/ui.tsx` | 114 | password field (now with a Show password button beside them) without `flexWrap` on horizontal constraint | High |
| `apps/mobile/src/components/moment-card.tsx` | 139 | `numberOfLines={1}` on photo name | High |
| `apps/mobile/src/components/moment-card.tsx` | 187 | `photo` style has `flexDirection: 'row'` without `flexWrap` | High |
| `apps/mobile/src/components/moment-card.tsx` | 188 | `thumb` style has fixed `width`, `height` (64) and `overflow: 'hidden'` | Medium |
| `apps/mobile/src/components/moment-card.tsx` | 189 | `thumbImage` style has fixed `width` and `height` (64) | Medium |
| `apps/mobile/src/components/ui.tsx` | 156 | `problem` style has `flexDirection: 'row'` without `flexWrap` (field problem text) | High |
| `apps/mobile/src/components/ui.tsx` | 162 | `button` style has `flexDirection: 'row'` without `flexWrap` | High |
| `apps/mobile/app/_layout.tsx` | 58 | `numberOfLines={1}` on header button text | High |
| `apps/mobile/app/_layout.tsx` | 198 | `headerButton` style has `flexDirection: 'row'` without `flexWrap` | High |
| `apps/mobile/app/_layout.tsx` | 199 | `backButton` style has `flexDirection: 'row'` without `flexWrap` | High |
| `apps/mobile/app/journey-settings.tsx` | 486 | `foldHead` style has `flexDirection: 'row'` without `flexWrap` | Medium |
| `apps/mobile/app/history.tsx` | 128 | `eventHead` style has `flexDirection: 'row'` without `flexWrap` | Medium |
| `apps/mobile/src/components/drop-down.tsx` | 91 | `control` style has `flexDirection: 'row'` without `flexWrap` | High |
| `apps/mobile/src/components/language-choice.tsx` | 140 | `button` style has `flexDirection: 'row'` without `flexWrap` | High |
| `apps/mobile/src/components/language-choice.tsx` | 148 | `option` style has `flexDirection: 'row'` without `flexWrap` | High |
| `apps/mobile/src/components/apple-button.tsx` | 37 | `button` style has `flexDirection: 'row'` without `flexWrap` | High |
| `apps/mobile/src/components/policy-document.tsx` | 52 | `item` style has `flexDirection: 'row'` without `flexWrap` | High |
| `apps/mobile/src/components/journey-row.tsx` | 86 | `numberOfLines={1}` on journey choice text | High |
| `apps/mobile/src/components/journey-row.tsx` | 116 | `left` style has `flexDirection: 'row'` without `flexWrap` | Low |
| `apps/mobile/src/components/google-button.tsx` | 34 | `button` style has `flexDirection: 'row'` without `flexWrap` | High |
| `apps/mobile/src/components/google-button.tsx` | 35 | `logo` style has fixed `width` and `height` (20) | Low |
| `apps/mobile/src/components/grace-banner.tsx` | 57 | `head` style has `flexDirection: 'row'` without `flexWrap` | Medium |
| `apps/mobile/src/components/settings-rows.tsx` | 86 | `rows` style has `overflow: 'hidden'` | Low |
| `apps/mobile/src/components/settings-rows.tsx` | 88 | `row` style has `flexDirection: 'row'` without `flexWrap` | High |
| `apps/mobile/src/components/status-region.tsx` | 45 | `banner` style has `flexDirection: 'row'` without `flexWrap` | High |
| `apps/mobile/src/components/theme-picker.tsx` | 48 | `option` style has `flexDirection: 'row'` without `flexWrap` | High |
| `apps/mobile/app/ledger.tsx` | 212 | `gap` style has fixed `height` (14) | Low |
| `apps/mobile/app/ledger.tsx` | 213 | `rowGap` style has fixed `height` (8) | Low |
| `apps/mobile/app/ledger.tsx` | 224 | `openChip` style has `overflow: 'hidden'` | Low |
| `apps/mobile/app/ledger.tsx` | 228 | `type` style has `overflow: 'hidden'` | Low |
| `apps/mobile/src/components/social-sign-in.tsx` | 21 | `PROVIDER_BUTTON` style has fixed `height` (48) and `maxWidth` | Medium |
| `apps/mobile/src/components/social-sign-in.tsx` | 221 | `hint` style has fixed `maxWidth` | Medium |
| `apps/mobile/src/components/photo-viewer.tsx` | 73 | `flexDirection: 'row'` without `flexWrap` | Low |
| `apps/mobile/src/components/photo-viewer.tsx` | 97 | Fixed `width` and `height` (44) | Low |
| `apps/mobile/src/components/photo-viewer.tsx` | 113 | Fixed `width` and `height` ('100%') | Low |
| `apps/mobile/app/_layout.tsx` | 1 | Screen lacks `ScrollView` wrapper | Medium |
| `apps/mobile/src/components/journey-not-open.tsx` | 1 | Screen lacks `ScrollView` wrapper | Medium |
| `apps/mobile/src/components/status-region.tsx` | 1 | Screen lacks `ScrollView` wrapper | Medium |
