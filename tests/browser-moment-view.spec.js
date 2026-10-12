import { test, expect } from './browser-test.js';

// The moment view has no filter row and no "＋ Add your own moment" (the owner, on #405).
// "＋ Hold a moment" is the way in for every kind, a named one included, and "See all" shows every moment.
test('"See all" shows every moment of every kind, with no filter row to narrow it (#405)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Begin your ledger/ }).first().click();
  const form = page.locator('#moment-form');
  const held = [['promise', 'A promise kept'], ['memory', 'A memory of the sea'], ['feeling', 'A tired evening'], ['other', 'We paused before replying']];
  for (const [index, [kind, title]] of held.entries()) {
    if (index > 0) await page.locator('[data-open-moment]:visible').first().click();
    await form.locator('[name="kind"]').selectOption(kind);
    if (kind === 'other') await form.locator('[name="kindLabel"]').fill('A small win');
    await form.locator('[name="title"]').fill(title);
    await page.getByRole('button', { name: 'Hold this moment' }).click();
    await expect(page.locator('#moment-timeline')).toContainText(title);
  }

  const moments = page.locator('#moments');
  await expect(moments.locator('.moment-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'See all 4 moments', exact: true }).click();
  await expect(moments.locator('.moment-card')).toHaveCount(4);
  for (const [, title] of held) await expect(moments).toContainText(title);
  await expect(moments).toContainText('A small win', { message: 'a kind the person named, held from "＋ Hold a moment"' });

  // Nothing to filter with, so nothing can leave a moment out of reach.
  await expect(page.getByRole('group', { name: 'Filter moments by kind' })).toHaveCount(0);
  await expect(page.locator('[data-moment-filter]')).toHaveCount(0);
  await expect(moments.getByRole('button', { name: 'All moments' })).toHaveCount(0);
  await expect(moments.getByRole('button', { name: /Add your own moment/ })).toHaveCount(0);
  await expect(moments.getByRole('button', { name: '＋ Hold a moment' })).toBeVisible();

  await page.getByRole('button', { name: 'Show recent', exact: true }).click();
  await expect(moments.locator('.moment-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'See all 4 moments', exact: true }).click();
  await expect(moments.locator('.moment-card')).toHaveCount(4);
});
