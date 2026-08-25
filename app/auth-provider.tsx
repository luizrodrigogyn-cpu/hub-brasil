"use client";

import { ClerkProvider } from "@clerk/react";
import { ptBR } from "@clerk/localizations";
import { createContext, useContext, useEffect, useState } from "react";

// Os tipos oficiais da Cloudflare tipam Response.json() como `unknown` em vez de `any`;
// este helper concentra a conversão explícita usada na leitura de JSON do fetch.
function readJson(response: Response): Promise<any> {
  return response.json() as Promise<any>;
}

// Páginas que renderizam componentes do Clerk diretamente (SignIn, SignUp, useClerk)
// precisam saber se o ClerkProvider foi montado antes de tentar usá-los — se a chave
// pública não estiver configurada (ex.: variável de ambiente apagada no Cloudflare),
// o componente do Clerk lança "must be used within <ClerkProvider>" e derruba a página
// inteira, sem tela de erro amigável. Este contexto permite que cada página mostre um
// aviso em vez de quebrar.
const ClerkAvailabilityContext = createContext({ ready: false, available: false });

export function useClerkAvailability() {
  return useContext(ClerkAvailabilityContext);
}

export default function AuthProvider({ children, publishableKey }: { children: React.ReactNode; publishableKey?: string }) {
  const initialKey = publishableKey && publishableKey !== "SET_IN_CLOUDFLARE_DASHBOARD" ? publishableKey : "";
  const [key, setKey] = useState(initialKey);
  const [ready, setReady] = useState(Boolean(initialKey));

  useEffect(() => {
    if (initialKey) return;
    let active = true;
    fetch("/hb-init", { cache: "no-store" })
      .then((response) => response.ok ? readJson(response) : null)
      .then((data) => {
        if (active && typeof data?.clerkPublishableKey === "string" && data.clerkPublishableKey) setKey(data.clerkPublishableKey);
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [initialKey]);

  const availability = { ready, available: Boolean(key) };

  // Do not render Clerk components outside their provider while the Worker is
  // loading the public key. This prevents the login page from crashing.
  if (!ready) return <div className="auth-bootstrap" aria-live="polite">Preparando acesso seguro…</div>;
  if (!key) return <ClerkAvailabilityContext.Provider value={availability}>{children}</ClerkAvailabilityContext.Provider>;
  return <ClerkAvailabilityContext.Provider value={availability}><ClerkProvider publishableKey={key} localization={ptBR}>{children}</ClerkProvider></ClerkAvailabilityContext.Provider>;
}
