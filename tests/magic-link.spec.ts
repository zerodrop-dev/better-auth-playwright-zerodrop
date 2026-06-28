import { test, expect } from "@playwright/test";
import { ZeroDrop } from "zerodrop-client";

const mail = new ZeroDrop();

/**
 * Test: Better Auth magic link sign-in
 *
 * Flow:
 * 1. Request a magic link for a ZeroDrop inbox
 * 2. Better Auth sends the magic link via Resend
 * 3. ZeroDrop catches it at the edge
 * 4. email.magicLink contains the sign-in URL — auto-extracted
 * 5. Navigate to the link, assert user is signed in
 */
test("magic link sign-in", async ({ page }) => {
  const inbox = mail.generateInbox();

  // Request a magic link
  await page.goto("/login");
  await page.fill('[name="email"]', inbox);
  await page.click('button:has-text("Send magic link")');

  // Better Auth confirms the link was sent
  await expect(
    page.locator("text=Magic link sent")
  ).toBeVisible();

  // Wait for the email — ZeroDrop catches it in <1s
  const email = await mail.waitForLatest(inbox, {
    timeout: 15000,
    filter: { subject: "magic link" },
  });

  // magicLink is auto-extracted from the email body
  expect(email.magicLink).toBeTruthy();

  // Navigate to the magic link — Better Auth signs the user in
  await page.goto(email.magicLink!);

  // Assert user is signed in
  await expect(page).toHaveURL("/dashboard");
});

/**
 * Test: Magic link is single-use
 * Better Auth invalidates the token after first use
 */
test("magic link is single-use", async ({ page, context }) => {
  const inbox = mail.generateInbox();

  await page.goto("/login");
  await page.fill('[name="email"]', inbox);
  await page.click('button:has-text("Send magic link")');

  const email = await mail.waitForLatest(inbox, { timeout: 15000 });
  const magicLink = email.magicLink!;

  // First use — should succeed
  await page.goto(magicLink);
  await expect(page).toHaveURL("/dashboard");

  // Second use — should fail
  const page2 = await context.newPage();
  await page2.goto(magicLink);
  await expect(page2.locator(".error-message")).toBeVisible();
});
