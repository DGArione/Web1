import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ceylon Private Traders — Invitation-only Marketplace",
  description:
    "A private, invitation-based buy & sell platform inspired by Sri Lankan tea.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning tolerates attributes injected by browser
    // extensions (e.g. grammar/writing tools add data-* on <html>/<body>)
    // and theme attributes, which would otherwise trip React's hydration check.
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
