"use client";

import { ClerkProvider } from "@clerk/react";
import { ptBR } from "@clerk/localizations";

export default function AuthProvider({ children, publishableKey }: { children: React.ReactNode; publishableKey?: string }) {
  // Keeping previews available without local secrets makes development easier;
  // production always receives the key through the Worker binding.
  if (!publishableKey || publishableKey === "SET_IN_CLOUDFLARE_DASHBOARD") return <>{children}</>;
  return <ClerkProvider publishableKey={publishableKey} localization={ptBR}>{children}</ClerkProvider>;
}
