"use client";

import { ClerkProvider } from "@clerk/react";
import { ptBR } from "@clerk/localizations";
import { useEffect, useState } from "react";

export default function AuthProvider({ children, publishableKey }: { children: React.ReactNode; publishableKey?: string }) {
  const initialKey = publishableKey && publishableKey !== "SET_IN_CLOUDFLARE_DASHBOARD" ? publishableKey : "";
  const [key, setKey] = useState(initialKey);
  const [ready, setReady] = useState(Boolean(initialKey));

  useEffect(() => {
    if (initialKey) return;
    let active = true;
    fetch("/hb-init", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active && typeof data?.clerkPublishableKey === "string" && data.clerkPublishableKey) setKey(data.clerkPublishableKey);
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [initialKey]);

  // Do not render Clerk components outside their provider while the Worker is
  // loading the public key. This prevents the login page from crashing.
  if (!ready) return <div className="auth-bootstrap" aria-live="polite">Preparando acesso seguro…</div>;
  if (!key) return <>{children}</>;
  return <ClerkProvider publishableKey={key} localization={ptBR}>{children}</ClerkProvider>;
}
