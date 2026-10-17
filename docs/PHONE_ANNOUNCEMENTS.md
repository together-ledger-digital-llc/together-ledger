# Phone Announcements

A list of every accessibility announcement (live regions and explicit announcements) the phone app makes today.

## Current Announcements

| File and Component | Platform | Polite/Assertive | What it says | When |
| --- | --- | --- | --- | --- |
| `apps/mobile/src/components/toast.tsx` (`Toast`) | Android | Polite (`accessibilityLiveRegion`) | The toast `message`. | When a passing confirmation (toast) appears. |
| `apps/mobile/src/components/grace-banner.tsx` (`GraceBanner`) | Android | Polite (`accessibilityLiveRegion`) | The grace banner copy and note. | When a journey is waiting on payment (grace period). |
| `apps/mobile/src/components/waiting-moments.tsx` (`WaitingCard`) | Android | Polite (`accessibilityLiveRegion`) | `entry.refusal.message` | When a held moment fails to send (refusal). |
| `apps/mobile/src/components/status-region.tsx` (`StatusRegion`) | Android | Polite (`accessibilityLiveRegion`) | The status `message`. | When a status message (like an error) is shown. |
| `apps/mobile/src/components/ui.tsx` (`Field`) | Android | Polite (`accessibilityLiveRegion`) | The field `problem` message. | When a text input field has a validation error. |
| `apps/mobile/src/components/ui.tsx` (`Notice`) | Android | Polite (`accessibilityLiveRegion`) | The notice `message`. | When a persistent notice is shown on screen. |
| `apps/mobile/src/shell/shell-provider.tsx` (`showStatus`) | iOS | Assertive/System default (`announceForAccessibility`) | The status `message`. | When a status is shown (iOS explicit fallback). |
| `apps/mobile/src/shell/shell-provider.tsx` (`showToast`) | iOS | Assertive/System default (`announceForAccessibility`) | The toast `message`. | When a toast is shown (iOS explicit fallback). |
| `apps/mobile/app/journey-settings.tsx` (`Billing`) | Android | Polite (`accessibilityLiveRegion`) | The billing `summary.message`. | When billing status is shown in Journey Settings. |
| `apps/mobile/app/ledger.tsx` (`LedgerScreen`) | Android | Polite (`accessibilityLiveRegion`) | `nextJourneyWords(nextName, next.when)` | When switching to another journey or waiting for it to open. |

## Seen while reading

- `accessibilityLiveRegion` is not supported by iOS. Because of this, several dynamic updates are only announced on Android (e.g., `Field` validation problems, `Notice`, `GraceBanner`, `Billing` summary, `WaitingCard` refusals, and `nextJourneyWords` in the ledger).
- For `showStatus` and `showToast`, there is an explicit fallback `AccessibilityInfo.announceForAccessibility(message)` on iOS to make up for the lack of `accessibilityLiveRegion` support on their respective components.
- `announceForAccessibility` on iOS does not offer polite or assertive options in React Native, meaning VoiceOver decides how to queue or interrupt the announcement.
- Long-lived components like `GraceBanner` or `Billing` using `accessibilityLiveRegion` could potentially cause repeating announcements on Android when they re-render.
