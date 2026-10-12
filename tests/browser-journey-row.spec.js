import { test, expect } from './browser-test.js';
import AxeBuilder from '@axe-core/playwright';

// #404: the journeys under "Your shared space" wrapped onto several lines, and with many journeys
// they would have been a wall of buttons above the moments. They are one row that scrolls sideways,
// the open journey chosen and in view, with "＋ New journey" on its own full-width line below it.
// One journey keeps no row at all.

const owner = { id: 'row-owner', username: 'row-owner', displayName: 'Avery', email: 'avery@example.test', emailVerified: true };
// Nearly as long as a journey's name may be (80 characters).
const LONG = 'The long summer we spent learning to cook together in a far too small kitchen';
const NAMES = ['Home', 'Lisbon in spring', LONG, 'Moving house', 'Our garden', 'Weekends with Ma', 'The new flat', 'Learning Portuguese', 'Winter in the hills', 'Our first year', 'Ma’s birthday'];
const WIDTHS = [320, 390, 1280];
const THEMES = ['light', 'dark', 'green', 'flexoki'];

function journeyRecord(name, index) {
  const id = `journey-row-${index + 1}`;
  return {
    id, name, location: '', startDate: '', startDateStatus: 'unknown', endDate: '', endDateStatus: 'forever',
    budgetCents: 0, version: 1, role: 'owner', createdAt: '2026-10-01T12:00:00.000Z', updatedAt: '2026-10-01T12:00:00.000Z',
  };
}

async function signedInWith(page, names, width) {
  const journeys = names.map(journeyRecord);
  await page.setViewportSize({ width, height: 900 });
  await page.route('https://api.together-ledger.com/api/v1/session', (route) => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ data: { user: owner, csrfToken: 'row-csrf' } }),
  }));
  await page.route('https://api.together-ledger.com/api/v1/journeys', (route) => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ data: { journeys: journeys.map(({ id }) => ({ id })) } }),
  }));
  for (const journey of journeys) {
    await page.route(`https://api.together-ledger.com/api/v1/journeys/${journey.id}/snapshot`, (route) => route.fulfill({
      contentType: 'application/json', body: JSON.stringify({ data: {
        journey, members: [{ id: owner.id, displayName: owner.displayName, role: 'owner', joinedAt: journey.createdAt }], invitations: [], expenses: [],
        moments: [{
          id: `${journey.id}-moment`, journeyId: journey.id, title: 'A first moment', detail: '', occurredOn: '2026-10-01', theme: '', kind: 'memory', kindLabel: '',
          visibility: 'shared-now', moneyCents: null, moneyCurrency: '', locations: [], createdByUserId: owner.id, createdBy: owner.displayName,
          updatedBy: owner.displayName, shapedByBoth: false, version: 1, createdAt: journey.createdAt, updatedAt: journey.createdAt,
        }],
        images: [], concerns: [], milestones: [], events: [], eventChainValid: true,
      } }),
    }));
    await page.route(`https://api.together-ledger.com/api/v1/journeys/${journey.id}/billing`, (route) => route.fulfill({
      status: 404, contentType: 'application/json', body: JSON.stringify({ error: { code: 'billing_unavailable', message: 'Billing is not available for this fixture.' } }),
    }));
  }
  await page.goto('/');
  await expect(page.locator('#trip-name')).toHaveText(names[0]);
}

// Everything about the row, measured in one pass in the page, in the viewport's pixels.
function rowLayout() {
  const row = document.querySelector('#journey-row');
  const box = (element) => { const rect = element.getBoundingClientRect(); return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }; };
  const rowBox = box(row);
  const choices = [...row.querySelectorAll('.journey-choice')].map((choice) => {
    const name = choice.querySelector('.journey-choice-name');
    return { ...box(choice), checked: choice.querySelector('input').checked, truncated: name.scrollWidth > name.clientWidth };
  });
  return {
    row: rowBox,
    rowVisible: { left: rowBox.left, right: rowBox.left + row.clientWidth },
    scrollWidth: row.scrollWidth,
    clientWidth: row.clientWidth,
    moreAfter: row.hasAttribute('data-more-after'),
    choices,
    newJourney: box(document.querySelector('#new-journey-button')),
    switchBox: box(document.querySelector('.journey-switch')),
    page: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
    viewport: window.innerWidth,
  };
}

