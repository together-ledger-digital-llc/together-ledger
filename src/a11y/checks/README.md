# Accessibility checks with a baseline

This directory contains checks for page-wide accessibility using `@axe-core/playwright`.

## What it checks
We use a "baseline" approach for page-wide Axe scans. This means we run `AxeBuilder` with `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, and `wcag22aa` tags across entire pages, but we compare the findings against `baseline.json`. This ensures that any *new* accessibility violations fail our continuous integration, without failing on known issues that existed prior to this setup.

## Updating the baseline
When an accessibility problem that was recorded in the baseline is fixed, the test will pass, but it will log a message indicating that there are stale entries in the baseline.
To update the baseline:
1. Run the test and note the stale entries logged in the console.
2. Remove those stale entries from `baseline.json`.
3. Commit the changes.

## Copying this setup to another app
To use this setup in another app:
1. Copy the `src/a11y/checks` directory into the new app.
2. Ensure you have `@axe-core/playwright` installed.
3. Write test specifications similar to `tests/browser-a11y-baseline.spec.js`, calling `checkAxeBaseline` on the pages you wish to test.
4. Initially, pass an empty array `[]` as `baseline.json`, run the tests to gather current findings, and populate the baseline with those findings.
