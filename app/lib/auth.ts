import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink } from "better-auth/plugins";
import { emailOTP } from "better-auth/plugins";
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

// Resend sends only from a domain you've verified in your Resend account
// (https://resend.com/domains). Its shared onboarding@resend.dev sends only to
// your own address, so it can't reach a ZeroDrop inbox.
function sendEmail(to: string, subject: string, text: string) {
  const from = process.env.RESEND_FROM;
  if (!from) {
    throw new Error(
      'RESEND_FROM is not set. Set it to an address on a domain you verified in Resend, e.g. "Auth <auth@yourdomain.com>".'
    );
  }
  // resend.emails.send() returns most failures in `error` instead of
  // throwing, and the callers below don't await it, so log them here.
  return resend.emails.send({ from, to, subject, text }).then(({ error }) => {
    if (error) console.error(`Resend couldn't send "${subject}" to ${to}: ${error.message}`);
  });
}

// The sends below aren't awaited, as Better Auth recommends: waiting for them
// would let response times show whether an account exists.
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite", // use postgres/mysql in production
  }),

  emailAndPassword: {
    enabled: true,

    // Password reset via magic link
    sendResetPassword: async ({ user, url }) => {
      void sendEmail(user.email, "Reset your password", `Click the link to reset your password: ${url}`);
    },
  },

  // Email verification on signup
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail(user.email, "Verify your email", `Click the link to verify your email: ${url}`);
    },
  },

  plugins: [
    // Magic link passwordless login
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        void sendEmail(email, "Your magic link", `Click the link to sign in: ${url}`);
      },
    }),

    // Email OTP for sign-in and verification
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        const subjects: Record<string, string> = {
          "sign-in": "Your sign-in code",
          "email-verification": "Verify your email",
          "forget-password": "Reset your password",
        };
        void sendEmail(email, subjects[type] || "Your verification code", `Your code is: ${otp}`);
      },
    }),
  ],
});