for (const width of WIDTHS) {
  test(`at ${width}px the journeys are one row that scrolls sideways, with New journey full width below it`, async ({ page }) => {
    await signedInWith(page, NAMES, width);
    await expect(page.getByRole('radiogroup', { name: 'Switch journey' })).toBeVisible();
    const layout = await page.evaluate(rowLayout);

    // One line, however many journeys there are.
    const tops = new Set(layout.choices.map((choice) => Math.round(choice.top)));
    expect(tops.size, 'every journey sits on the same line').toBe(1);
    for (const choice of layout.choices) expect(choice.height, 'each journey is at least a 44px target').toBeGreaterThanOrEqual(44);

    // It scrolls, and looks it: some journey is cut by the visible edge rather than ending neatly.
    expect(layout.scrollWidth, 'the row holds more than fits').toBeGreaterThan(layout.clientWidth);
    expect(layout.moreAfter, 'the trailing end is marked as going on').toBe(true);
    const cut = layout.choices.filter((choice) => choice.left < layout.rowVisible.right - 1 && choice.right > layout.rowVisible.right + 1);
    expect(cut.length, 'the last journey in sight is cut by the edge').toBe(1);
    expect(layout.rowVisible.right, 'the row runs on to the edge of the screen').toBeCloseTo(layout.viewport, 0);

    // The page itself never scrolls sideways, even with a very long name.
    expect(layout.page.scrollWidth, 'no sideways page scroll').toBeLessThanOrEqual(layout.page.clientWidth);
    const long = layout.choices[NAMES.indexOf(LONG)];
    expect(long.truncated, 'a long name is cut short on screen').toBe(true);
    expect(long.width).toBeLessThanOrEqual(Math.min(260, width * 0.75) + 1);

    // New journey: directly below the row, the full width of the bar's content, on its own line.
    expect(layout.newJourney.top, 'New journey is below the row').toBeGreaterThanOrEqual(layout.row.bottom);
    expect(layout.newJourney.top - layout.row.bottom, 'and directly below it').toBeLessThan(16);
    expect(layout.newJourney.width).toBeCloseTo(layout.switchBox.width, 0);
    expect(layout.newJourney.height).toBeGreaterThanOrEqual(44);
  });
}

test('each journey is a radio with its whole name, the open one announced as chosen', async ({ page }) => {
  await signedInWith(page, NAMES, 390);
  const group = page.getByRole('radiogroup', { name: 'Switch journey' });
  await expect(group.getByRole('radio')).toHaveCount(NAMES.length);
  for (const name of NAMES) await expect(group.getByRole('radio', { name, exact: true })).toHaveCount(1);
  await expect(group.getByRole('radio', { name: 'Home', exact: true })).toBeChecked();
  await expect(group.getByRole('radio', { checked: true })).toHaveCount(1);
  // The dot that marks the chosen one is drawn, not read: the name is the journey's alone.
  await expect(page.locator('.journey-choice-mark').first()).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.journey-choice').nth(NAMES.indexOf(LONG))).toHaveAttribute('title', LONG);

  // The row and New journey, in every theme. The "Switch journey" label above them is left out: it
  // keeps the colour every small label in this bar has always had, unchanged here.
  for (const theme of THEMES) {
    await page.locator('#workspace-theme-select').selectOption(theme);
    const results = await new AxeBuilder({ page }).include('#journey-row').include('#new-journey-button').analyze();
    expect(results.violations.map(({ id, nodes }) => `${theme}: ${id} (${nodes.length})`)).toEqual([]);
  }
});

