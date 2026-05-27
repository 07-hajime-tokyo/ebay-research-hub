import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketKit Research Hub",
  description: "eBay seller research dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
