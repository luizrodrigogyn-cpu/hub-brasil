"use client";

import { useEffect } from "react";
import { useClerkAvailability } from "../auth-provider";
import { useClerk } from "@clerk/react";

function SignOutWithClerk() {
  const { signOut } = useClerk();
  useEffect(() => { void signOut({ redirectUrl: "/" }); }, [signOut]);
  return null;
}

export default function LegacySignOutPage() {
  const { available } = useClerkAvailability();
  return <main className="auth-page"><p>Encerrando o acesso…</p>{available && <SignOutWithClerk />}</main>;
}
