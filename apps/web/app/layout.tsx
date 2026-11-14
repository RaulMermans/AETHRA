import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BRAND_NAME, BRAND_PLATFORM, BRAND_TAGLINE, CHALLENGE_NAME } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: `${BRAND_NAME} — ${BRAND_PLATFORM}`,
  description: `${BRAND_TAGLINE} Investigate historical Earth-system trends for Spain with NASA Earth observation data. NASA Space Apps 2026 · ${CHALLENGE_NAME} Independent student project; not an official NASA product.`,
};

export const viewport: Viewport = {
  themeColor: "#03050a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
