import { test, expect } from "@playwright/test";
import { ZeroDrop } from "zerodrop-client";

const mail = new ZeroDrop();

/**
 * Test: Better Auth email verification flow
 *
 * Flow:
 * 1. Sign up with a ZeroDrop inbox
 * 2. Better Auth sends a verification email via Resend
 * 3. ZeroDrop catches it at the edge
 * 4. email.magicLink contains the verification URL — auto-extracted
 * 5. Navigate to the link, assert user is verified
 */
test("email verification on signup", async ({ page }) => {
  const inbox = mail.generateInbox();

  // Sign up
  await page.goto("/signup");
  await page.fill('[name="email"]', inbox);
  await page.fill('[name="password"]', "TestPassword123!");
  await page.click('[type="submit"]');

  // Better Auth redirects to "check your email" page
  await expect(page.locator("text=Check your email")).toBeVisible();

  // Wait for the verification email — ZeroDrop catches it in <1s
  const email = await mail.waitForLatest(inbox, {
    timeout: 15000,
    filter: { subject: "Verify" },
  });

  // magicLink is auto-extracted — no regex needed
  expect(email.magicLink).toBeTruthy();

  // Navigate to the verification link
  await page.goto(email.magicLink!);

  // Assert user is verified and redirected to dashboard
  await expect(page).toHaveURL("/dashboard");
  await expect(page.locator("text=Welcome")).toBeVisible();
});
