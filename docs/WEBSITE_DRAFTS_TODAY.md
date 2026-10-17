# Website Drafts Today

When writing a moment or creating a journey, here is what happens to typed text.

## Moment Form (`#moment-form`)

The moment form holds the following fields:
*   `id` (hidden)
*   `kind`
*   `kindLabel`
*   `occurredOn`
*   `title`
*   `detail`
*   `theme`
*   `image`
*   `manual-location` (id `#manual-location`)
*   `visibility`
*   `money`
*   `moneyCurrency`

**What happens to typed text:**
*   **On a reload:** Nothing is kept. The browser loses the draft because it is not saved to any storage.
*   **On closing the dialog:** Nothing is kept for the next opening. The fields are reset using `form.reset()` each time the dialog is opened (in `openMoment()`). The `momentLocations` array and prepared photo are also cleared.
*   **On signing out:** Nothing is kept. The dialog is closed, and any unsaved text is abandoned.

## Journey Form (`#journey-form`)

The journey form holds the following fields:
*   `id` (hidden)
*   `name`
*   `location`
*   `startDateStatus`
*   `startDate`
*   `endDateStatus`
*   `endDate`
*   `budget` (hidden)
*   `memberOne`
*   `memberTwo`

**What happens to typed text:**
*   **On a reload:** Nothing is kept. The draft is lost.
*   **On closing the dialog:** Nothing is kept for the next opening. The fields are reset using `form.reset()` each time the dialog is opened (in `openJourney()`).
*   **On signing out:** Nothing is kept. The dialog is closed, and any unsaved text is abandoned.

## Storage Keys Written by `src/app.js`

`src/app.js` writes the following `localStorage` keys directly:

1.  `theme`
    *   **What it holds:** The chosen theme identifier (e.g., `'light'`, `'dark'`, `'green'`, `'flexoki'`).
    *   **When it is cleared:** It is never cleared. It is overwritten when a new theme is selected.
    *   **Holds a person's own words:** No.

2.  `together-ledger-guidance-ended-on`
    *   **What it holds:** The local date string (e.g., `'2023-10-27'`) for the day guidance was finished or ended.
    *   **When it is cleared:** It is never cleared. It is overwritten the next time guidance is dismissed for a new day.
    *   **Holds a person's own words:** No.

`src/app.js` does not write any `sessionStorage` keys.

**Say plainly where nothing is kept:**
No drafts of typed text in the `#moment-form` or `#journey-form` are kept in `localStorage` or `sessionStorage` while typing, on reload, on closing the dialog, or on signing out.

## Waiting (Offline) Moments

Waiting (offline) moments are kept by calling `saveState(state)`, which writes the state to `localStorage` via `src/store.js` (currently using the `together-ledger-v3` key). They are saved as part of the overall ledger state when a form is successfully submitted, not as drafts while typing.
