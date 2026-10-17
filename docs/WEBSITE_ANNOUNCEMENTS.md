# Website Announcements

This document catalogs every live region in `index.html` (elements with `role="status"`, `role="alert"`, or `aria-live` attributes) and how they are updated by the application.

## Live Regions

| Element ID | Politeness | Updated By (Function) | What it writes (Words or Locale Key) |
| :--- | :--- | :--- | :--- |
| `#status-banner` | `polite` (and `role="status"`) | `showStatus` | Various, e.g. `t('status.banner.storageFull')`, `t('status.banner.offline')`, `error.message`, `accountMessage(error)` |
| `#grace-banner` | `polite` (and `role="status"`) | `renderGraceBanner` | Words returned by `graceBannerCopy` and `graceRequestNote` |
| `#moment-theme-preview` | `polite` | `renderMomentThemePreview` | Locale keys via `momentThemeName` (e.g. `t('common.moment.themeDefault')`) |
| `#moment-image-privacy` | `polite` | `openMomentDialog`, `momentImageAttached` | Words `t('moment.form.photoMetadataRemoved')` |
| `#moment-locations` | `polite` | `renderMomentLocations` | Words `t('moment.form.placeIncluded')`, `t('moment.form.placePrice')`, `t('common.moment.removePlace')`, `t('common.action.remove')` and location labels |
| `#moment-image-viewer-error` | `polite` (via `role="status"`) | `renderMomentImageViewer` | `loadError.message` |
| `#billing-status` | `polite` | `updateCapacityStatus` | Words `"This journey is waiting for payment confirmation."` or `"This journey does not currently have paid additional-person capacity."` |
| `#billing-capacity-total` | `polite` | `updateCapacityTotal` | Words `${money(…)} / month` or empty string |
| `#toast` | `polite` (and `role="status"`) | `showToast` | Various, e.g. `t('signIn.toast.refreshed')`, `t('signIn.toast.invitedEmail')` |

## Seen while reading

- `#status-banner` and `#toast`: Both are used for various statuses and errors. If triggered in quick succession (e.g., a connection error immediately followed by a sync error), they might interrupt each other or repeat unnecessarily.
- `#moment-locations`: Re-renders the entire list (`list.innerHTML = ...`) every time a location is added or removed. This could cause the screen reader to re-announce the entire list instead of just the change, leading to repetitive or overly verbose announcements.
- `#moment-image-privacy`: When opening a moment, it writes `''` to clear it. Screen readers might not announce anything when it's cleared, but a user might expect to be told the metadata notice is gone.
- `#billing-capacity-total`: Updated as a range slider moves. Because it's `aria-live="polite"`, changing the slider quickly could queue up many announcements (e.g., "$1.00", "$2.00", "$3.00"), delaying the final relevant announcement.
