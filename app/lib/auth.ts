import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink } from "better-auth/plugins";
import { emailOTP } from "better-auth/plugins";
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite", // use postgres/mysql in production
  }),

  emailAndPassword: {
    enabled: true,

    // Password reset via magic link
    sendResetPassword: async ({ user, url }) => {
      void resend.emails.send({
        from: "noreply@yourdomain.com",
        to: user.email,
        subject: "Reset your password",
        text: `Click the link to reset your password: ${url}`,
      });
    },
  },

  // Email verification on signup
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      void resend.emails.send({
        from: "noreply@yourdomain.com",
        to: user.email,
        subject: "Verify your email",
        text: `Click the link to verify your email: ${url}`,
      });
    },
  },

  plugins: [
    // Magic link passwordless login
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        void resend.emails.send({
          from: "noreply@yourdomain.com",
          to: email,
          subject: "Your magic link",
          text: `Click the link to sign in: ${url}`,
        });
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
        void resend.emails.send({
          from: "noreply@yourdomain.com",
          to: email,
          subject: subjects[type] || "Your verification code",
          text: `Your code is: ${otp}`,
        });
      },
    }),
  ],
});
