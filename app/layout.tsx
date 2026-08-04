import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IE-SYNC | Capture the Information Environment",
  description:
    "UNCLASSIFIED//OSINT workbench for Marine Corps Information Officers — characterize the military information environment, draft adversary speculation, and plan ITCO / Annex I responses. 1st MIG // III MEF experimentation.",
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