test('the row works from the keyboard: Tab reaches the chosen journey, the arrows move along and open each', async ({ page }) => {
  await signedInWith(page, NAMES, 320);
  const group = page.getByRole('radiogroup', { name: 'Switch journey' });
  await group.getByRole('radio', { name: 'Home', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#trip-name')).toHaveText('Lisbon in spring');
  await expect(group.getByRole('radio', { name: 'Lisbon in spring' })).toBeFocused();
  await expect(group.getByRole('radio', { name: 'Lisbon in spring' })).toBeChecked();
  // A focused journey shows a ring, and the row keeps it in view.
  const ring = await page.locator('.journey-choice').nth(1).evaluate((choice) => getComputedStyle(choice).outlineStyle);
  expect(ring).toBe('solid');

  for (const name of NAMES.slice(2)) {
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#trip-name')).toHaveText(name);
    await expect(group.getByRole('radio', { name, exact: true })).toBeFocused();
  }
  await expectChosenInView(page);

  // Tab leaves the row in one step and lands on New journey.
  await page.keyboard.press('Tab');
  await expect(page.locator('#new-journey-button')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(group.getByRole('radio', { name: NAMES.at(-1) })).toBeFocused();
});

async function expectChosenInView(page) {
  await expect.poll(() => page.evaluate(() => {
    const row = document.querySelector('#journey-row');
    const chosen = row.querySelector('input:checked').closest('.journey-choice');
    const rowBox = row.getBoundingClientRect();
    const box = chosen.getBoundingClientRect();
    return box.left >= rowBox.left && box.right <= rowBox.left + row.clientWidth;
  }), { message: 'the open journey is wholly in view' }).toBe(true);
}

test('the open journey is scrolled into view when it is chosen and when the ledger opens again', async ({ page }) => {
  await signedInWith(page, NAMES, 320);
  await page.locator('.journey-choice').last().click();
  await expect(page.locator('#trip-name')).toHaveText(NAMES.at(-1));
  await expectChosenInView(page);
  await expect(page.locator('#journey-row')).toHaveAttribute('data-more-before', '');

  // Scrolled back by hand, an unrelated render leaves the row where it was put.
  await page.locator('#journey-row').evaluate((row) => row.scrollTo({ left: 0, behavior: 'instant' }));
  await page.locator('#workspace-theme-select').selectOption('dark');
  await expect.poll(() => page.locator('#journey-row').evaluate((row) => row.scrollLeft)).toBe(0);
  await expect(page.locator('#journey-row')).toHaveAttribute('data-more-after', '');
  await expect(page.locator('#journey-row')).not.toHaveAttribute('data-more-before', '');
});

// Journeys held in this browser keep the open one when the page opens again, so they show the row
// opening on a journey that is not the first.
test('a journey created last is opened in view, and still in view when the ledger opens again', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /Begin your ledger/ }).first().click();
  await page.locator('#moment-form [name="title"]').fill('A first moment');
  await page.getByRole('button', { name: 'Hold this moment' }).click();
  await expect(page.locator('.trip-bar')).toBeVisible();
  await expect(page.locator('#journey-picker')).toBeHidden();

  const made = ['Lisbon in spring', LONG, 'Moving house', 'Weekends with Ma'];
  for (const name of made) {
    await page.getByRole('button', { name: '＋ New journey' }).click();
    const form = page.locator('#journey-form');
    await form.locator('[name="name"]').fill(name);
    await form.locator('[name="memberOne"]').fill('Avery');
    await form.locator('[name="memberTwo"]').fill('Sam');
    await page.locator('#save-journey-button').click();
    await expect(page.locator('#trip-name')).toHaveText(name);
    await expect(page.getByRole('radio', { name, exact: true })).toBeChecked();
    await expectChosenInView(page);
  }
  await expect(page.locator('#journey-row')).toHaveAttribute('data-more-before', '');

  await page.reload();
  await expect(page.locator('#trip-name')).toHaveText(made.at(-1));
  await expectChosenInView(page);
  await expect(page.locator('#journey-row')).toHaveAttribute('data-more-before', '');
});

test('with one journey there is no row, and New journey stands in its place', async ({ page }) => {
  await signedInWith(page, ['Home'], 390);
  await expect(page.getByRole('radiogroup', { name: 'Switch journey' })).toHaveCount(0);
  await expect(page.locator('#journey-picker')).toBeHidden();
  const button = page.getByRole('button', { name: '＋ New journey' });
  await expect(button).toBeVisible();
  const [buttonBox, switchBox] = await Promise.all([button.boundingBox(), page.locator('.journey-switch').boundingBox()]);
  expect(buttonBox.width).toBeCloseTo(switchBox.width, 0);
});
