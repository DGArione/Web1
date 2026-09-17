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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
