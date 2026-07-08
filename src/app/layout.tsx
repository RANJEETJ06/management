import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

// Display — a characterful variable serif for headings & numerals.
const display = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display",
});

// UI / body — a warm humanist grotesque.
const sans = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: "Lupin — a calmer CRM",
    template: "%s · Lupin",
  },
  description:
    "Lupin is a relationship almanac for real businesses — contacts, conversations, deals, tasks, and tiered access from the field to the boardroom.",
  openGraph: {
    title: "Lupin — a calmer CRM",
    description:
      "Contacts, conversations, deals and tasks — with five-tier clearance so the right eyes see the right data.",
    siteName: "Lupin",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d4f3b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
