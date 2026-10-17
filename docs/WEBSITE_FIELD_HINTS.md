# Website Field Hints

## form `moment-form`

| Field | Hint (ID and Locale Key) | `aria-describedby` points at hint | Error shown | `aria-invalid` set | Status |
|---|---|---|---|---|---|
| `kind` | `moment-kind-help` / `moment.form.kindHelp` | Yes | `showStatus()` (`#status-banner`) | Never | tied |
| `kindLabel` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `occurredOn` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `title` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `detail` | no id / `common.field.optional` | No | `showStatus()` (`#status-banner`) | Never | not tied |
| `field full moment-theme-field` | no id / `common.field.optional` | No | `showStatus()` (`#status-banner`) | Never | not tied |
| `image` | no id / `moment.form.photoIncluded`<br>`moment-image-help` / `moment.form.photoHelpAddOn`<br>`moment-image-privacy` / no locale key | Yes | `showStatus()` (`#status-banner`) | Never | tied |
| `manual-location` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `moment-visibility-field` | `moment-visibility-help` / `moment.form.visibilityLocal` | Yes | `showStatus()` (`#status-banner`) | Never | tied |
| `money` | no id / `moment.form.moneyNote` | No | `showStatus()` (`#status-banner`) | Never | not tied |
| `moneyCurrency` | no id / `moment.form.moneyNote` | No | `showStatus()` (`#status-banner`) | Never | not tied |

## form `journey-form`

| Field | Hint (ID and Locale Key) | `aria-describedby` points at hint | Error shown | `aria-invalid` set | Status |
|---|---|---|---|---|---|
| `name` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `location` | no id / `common.field.optional` | No | `showStatus()` (`#status-banner`) | Never | not tied |
| `startDateStatus` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `startDate` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `endDateStatus` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `endDate` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `memberOne` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `memberTwo` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |

## form `concern-form`

| Field | Hint (ID and Locale Key) | `aria-describedby` points at hint | Error shown | `aria-invalid` set | Status |
|---|---|---|---|---|---|
| `title` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `detail` | no id / `common.field.optional` | No | `showStatus()` (`#status-banner`) | Never | not tied |
| `status` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |

## dialog `settings-dialog`

| Field | Hint (ID and Locale Key) | `aria-describedby` points at hint | Error shown | `aria-invalid` set | Status |
|---|---|---|---|---|---|
| `settings-theme-select` | `theme-copy` / `common.theme.note` | No | `showStatus()` (`#status-banner`) | Never | not tied |
| `language-select` | `language-copy` / `common.language.note` | Yes | `showStatus()` (`#status-banner`) | Never | tied |

## form `invite-form`

| Field | Hint (ID and Locale Key) | `aria-describedby` points at hint | Error shown | `aria-invalid` set | Status |
|---|---|---|---|---|---|
| `email` | no id / `sharing.invite.emailNote` | No | `showStatus()` (`#status-banner`) | Never | not tied |
| `note` | no id / `sharing.invite.whoNote` | No | `showStatus()` (`#status-banner`) | Never | not tied |

## form `leave-journey-form`

| Field | Hint (ID and Locale Key) | `aria-describedby` points at hint | Error shown | `aria-invalid` set | Status |
|---|---|---|---|---|---|
| `confirmation` | `leave-journey-hint` / no locale key | Yes | `showStatus()` (`#status-banner`) | Never | tied |

## dialog `account-dialog`

| Field | Hint (ID and Locale Key) | `aria-describedby` points at hint | Error shown | `aria-invalid` set | Status |
|---|---|---|---|---|---|
| `billing-capacity-range` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `billing-capacity-number` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |

## form `link-identity-form`

| Field | Hint (ID and Locale Key) | `aria-describedby` points at hint | Error shown | `aria-invalid` set | Status |
|---|---|---|---|---|---|
| `password` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |

## form `login-form`

| Field | Hint (ID and Locale Key) | `aria-describedby` points at hint | Error shown | `aria-invalid` set | Status |
|---|---|---|---|---|---|
| `identifier` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `password` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |

## form `register-form`

| Field | Hint (ID and Locale Key) | `aria-describedby` points at hint | Error shown | `aria-invalid` set | Status |
|---|---|---|---|---|---|
| `username` | no id / `common.register.usernameHint` | No | `showStatus()` (`#status-banner`) | Never | not tied |
| `email` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `password` | no id / `common.register.passwordHint` | No | `showStatus()` (`#status-banner`) | Never | not tied |

## form `display-name-form`

| Field | Hint (ID and Locale Key) | `aria-describedby` points at hint | Error shown | `aria-invalid` set | Status |
|---|---|---|---|---|---|
| `displayName` | no id / no locale key | No | `showStatus()` (`#status-banner`) | Never | not tied |

## form `change-password-form`

| Field | Hint (ID and Locale Key) | `aria-describedby` points at hint | Error shown | `aria-invalid` set | Status |
|---|---|---|---|---|---|
| `currentPassword` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `newPassword` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `confirmPassword` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |

## form `delete-account-form`

| Field | Hint (ID and Locale Key) | `aria-describedby` points at hint | Error shown | `aria-invalid` set | Status |
|---|---|---|---|---|---|
| `password` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `confirmation` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |

## form `recovery-request-form`

| Field | Hint (ID and Locale Key) | `aria-describedby` points at hint | Error shown | `aria-invalid` set | Status |
|---|---|---|---|---|---|
| `email` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |

## form `recovery-confirm-form`

| Field | Hint (ID and Locale Key) | `aria-describedby` points at hint | Error shown | `aria-invalid` set | Status |
|---|---|---|---|---|---|
| `password` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `confirmPassword` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |

## No Form or Dialog (Global)

| Field | Hint (ID and Locale Key) | `aria-describedby` points at hint | Error shown | `aria-invalid` set | Status |
|---|---|---|---|---|---|
| `theme-select` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `mobile-theme-select` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `workspace-theme-select` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `import-file` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `welcome-language-select` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |
| `actor-select` | None | N/A | `showStatus()` (`#status-banner`) | Never | no hint |


**Total fields not tied:** 12
