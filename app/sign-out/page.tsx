"use client";

import { useEffect } from "react";
import { useClerkAvailability } from "../auth-provider";
import { useClerk } from "@clerk/react";

function SignOutWithClerk() {
  const { signOut } = useClerk();
  useEffect(() => {
    void signOut({ redirectUrl: "/" }).finally(() => {
      window.location.replace("/");
    });
  }, [signOut]);
  return null;
}

export default function SignOutPage() {
  const { available } = useClerkAvailability();
  // useClerk() lança fora do ClerkProvider — isolar a chamada num componente filho,
  // só montado quando o Clerk está disponível, evita que a página quebre.
  return <main className="auth-page"><p>Encerrando o acesso…</p>{available && <SignOutWithClerk />}</main>;
}
