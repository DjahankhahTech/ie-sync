import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IE-SYNC | One Source for Military Information Officers",
  description:
    "UNCLASSIFIED//OSINT source for military Information Officers — live OSINT, theater news, adversary activity, public doctrine, and S&T resources in one place. 1st MIG // III MEF experimentation.",
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
