import { test, expect } from "@playwright/test";
import { ZeroDrop } from "zerodrop-client";

const mail = new ZeroDrop();

/**
 * Test: Better Auth email OTP sign-in
 */
test("email OTP sign-in", async ({ page }) => {
  const inbox = mail.generateInbox();

  await page.goto("/login");
  await page.click('button:has-text("Use one-time code")');
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
 *
 * Not runnable against this app yet: sign-up sends a verification link, not
 * a code (that needs emailOTP's sendVerificationOnSignUp option), and the
 * sign-up page has no field to enter a code.
 */
test.fixme("email OTP verification on signup", async ({ page }) => {
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
test("OTP is single-use", async ({ page, baseURL }) => {
  const inbox = mail.generateInbox();

  await page.goto("/login");
  await page.click('button:has-text("Use one-time code")');
  await page.fill('[name="email"]', inbox);
  await page.click('button:has-text("Send code")');

  const email = await mail.waitForLatest(inbox, { timeout: 15000 });
  const otp = email.otp!;

  // First use — should succeed
  await page.fill('[name="otp"]', otp);
  await page.click('[type="submit"]');
  await expect(page).toHaveURL("/dashboard");

  // Try the same OTP again. The login page shows a code field only after
  // sending a new code, so call Better Auth's sign-in endpoint directly.
  const reuse = await page.request.post("/api/auth/sign-in/email-otp", {
    headers: { origin: baseURL! }, // Better Auth's CSRF check wants one
    data: { email: inbox, otp },
  });

  // Should fail — OTP already consumed
  expect(reuse.status()).toBe(400);
  expect(await reuse.json()).toMatchObject({ code: "INVALID_OTP" });
});
