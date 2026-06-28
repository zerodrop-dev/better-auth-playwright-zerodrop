import { test, expect } from "@playwright/test";
import { ZeroDrop } from "zerodrop-client";

const mail = new ZeroDrop();

/**
 * Test: Better Auth password reset flow
 *
 * Flow:
 * 1. Request a password reset for a ZeroDrop inbox
 * 2. Better Auth sends a reset link via Resend
 * 3. ZeroDrop catches it at the edge
 * 4. email.magicLink contains the reset URL — auto-extracted
 * 5. Navigate to the link, set new password, assert success
 */
test("password reset via email link", async ({ page }) => {
  const inbox = mail.generateInbox();

  // First create an account
  await page.goto("/signup");
  await page.fill('[name="email"]', inbox);
  await page.fill('[name="password"]', "OldPassword123!");
  await page.click('[type="submit"]');

  // Verify email first (Better Auth requires this)
  const verifyEmail = await mail.waitForLatest(inbox, {
    timeout: 15000,
    filter: { subject: "Verify" },
  });
  await page.goto(verifyEmail.magicLink!);

  // Now request password reset
  await page.goto("/forgot-password");
  await page.fill('[name="email"]', inbox);
  await page.click('[type="submit"]');

  await expect(
    page.locator("text=Reset link sent")
  ).toBeVisible();

  // Wait for the reset email
  const resetEmail = await mail.waitForLatest(inbox, {
    timeout: 15000,
    filter: { subject: "Reset" },
  });

  // magicLink is auto-extracted — no regex needed
  expect(resetEmail.magicLink).toBeTruthy();

  // Navigate to reset link
  await page.goto(resetEmail.magicLink!);

  // Set new password
  await page.fill('[name="password"]', "NewPassword123!");
  await page.fill('[name="confirmPassword"]', "NewPassword123!");
  await page.click('[type="submit"]');

  // Assert success
  await expect(
    page.locator("text=Password updated")
  ).toBeVisible();

  // Sign in with new password
  await page.goto("/login");
  await page.fill('[name="email"]', inbox);
  await page.fill('[name="password"]', "NewPassword123!");
  await page.click('[type="submit"]');

  await expect(page).toHaveURL("/dashboard");
});

/**
 * Test: Reset link is single-use
 */
test("reset link is single-use", async ({ page, context }) => {
  const inbox = mail.generateInbox();

  await page.goto("/forgot-password");
  await page.fill('[name="email"]', inbox);
  await page.click('[type="submit"]');

  const email = await mail.waitForLatest(inbox, { timeout: 15000 });
  const resetLink = email.magicLink!;

  // First use — should show reset form
  await page.goto(resetLink);
  await page.fill('[name="password"]', "NewPassword123!");
  await page.click('[type="submit"]');
  await expect(page.locator("text=Password updated")).toBeVisible();

  // Second use — should show error
  const page2 = await context.newPage();
  await page2.goto(resetLink);
  await expect(page2.locator(".error-message")).toBeVisible();
});
