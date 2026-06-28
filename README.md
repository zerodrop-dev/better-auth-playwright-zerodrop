# better-auth-playwright-zerodrop

Testing Better Auth email flows with Playwright and ZeroDrop.

Covers all four email flows Better Auth supports — end to end, in CI, with no Docker or shared inboxes.

```bash
pnpm test
```

## What this tests

| Test | Better Auth feature | ZeroDrop field |
|---|---|---|
| Email verification on signup | `emailVerification` | `email.magicLink` |
| Magic link sign-in | `magicLink` plugin | `email.magicLink` |
| Magic link single-use | `magicLink` plugin | `email.magicLink` |
| Email OTP sign-in | `emailOTP` plugin | `email.otp` |
| Email OTP verification | `emailOTP` plugin | `email.otp` |
| OTP single-use | `emailOTP` plugin | `email.otp` |
| Password reset | `sendResetPassword` | `email.magicLink` |
| Reset link single-use | `sendResetPassword` | `email.magicLink` |

## How it works

Better Auth sends real emails via Resend. ZeroDrop catches them at Cloudflare's edge and auto-extracts OTPs and magic links before your test reads them.

```typescript
const inbox = mail.generateInbox(); // instant, no network request

// Trigger the email flow in your app...

const email = await mail.waitForLatest(inbox, { timeout: 15000 });
email.otp        // "847291" — auto-extracted, no regex
email.magicLink  // "https://..." — auto-extracted, no HTML parsing
```

No regex. No HTML parsing. No shared inboxes. No Docker.

## Stack

- [Better Auth](https://better-auth.com) — auth framework
- [Resend](https://resend.com) — email sending
- [ZeroDrop](https://zerodrop.dev) — email catching + OTP/magic link extraction
- [Playwright](https://playwright.dev) — E2E testing
- [Next.js](https://nextjs.org) — app framework
- [SQLite/Prisma](https://prisma.io) — database (swap for Postgres in production)

## Setup

**1. Clone and install:**

```bash
git clone https://github.com/zerodrop-dev/better-auth-playwright-zerodrop
cd better-auth-playwright-zerodrop
pnpm install
```

**2. Configure environment:**

```bash
cp .env.example .env
```

Fill in:
- `BETTER_AUTH_SECRET` — generate with `openssl rand -base64 32`
- `RESEND_API_KEY` — get from [resend.com](https://resend.com)

**3. Set up database:**

```bash
pnpm prisma migrate dev
```

**4. Run tests:**

```bash
pnpm test
```

## GitHub Actions CI

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: pnpm install
      - run: pnpm prisma migrate deploy
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test
    env:
      BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET }}
      RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
      DATABASE_URL: file:./test.db
```

No Docker. No SMTP service. ZeroDrop works out of the box.

## Why ZeroDrop

Every Better Auth email flow sends a real email. Without a way to catch and read those emails, you can't test the full flow.

The common workarounds:

- **Mock the email** — your tests pass while broken emails ship to production
- **Shared Gmail inbox** — race conditions in parallel test runs
- **MailHog** — requires Docker, doesn't test your real email provider

ZeroDrop gives each test a real isolated inbox. OTPs and magic links are extracted at Cloudflare's edge before your test reads them. No infrastructure. No regex.

Free, no signup required. → [zerodrop.dev](https://zerodrop.dev)

## Related

- [ZeroDrop docs](https://docs.zerodrop.dev)
- [Better Auth docs](https://better-auth.com/docs)
- [Resend docs](https://resend.com/docs)
