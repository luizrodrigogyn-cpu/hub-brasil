"use client";

import { SignUp } from "@clerk/react";
import { useState } from "react";

type RegistrationRole = "client" | "supplier";

export default function SignUpPage() {
  const returnTo = typeof window === "undefined" ? "/" : new URLSearchParams(window.location.search).get("return_to") || "/";
  const initialRole = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("perfil");
  const [role, setRole] = useState<RegistrationRole | null>(initialRole === "fornecedor" ? "supplier" : initialRole === "usuario" ? "client" : null);
  const afterSignUp = returnTo === "/" ? `/?cadastro=${role === "supplier" ? "fornecedor" : "cliente"}` : returnTo;

  function chooseRole(nextRole: RegistrationRole) {
    setRole(nextRole);
    const search = new URLSearchParams(window.location.search);
    search.set("perfil", nextRole === "supplier" ? "fornecedor" : "usuario");
    window.history.replaceState({}, "", `${window.location.pathname}?${search.toString()}${window.location.hash}`);
  }

  return <main className="auth-page"><section className="auth-card"><a className="brand" href="/"><span className="brand-mark"><span></span><span></span><span></span></span><span>Hub <b>Brasil</b></span></a>{role === null ? <><h1>Como você quer participar?</h1><p>Escolha seu perfil para começar o cadastro no Hub Brasil.</p><div className="role-selector"><button type="button" onClick={() => chooseRole("client")}><strong>Sou usuário</strong><span>Quero encontrar, comparar e avaliar fornecedores</span></button><button type="button" onClick={() => chooseRole("supplier")}><strong>Sou fornecedor</strong><span>Quero divulgar minha empresa, produtos e eventos</span></button></div></> : <><button className="text-action" type="button" onClick={() => setRole(null)}>← Trocar perfil</button><h1>{role === "supplier" ? "Cadastre sua empresa" : "Crie seu acesso"}</h1><p>Confirme seus dados de acesso para continuar como {role === "supplier" ? "fornecedor" : "usuário"}.</p><SignUp routing="hash" signInUrl={`/sign-in?return_to=${encodeURIComponent(returnTo)}`} forceRedirectUrl={afterSignUp} /></>}</section></main>;
}
