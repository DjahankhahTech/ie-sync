import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IE-SYNC | USMC Information Officers | 1st MIG // III MEF",
  description:
    "UNCLASSIFIED//OSINT decision support for Marine Corps Information Officers — IE running estimate, ITCO / Annex I planning, SIGMAN, and OSINT triage for 1st MIG / III MEF experimentation.",
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
