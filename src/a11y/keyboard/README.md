# Keyboard Walk Helper

This is a Playwright test helper that presses the `Tab` key to walk through focusable elements on the page.

`keyboardWalk(page, { maxSteps = 80 })` what it does:
- Starts from the top by blurring any active element.
- Simulates pressing the `Tab` key up to `maxSteps` times.
- Records each focused element until it loops back, hits the body/document element, or runs out of steps.

What it returns:
- An array of objects representing the visited elements. Each object contains `tag`, `name` (aria-label or text content), `visible`, and `ring` (whether outline or box-shadow are applied).

## How to copy it into another app

Since this helper has no dependencies besides Playwright, you can simply copy `keyboard-walk.js` into your test fixtures or utils directory:

```bash
cp keyboard-walk.js path/to/your/app/tests/fixtures/
```

## Usage example

```javascript
import { test, expect } from '@playwright/test';
import { keyboardWalk } from './keyboard-walk.js';

test('can tab through the main nav', async ({ page }) => {
  await page.goto('/home');
  const visited = await keyboardWalk(page);

  expect(visited).toContainEqual(expect.objectContaining({
    name: 'Home',
    tag: 'a'
  }));
});
```