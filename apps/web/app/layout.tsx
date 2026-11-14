import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Earth System Trend Detective — Spain",
  description:
    "Explore how Spain's environment has changed using NASA Earth observation data. NASA Space Apps 2026.",
};

export const viewport: Viewport = {
  themeColor: "#03050a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
