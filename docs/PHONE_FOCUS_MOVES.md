# Phone Focus Moves

This document tracks where focus moves explicitly in the phone app to ensure a sensible experience for VoiceOver and TalkBack users, especially after screens open, forms are refused, or dialogs close.

## Screen Focus Behaviors

### `apps/mobile/src/components/drop-down.tsx`

| What moves focus | When |
| --- | --- |
| `AccessibilityInfo.sendAccessibilityEvent(..., 'focus')` (focus moves to `chosenOption.current`) | On `onShow` of the `Modal` when the dropdown opens. |
| `accessibilityViewIsModal` | Applied to the card inside the DropDown `Modal`. |
| `importantForAccessibility="no-hide-descendants"` | To hide the backdrop behind the dropdown options modal. |
| `importantForAccessibility="no"` | On decorative chevron. |

### `apps/mobile/src/components/dialogs.tsx`

| What moves focus | When |
| --- | --- |
| `AccessibilityInfo.sendAccessibilityEvent(..., 'focus')` (focus moves to `keep.current`) | On `onShow` of the `Modal` when the shell dialog opens. |
| `accessibilityViewIsModal` | Applied to the card inside the ShellDialog `Modal`. |
| `importantForAccessibility="no-hide-descendants"` | To hide the backdrop behind the dialog modal. |
| `importantForAccessibility="no"` | On the "Together Ledger" signature. |

### `apps/mobile/src/components/language-choice.tsx`

| What moves focus | When |
| --- | --- |
| `AccessibilityInfo.sendAccessibilityEvent(..., 'focus')` (focus moves to `chosenRow.current`) | On `onShow` of the `Modal` when the language list opens. |
| `accessibilityViewIsModal` | Applied to the card inside the LanguageList `Modal`. |
| `importantForAccessibility="no-hide-descendants"` | To hide the backdrop behind the language choice modal. |
| `importantForAccessibility="no"` | On the chevron and radio marks (`chosen ? '●' : '○'`). |

### `apps/mobile/app/moment.tsx`

| What moves focus | When |
| --- | --- |
| `titleInput.current?.focus()` | When saving a moment is refused because the title is missing. |
| `importantForAccessibility="no-hide-descendants"` | To hide swatch elements. |

### `apps/mobile/src/components/photo-viewer.tsx`

| What moves focus | When |
| --- | --- |
| `accessibilityViewIsModal` | Applied to the `SafeAreaView` wrapping the full-screen photo viewer. |

### `apps/mobile/src/components/journey-row.tsx`

| What moves focus | When |
| --- | --- |
| `importantForAccessibility="no-hide-descendants"` | To hide decorative or structural views that shouldn't be read. |

### `apps/mobile/app/journey-settings.tsx`

| What moves focus | When |
| --- | --- |
| `importantForAccessibility="no"` | On decorative glyphs and fold toggle `−` / `＋`. |

### `apps/mobile/app/history.tsx`

| What moves focus | When |
| --- | --- |
| `importantForAccessibility="no"` | On toggle `−` / `＋`. |

### `apps/mobile/app/ledger.tsx`

| What moves focus | When |
| --- | --- |
| `importantForAccessibility="no"` | On `MOMENT_VIEW_LABEL`. |

### `apps/mobile/app/_layout.tsx`

| What moves focus | When |
| --- | --- |
| `importantForAccessibility="no"` | On `SETTINGS_GLYPH` and back arrow `←`. |

### `apps/mobile/src/components/moment-card.tsx`

| What moves focus | When |
| --- | --- |
| `importantForAccessibility="no"` | On decorative `⌖` glyph. |

### `apps/mobile/src/components/google-button.tsx`

| What moves focus | When |
| --- | --- |
| `importantForAccessibility="no"` | On the Google `G` logo image. |

### `apps/mobile/src/components/grace-banner.tsx`

| What moves focus | When |
| --- | --- |
| `importantForAccessibility="no"` | On the caution glyph `▲`. |

### `apps/mobile/src/components/settings-rows.tsx`

| What moves focus | When |
| --- | --- |
| `importantForAccessibility="no"` | On the chevron `›`. |

### `apps/mobile/src/components/status-region.tsx`

| What moves focus | When |
| --- | --- |
| `importantForAccessibility="no"` | On the status tone glyph. |

### `apps/mobile/src/components/theme-picker.tsx`

| What moves focus | When |
| --- | --- |
| `importantForAccessibility="no"` | On the radio mark `●` / `○`. |

### `apps/mobile/src/components/ui.tsx`

| What moves focus | When |
| --- | --- |
| `importantForAccessibility="no"` | On the problem glyph and button glyphs. |

### Global Unused Focus APIs

* `AccessibilityInfo.setAccessibilityFocus` is not used.
* `findNodeHandle` is not used.
* `autoFocus` is not used.

## Screens and Forms Where Nothing Moves Focus After a Refusal or Change

* `apps/mobile/app/new-journey.tsx`: After `showStatus` is called with a validation error or account message error on refusal to begin a new journey.
* `apps/mobile/app/delete-account.tsx`: After `showStatus` is called with an account message error on refusal to delete an account.
* `apps/mobile/app/journey-settings.tsx`: After `showStatus` is called when saving settings fails or leaving a journey fails.
* `apps/mobile/app/concern.tsx`: After `showStatus` is called when sending a concern fails.
* `apps/mobile/app/history.tsx`: After `showStatus` is called when a history request fails.
* `apps/mobile/app/moment.tsx`: After `showStatus` is called for any problem other than a missing title.
* `apps/mobile/src/billing/store-provider.tsx`: After `showStatus` is called for a store error, unavailable store, or refused purchase.
* `apps/mobile/src/components/grace-banner.tsx`: After `showStatus` is called for an error confirming grace period.
* `apps/mobile/src/components/language-choice.tsx`: After `showStatus` is called for an error when changing language.
