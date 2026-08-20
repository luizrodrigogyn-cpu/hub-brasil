"use client";

import { useClerk } from "@clerk/react";
import { useEffect } from "react";

export default function SignOutPage() {
  const { signOut } = useClerk();

  useEffect(() => {
    void signOut({ redirectUrl: "/" });
  }, [signOut]);

  return <main className="auth-page"><p>Encerrando o acesso…</p></main>;
}
