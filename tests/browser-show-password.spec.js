import { test, expect } from './browser-test.js';

test.describe('show password', () => {
  test('sign in password field has a toggle that updates type and aria-pressed', async ({ page }) => {
    await page.goto('/');

    await page.locator('[data-open-account]').first().click();

    const passwordInput = page.locator('#login-form input[name="password"]');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = page.locator('#login-form .show-password-button');
    await expect(toggleButton).toBeVisible();
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    await expect(toggleButton).toHaveAttribute('aria-label', 'Show password');
    await expect(toggleButton).toHaveAttribute('data-i18n-aria-label', 'common.password.show');

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    await expect(toggleButton).toHaveAttribute('aria-label', 'Hide password');
    await expect(toggleButton).toHaveAttribute('data-i18n-aria-label', 'common.password.hide');

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    await expect(toggleButton).toHaveAttribute('aria-label', 'Show password');
    await expect(toggleButton).toHaveAttribute('data-i18n-aria-label', 'common.password.show');
  });

  test('sign in password field hides on form submit', async ({ page }) => {
    await page.goto('/');

    await page.locator('[data-open-account]').first().click();

    const passwordInput = page.locator('#login-form input[name="password"]');
    const toggleButton = page.locator('#login-form .show-password-button');

    // Fill in the required fields so we can submit the form
    await page.locator('#login-form input[name="identifier"]').fill('testuser');
    await passwordInput.fill('passwordpassword');

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Submit the form
    await page.locator('#login-form button.primary').click();

    // The form submission resets the password field to hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
