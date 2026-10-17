# Website Focus Moves

## Form errors

Where focus goes after a refusal message appears.

| Form | Message appears | Focus moves to |
|------|-----------------|----------------|
| `journey-form` | none | focus not moved |
| `moment-form` | Banner | `form.elements.title.focus()` |
| `login-form` | Banner | focus not moved |
| `register-form` | Banner | focus not moved |
| `link-identity-form` | none | focus not moved |
| `recovery-request-form` | Banner | focus not moved |
| `recovery-confirm-form` | Banner | focus not moved |
| `change-password-form` | Banner | focus not moved |
| `display-name-form` | Banner | focus not moved |
| `delete-account-form` | Banner | focus not moved |
| `invite-form` | Banner | focus not moved |
| `leave-journey-form` | Banner | focus not moved |
| `expense-form` | none | focus not moved |
| `concern-form` | none | focus not moved |

## View changes

Where focus goes after the view changes.

| View change | Focus moves to |
|-------------|----------------|
| `showWelcomeSurface()` | focus not moved |
| `showLedgerSurface()` | `$('#moments-title').focus()` if `focus: true`, else focus not moved |
| Journey switch (`journeyRowShown` / radio change) | focus not moved |
| Open consequence dialog | `cancel.focus()` |
| Open moment image viewer | focus not moved |
| Open moment dialog | `form.elements.title.focus()` |
| Open expense dialog | `form.elements.merchant.focus()` |
| Open journey dialog | `form.elements.name.focus()` |
| Open concern dialog | `form.elements.title.focus()` |
| Open confirm dialog | focus not moved |
| Open event dialog | focus not moved |
| Open settings dialog | focus not moved |
| Open account dialog | focus not moved |
| Open recovery request dialog | `form.elements.email.focus()` |
| Open recovery confirm dialog | `form.elements.password.focus()` |

## Seen while reading

- Several forms display error banners without moving focus to the input field or the banner itself.
- Many dialogs do not set an initial focus when opened.
