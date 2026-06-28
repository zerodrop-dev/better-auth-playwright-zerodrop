import { test, expect } from "@playwright/test";
import { ZeroDrop } from "zerodrop-client";

const mail = new ZeroDrop();

/**
 * Test: Better Auth email OTP sign-in
 */
test("email OTP sign-in", async ({ page }) => {
  const inbox = mail.generateInbox();

  await page.goto("/login");
  await page.fill('[name="email"]', inbox);
  await page.click('button:has-text("Send code")');

  await expect(page.locator("text=Code sent")).toBeVisible();

  // Wait for OTP email — extracted automatically at the edge
  const email = await mail.waitForLatest(inbox, {
    timeout: 15000,
    filter: { hasOtp: true },
  });

  // email.otp is ready — no regex, no HTML parsing
  expect(email.otp).toBeTruthy();
  expect(email.otp).toMatch(/^\d{6}$/);

  await page.fill('[name="otp"]', email.otp!);
  await page.click('[type="submit"]');

  await expect(page).toHaveURL("/dashboard");
});

/**
 * Test: Better Auth email OTP for email verification
 */
test("email OTP verification on signup", async ({ page }) => {
  const inbox = mail.generateInbox();

  await page.goto("/signup");
  await page.fill('[name="email"]', inbox);
  await page.fill('[name="password"]', "TestPassword123!");
  await page.click('[type="submit"]');

  await expect(page.locator("text=Enter the code")).toBeVisible();

  const email = await mail.waitForLatest(inbox, {
    timeout: 15000,
    filter: { subject: "Verify", hasOtp: true },
  });

  expect(email.otp).toBeTruthy();

  await page.fill('[name="otp"]', email.otp!);
  await page.click('[type="submit"]');

  await expect(page).toHaveURL("/dashboard");
});

/**
 * Test: OTP is single-use
 */
test("OTP is single-use", async ({ page }) => {
  const inbox = mail.generateInbox();

  await page.goto("/login");
  await page.fill('[name="email"]', inbox);
  await page.click('button:has-text("Send code")');

  const email = await mail.waitForLatest(inbox, { timeout: 15000 });
  const otp = email.otp!;

  // First use — should succeed
  await page.fill('[name="otp"]', otp);
  await page.click('[type="submit"]');
  await expect(page).toHaveURL("/dashboard");

  // Log out then try same OTP again
  await page.goto("/logout");
  await page.goto("/login");
  await page.fill('[name="email"]', inbox);
  await page.fill('[name="otp"]', otp);
  await page.click('[type="submit"]');

  // Should fail — OTP already consumed
  await expect(page.locator(".error-message")).toBeVisible();
});
