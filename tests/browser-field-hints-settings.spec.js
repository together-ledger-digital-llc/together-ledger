import { test, expect } from './browser-test.js';

test('settings, sharing, and register fields have aria-describedby pointing to existing elements', async ({ page }) => {
  await page.goto('/');

  // 1. #settings-theme-select
  const themeSelect = page.locator('#settings-theme-select');
  const themeHintId = await themeSelect.getAttribute('aria-describedby');
  expect(themeHintId).toBeTruthy();
  const themeHint = page.locator(`#${themeHintId}`);
  await expect(themeHint).toBeAttached();

  // 2. #invite-form email
  const inviteEmail = page.locator('#invite-form input[name="email"]');
  const inviteEmailHintId = await inviteEmail.getAttribute('aria-describedby');
  expect(inviteEmailHintId).toBeTruthy();
  const inviteEmailHint = page.locator(`#${inviteEmailHintId}`);
  await expect(inviteEmailHint).toBeAttached();

  // 3. #invite-form note
  const inviteNote = page.locator('#invite-form input[name="note"]');
  const inviteNoteHintId = await inviteNote.getAttribute('aria-describedby');
  expect(inviteNoteHintId).toBeTruthy();
  const inviteNoteHint = page.locator(`#${inviteNoteHintId}`);
  await expect(inviteNoteHint).toBeAttached();

  // 4. #register-form username
  const registerUsername = page.locator('#register-form input[name="username"]');
  const registerUsernameHintId = await registerUsername.getAttribute('aria-describedby');
  expect(registerUsernameHintId).toBeTruthy();
  const registerUsernameHint = page.locator(`#${registerUsernameHintId}`);
  await expect(registerUsernameHint).toBeAttached();

  // 5. #register-form password
  const registerPassword = page.locator('#register-form input[name="password"]');
  const registerPasswordHintId = await registerPassword.getAttribute('aria-describedby');
  expect(registerPasswordHintId).toBeTruthy();
  const registerPasswordHint = page.locator(`#${registerPasswordHintId}`);
  await expect(registerPasswordHint).toBeAttached();
});
