"use client";

import { ClerkProvider } from "@clerk/react";
import { useEffect, useState } from "react";

function usableKey(value?: string | null) {
  return Boolean(value && value.startsWith("pk_"));
}

export default function AuthProvider({ children, publishableKey }: { children: React.ReactNode; publishableKey?: string }) {
  const [key, setKey] = useState(() => usableKey(publishableKey) ? publishableKey : null);
  const [ready, setReady] = useState(() => usableKey(publishableKey));

  useEffect(() => {
    if (key) return;
    let active = true;
    fetch("/hub-client-config", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload: { publishableKey?: string } | null) => {
        if (active && usableKey(payload?.publishableKey)) setKey(payload!.publishableKey!);
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [key]);

  if (!key) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#071326", color: "#eaf2ff", fontFamily: "system-ui, sans-serif" }}>
      <span>{ready ? "Não foi possível iniciar o acesso. Atualize a página." : "Carregando Hub Brasil…"}</span>
    </div>;
  }

  return <ClerkProvider publishableKey={key}>{children}</ClerkProvider>;
}
