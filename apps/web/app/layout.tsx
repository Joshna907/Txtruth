import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "TxTruth | Solana transaction UX conformance",
  description: "Test whether your Solana transaction UI tells users the truth across wallet, RPC, confirmation, and execution states.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
