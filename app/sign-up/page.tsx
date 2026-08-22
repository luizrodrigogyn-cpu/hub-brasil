"use client";

import { SignUp } from "@clerk/react";

export default function SignUpPage() {
  const returnTo = typeof window === "undefined" ? "/" : new URLSearchParams(window.location.search).get("return_to") || "/";
  const afterSignUp = returnTo === "/" ? "/?cadastro=acessar" : returnTo;
  return <main className="auth-page"><section className="auth-card"><a className="brand" href="/"><span className="brand-mark"><span></span><span></span><span></span></span><span>Hub <b>Brasil</b></span></a><h1>Crie seu acesso</h1><p>Confirme seu e-mail com um código e, em seguida, escolha se deseja se cadastrar como usuário ou fornecedor.</p><SignUp routing="hash" signInUrl={`/sign-in?return_to=${encodeURIComponent(returnTo)}`} forceRedirectUrl={afterSignUp} /></section></main>;
}
