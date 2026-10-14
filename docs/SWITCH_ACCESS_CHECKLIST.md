# Switch Access Checklist

People who cannot use a touchscreen use their phone with one or two switches. This checklist verifies that the app is fully usable with Switch Control on iPhone and Switch Access on Android.

## Setup

You do not need extra hardware to test this: the screen itself can be used as the switch.
- **iPhone**: Settings → Accessibility → Switch Control (choose "Screen" as the switch).
- **Android**: Settings → Accessibility → Switch Access (choose "Screen" as the switch).
*Note: Menu names and locations can differ by phone and system version.*

## Start (index.tsx)
- [ ] Every control can be reached (Language choice, Begin, Have an invitation?, Settings)
- [ ] The order makes sense
- [ ] Each can be activated (and a switch can open and close its dialogs, consequence dialogs included)
- [ ] Nothing needs a swipe, long press or pinch

## Register (register.tsx)
- [ ] Every control can be reached (Social sign in, Username, Email, Password, Register)
- [ ] The order makes sense
- [ ] Each can be activated (and a switch can open and close its dialogs, consequence dialogs included)
- [ ] Nothing needs a swipe, long press or pinch

## Verify Email (verify-email.tsx)
- [ ] Every control can be reached (Go to account)
- [ ] The order makes sense
- [ ] Each can be activated (and a switch can open and close its dialogs, consequence dialogs included)
- [ ] Nothing needs a swipe, long press or pinch

## Recovery (recovery.tsx)
- [ ] Every control can be reached (Email, Send recovery link)
- [ ] The order makes sense
- [ ] Each can be activated (and a switch can open and close its dialogs, consequence dialogs included)
- [ ] Nothing needs a swipe, long press or pinch

## Recovery Confirm (recovery-confirm.tsx)
- [ ] Every control can be reached (New password, Confirm new password, Change password, Sign in, Request a recovery link)
- [ ] The order makes sense
- [ ] Each can be activated (and a switch can open and close its dialogs, consequence dialogs included)
- [ ] Nothing needs a swipe, long press or pinch

## Ledger (ledger.tsx)
- [ ] Every control can be reached (List, Moments, Journey Row, New journey, Hold a moment, View choices, Show recent / See all, Try again)
- [ ] The order makes sense
- [ ] Each can be activated (and a switch can open and close its dialogs, consequence dialogs included)
- [ ] Nothing needs a swipe, long press or pinch (⚠ gesture only: scrolling the Journey Row sideways may require a gesture)

## New Journey (new-journey.tsx)
- [ ] Every control can be reached (Journey name, Place or season, When it began, Exact start date, How long it lasts, Exact end date, Create journey)
- [ ] The order makes sense
- [ ] Each can be activated (and a switch can open and close its dialogs, consequence dialogs included)
- [ ] Nothing needs a swipe, long press or pinch

## Moment (moment.tsx)
- [ ] Every control can be reached (Kind, Name this kind of moment, When, Name, Detail, Theme options, Place, Add place, Remove place, Visibility options, Amount, Currency, Hold / Save, Cancel, Delete)
- [ ] The order makes sense
- [ ] Each can be activated (and a switch can open and close its dialogs, consequence dialogs included)
- [ ] Nothing needs a swipe, long press or pinch

## History (history.tsx)
- [ ] Every control can be reached (How to read your history, Start conversation, Edit concern, Delete concern, Event row expand toggle)
- [ ] The order makes sense
- [ ] Each can be activated (and a switch can open and close its dialogs, consequence dialogs included)
- [ ] Nothing needs a swipe, long press or pinch

## History Guide (history-guide.tsx)
- [ ] Every control can be reached (No interactive controls, just reading)
- [ ] The order makes sense
- [ ] Each can be activated (and a switch can open and close its dialogs, consequence dialogs included)
- [ ] Nothing needs a swipe, long press or pinch

## Concern (concern.tsx)
- [ ] Every control can be reached (What would you like to return to?, A little context, Status, Save conversation changes / Keep this open)
- [ ] The order makes sense
- [ ] Each can be activated (and a switch can open and close its dialogs, consequence dialogs included)
- [ ] Nothing needs a swipe, long press or pinch

## Invite (invite.tsx)
- [ ] Every control can be reached (Paste link/code, Open, Sign in, Create account, Not now, Try again, Join, Resend verification email, I verified it in my browser, Go to account, Open journey)
- [ ] The order makes sense
- [ ] Each can be activated (and a switch can open and close its dialogs, consequence dialogs included)
- [ ] Nothing needs a swipe, long press or pinch

## Journey Settings (journey-settings.tsx)
- [ ] Every control can be reached (Propose email, Propose note, Propose this person, Member options [Make owner, Remove], Withdraw invitation, Agree to add them, Decline, Withdraw proposal, Send it again, Rest earlier, Rest later, History and conversations, Leave journey, Type LEAVE, Confirm leave, Cancel leave, Fold toggles)
- [ ] The order makes sense
- [ ] Each can be activated (and a switch can open and close its dialogs, consequence dialogs included)
- [ ] Nothing needs a swipe, long press or pinch

## Settings (settings.tsx)
- [ ] Every control can be reached (Theme choices, Language choices, Journey sharing, Journey history, Account, Restore purchases, Delete account, Sign in, Privacy, Terms, Help)
- [ ] The order makes sense
- [ ] Each can be activated (and a switch can open and close its dialogs, consequence dialogs included)
- [ ] Nothing needs a swipe, long press or pinch

## Account (account.tsx)
- [ ] Every control can be reached (Name, Save, Resend verification, Verified in browser, Sign out, Sign out everywhere, Change password, Social sign in, Identifier, Password, Sign in, Forgot password, Create account, Have an invitation?)
- [ ] The order makes sense
- [ ] Each can be activated (and a switch can open and close its dialogs, consequence dialogs included)
- [ ] Nothing needs a swipe, long press or pinch

## Change Password (change-password.tsx)
- [ ] Every control can be reached (Current password, New password, Confirm new password, Change password)
- [ ] The order makes sense
- [ ] Each can be activated (and a switch can open and close its dialogs, consequence dialogs included)
- [ ] Nothing needs a swipe, long press or pinch

## Delete Account (delete-account.tsx)
- [ ] Every control can be reached (Current password, Type DELETE, Permanently delete account, Sign in)
- [ ] The order makes sense
- [ ] Each can be activated (and a switch can open and close its dialogs, consequence dialogs included)
- [ ] Nothing needs a swipe, long press or pinch

## Privacy (privacy.tsx)
- [ ] Every control can be reached (Reading only)
- [ ] The order makes sense
- [ ] Each can be activated (and a switch can open and close its dialogs, consequence dialogs included)
- [ ] Nothing needs a swipe, long press or pinch

## Terms (terms.tsx)
- [ ] Every control can be reached (Reading only)
- [ ] The order makes sense
- [ ] Each can be activated (and a switch can open and close its dialogs, consequence dialogs included)
- [ ] Nothing needs a swipe, long press or pinch

## What to write down

If any check fails, write down:
- Screen
- What failed
- Phone model
- System version
