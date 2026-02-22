import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IE-SYNC | Information Navigator | 1st MIG // III MEF",
  description: "AI-Enabled Information Environment Running Estimate & Decision Support Tool — USMC IO",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
