"use client";

import { ClientProvider } from "@solana/react";
import { devnetClient } from "@/lib/solana-client";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ClientProvider client={devnetClient}>{children}</ClientProvider>;
}
