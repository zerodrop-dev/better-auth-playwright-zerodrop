import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Better Auth + ZeroDrop Example",
  description: "Testing Better Auth email flows with Playwright and ZeroDrop",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
