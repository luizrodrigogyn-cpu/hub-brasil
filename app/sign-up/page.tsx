"use client";

import { SignUp, useAuth } from "@clerk/react";
import { useState } from "react";
import { useClerkAvailability } from "../auth-provider";

type RegistrationRole = "client" | "supplier" | "installer";

function ClerkSignUpForm({ returnTo, afterSignUp }: { returnTo: string; afterSignUp: string }) {
  const { isLoaded } = useAuth();
  if (!isLoaded) return <div className="clerk-form-shell"><div className="clerk-loading-card static" role="status" aria-live="polite"><span></span><strong>Carregando o campo de e-mail…</strong><small>O cadastro seguro pode levar alguns segundos.</small><button type="button" onClick={() => window.location.reload()}>Atualizar cadastro</button></div></div>;
  return <div className="clerk-form-shell loaded"><SignUp routing="hash" signInUrl={`/sign-in?return_to=${encodeURIComponent(returnTo)}`} forceRedirectUrl={afterSignUp} appearance={{ elements: { socialButtonsBlockButton: { display: "none" }, dividerRow: { display: "none" } } }} /><div className="clerk-loading-card" role="status" aria-live="polite"><span></span><strong>Carregando o campo de e-mail…</strong><small>Se ele não aparecer, atualize o cadastro.</small><button type="button" onClick={() => window.location.reload()}>Atualizar cadastro</button></div></div>;
}

export default function SignUpPage() {
  const returnTo = typeof window === "undefined" ? "/" : new URLSearchParams(window.location.search).get("return_to") || "/";
  const initialRole = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("perfil");
  const [role, setRole] = useState<RegistrationRole | null>(initialRole === "fornecedor" ? "supplier" : initialRole === "instalador" ? "installer" : initialRole === "usuario" ? "client" : null);
  const afterSignUp = role === "installer" ? "/instaladores?cadastro=aberto" : returnTo === "/" ? `/?cadastro=${role === "supplier" ? "fornecedor" : "cliente"}` : returnTo;
  const { available } = useClerkAvailability();

  function chooseRole(nextRole: RegistrationRole) {
    setRole(nextRole);
    const search = new URLSearchParams(window.location.search);
    search.set("perfil", nextRole === "supplier" ? "fornecedor" : nextRole === "installer" ? "instalador" : "usuario");
    window.history.replaceState({}, "", `${window.location.pathname}?${search.toString()}${window.location.hash}`);
  }

  const roleLabel = role === "supplier" ? "fornecedor" : role === "installer" ? "instalador" : "usuário";
  return <main className="auth-page"><section className="auth-card"><a className="brand" href="/"><span className="brand-mark"><span></span><span></span><span></span></span><span>Hub <b>Brasil</b></span></a>{role === null ? <><h1>Como você quer participar?</h1><p>Escolha seu perfil para começar o cadastro no Hub Brasil.</p><div className="role-selector"><button type="button" onClick={() => chooseRole("client")}><strong>Sou usuário</strong><span>Quero encontrar, comparar e avaliar fornecedores</span></button><button type="button" onClick={() => chooseRole("supplier")}><strong>Sou fornecedor</strong><span>Quero divulgar minha empresa, produtos e eventos</span></button><button type="button" onClick={() => chooseRole("installer")}><strong>Sou instalador</strong><span>Quero divulgar meus serviços e regiões atendidas</span></button></div></> : <><button className="text-action" type="button" onClick={() => setRole(null)}>← Trocar perfil</button><h1>{role === "supplier" ? "Cadastre sua empresa" : role === "installer" ? "Cadastre-se como instalador" : "Crie seu acesso"}</h1><p>Confirme seu e-mail para continuar como {roleLabel}.</p>{available ? <ClerkSignUpForm returnTo={returnTo} afterSignUp={afterSignUp} /> : <div className="auth-unavailable" role="alert"><strong>O cadastro está temporariamente indisponível.</strong><span>Atualize a página para tentar carregar novamente.</span><button type="button" onClick={() => window.location.reload()}>Tentar novamente</button></div>}</>}</section></main>;
}
