# better-auth-playwright-zerodrop

[![CI](https://github.com/zerodrop-dev/better-auth-playwright-zerodrop/actions/workflows/test.yml/badge.svg)](https://github.com/zerodrop-dev/better-auth-playwright-zerodrop/actions/workflows/test.yml)
[![zerodrop-client](https://img.shields.io/npm/v/zerodrop-client.svg?label=zerodrop-client)](https://www.npmjs.com/package/zerodrop-client)
[![better-auth](https://img.shields.io/npm/v/better-auth.svg?label=better-auth)](https://www.npmjs.com/package/better-auth)

> Testing Better Auth email flows with Playwright and ZeroDrop — no Docker, no regex, no shared inboxes.

Covers all four email flows Better Auth supports — end to end, in CI, with real emails.

```bash
git clone https://github.com/zerodrop-dev/better-auth-playwright-zerodrop
cd better-auth-playwright-zerodrop
pnpm install
cp .env.example .env   # add BETTER_AUTH_SECRET, RESEND_API_KEY, RESEND_FROM and ZERODROP_API_KEY
pnpm prisma migrate dev
pnpm exec playwright install chromium
pnpm test
```

## What this tests

| Test file | Better Auth feature | ZeroDrop field |
|---|---|---|
| `email-verification.spec.ts` | `emailVerification` | `email.magicLink` |
| `magic-link.spec.ts` | `magicLink` plugin | `email.magicLink` |
| `email-otp.spec.ts` | `emailOTP` plugin | `email.otp` |
| `password-reset.spec.ts` | `sendResetPassword` | `email.magicLink` |

## How it works

Better Auth sends real emails via Resend. ZeroDrop catches them at Cloudflare's edge and auto-extracts OTPs and magic links before your test reads them.

```typescript
const mail = new ZeroDrop(); // reads ZERODROP_API_KEY

// Generate a unique inbox per test — no network request
const inbox = mail.generateInbox();

// Trigger the email flow in your app...
await page.fill('[name="email"]', inbox);
await page.click('[type="submit"]');

// ZeroDrop catches the email
const email = await mail.waitForLatest(inbox, { timeout: 15000 });

email.otp        // "847291" — auto-extracted, no regex
email.magicLink  // "https://..." — auto-extracted, no HTML parsing
```

No regex. No HTML parsing. No shared inboxes. No Docker.

## Project structure

```
better-auth-playwright-zerodrop/
├── app/
│   ├── api/auth/[...all]/
│   │   └── route.ts          # Better Auth API handler
│   ├── lib/
│   │   ├── auth.ts           # Better Auth server config
│   │   └── auth-client.ts    # Better Auth client config
│   ├── signup/page.tsx       # Sign up page
│   ├── login/page.tsx        # Login (password, magic link, OTP)
│   ├── dashboard/page.tsx    # Protected dashboard
│   ├── forgot-password/      # Password reset request
│   └── reset-password/       # Password reset form
├── tests/
│   ├── email-verification.spec.ts
│   ├── magic-link.spec.ts
│   ├── email-otp.spec.ts
│   └── password-reset.spec.ts
├── prisma/
│   └── schema.prisma         # User, Session, Account, Verification
├── playwright.config.ts
├── package.json
└── .env.example
```

## Stack

| Tool | Purpose |
|---|---|
| [Better Auth](https://better-auth.com) | Authentication framework |
| [Resend](https://resend.com) | Email sending |
| [ZeroDrop](https://zerodrop.dev) | Email catching + OTP/magic link extraction |
| [Playwright](https://playwright.dev) | E2E testing |
| [Next.js 15](https://nextjs.org) | App framework |
| [Prisma + SQLite](https://prisma.io) | Database (swap for Postgres in production) |

## Setup

**1. Clone and install**

```bash
git clone https://github.com/zerodrop-dev/better-auth-playwright-zerodrop
cd better-auth-playwright-zerodrop
pnpm install
pnpm exec playwright install chromium
```

**2. Configure environment**

```bash
cp .env.example .env
```

| Variable | Where to get it |
|---|---|
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys |
| `RESEND_FROM` | An address on a domain you've verified at [resend.com/domains](https://resend.com/domains), such as `Auth <auth@yourdomain.com>` |
| `ZERODROP_API_KEY` | A free key from [zerodrop.dev/keys](https://zerodrop.dev/keys) (sign in with GitHub) |
| `DATABASE_URL` | `file:./dev.db` (SQLite, already set) |

Resend's shared `onboarding@resend.dev` only sends to your own Resend account's address, so it can't reach a ZeroDrop inbox: `RESEND_FROM` has to be on your own verified domain.

Set `ZERODROP_API_KEY`: a full run uses 7 inboxes (one per test that runs), and without an API key one sender can reach only 5 different inboxes a day. Past that, ZeroDrop holds the email and the test fails with a `ZeroDropHeldError`. With a key, inbox names start with your key's prefix, only your key can read them, and they aren't limited.

**3. Set up the database**

```bash
pnpm prisma migrate dev
```

**4. Run the app**

```bash
pnpm dev
```

**5. Run tests**

```bash
pnpm test
```

## GitHub Actions CI

No Docker. No SMTP service. Store your free ZeroDrop key as the `ZERODROP_API_KEY` repository secret: a run uses more inboxes than the 5 a day one sender can reach without a key.

```yaml
- uses: actions/checkout@v4
- run: pnpm install
- run: pnpm prisma db push
- run: pnpm exec playwright install --with-deps chromium
- run: pnpm test
env:
  BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET }}
  RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
  RESEND_FROM: Auth <auth@yourdomain.com>
  ZERODROP_API_KEY: ${{ secrets.ZERODROP_API_KEY }}
  DATABASE_URL: file:./test.db
```

## Why ZeroDrop

Every Better Auth email flow sends a real email. Without a way to catch and read that email, you can't test the full flow.

The common workarounds:

| Approach | Problem |
|---|---|
| Mock the email | Tests pass while broken emails ship to production |
| Shared Gmail inbox | Race conditions in parallel test runs |
| MailHog | Requires Docker, doesn't test your real email provider |

ZeroDrop gives each test a real isolated inbox. OTPs and magic links are extracted at Cloudflare's edge — your test just reads `email.otp` or `email.magicLink`.

Free, no signup to try → [zerodrop.dev](https://zerodrop.dev). A full run of this suite needs a free API key → [zerodrop.dev/keys](https://zerodrop.dev/keys)

## Related

- [ZeroDrop docs](https://docs.zerodrop.dev)
- [Better Auth docs](https://better-auth.com/docs)
- [Better Auth email OTP plugin](https://better-auth.com/docs/plugins/email-otp)
- [Better Auth magic link plugin](https://better-auth.com/docs/plugins/magic-link)
