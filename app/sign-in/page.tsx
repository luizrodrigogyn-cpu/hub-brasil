"use client";

import { SignIn, useAuth } from "@clerk/react";
import { useEffect } from "react";
import { useClerkAvailability } from "../auth-provider";

function ClerkSignInForm({ returnTo }: { returnTo: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  useEffect(() => {
    if (isLoaded && isSignedIn) window.location.replace(returnTo);
  }, [isLoaded, isSignedIn, returnTo]);
  if (!isLoaded) return <div className="clerk-form-shell"><div className="clerk-loading-card static" role="status" aria-live="polite"><span></span><strong>Carregando o campo de e-mail…</strong><small>Se o formulário não aparecer, atualize esta página.</small><button type="button" onClick={() => window.location.reload()}>Atualizar acesso</button></div></div>;
  if (isSignedIn) return <div className="clerk-form-shell"><div className="clerk-loading-card static" role="status" aria-live="polite"><span></span><strong>Acesso confirmado.</strong><small>Direcionando você para o Hub Brasil…</small><button type="button" onClick={() => window.location.replace(returnTo)}>Continuar</button></div></div>;
  return <div className="clerk-form-shell loaded"><SignIn routing="hash" signUpUrl={`/sign-up?return_to=${encodeURIComponent(returnTo)}`} forceRedirectUrl={returnTo} appearance={{ elements: { socialButtonsBlockButton: { display: "none" }, dividerRow: { display: "none" } } }} /><div className="clerk-loading-card" role="status" aria-live="polite"><span></span><strong>Carregando o campo de e-mail…</strong><small>Se ele não aparecer, atualize o acesso.</small><button type="button" onClick={() => window.location.reload()}>Atualizar acesso</button></div></div>;
}

export default function SignInPage() {
  const returnTo = typeof window === "undefined" ? "/" : new URLSearchParams(window.location.search).get("return_to") || "/";
  const { available } = useClerkAvailability();
  return <main className="auth-page"><section className="auth-card auth-card-signin"><a className="brand" href="/"><span className="brand-mark"><span></span><span></span><span></span></span><span>Hub <b>Brasil</b></span></a><h1>Acesse o Hub Brasil</h1><p>Informe seu e-mail para receber um código de acesso. Não usamos senha.</p>{available ? <ClerkSignInForm returnTo={returnTo} /> : <div className="auth-unavailable" role="alert"><strong>O acesso está temporariamente indisponível.</strong><span>Atualize a página para tentar carregar novamente.</span><button type="button" onClick={() => window.location.reload()}>Tentar novamente</button></div>}<p className="manager-help">Gestor Master: se este for seu primeiro acesso ao Hub Brasil, use <a href={`/sign-up?perfil=usuario&return_to=${encodeURIComponent(returnTo)}`}>Registre-se</a> para criar o usuário nesta instância.</p></section></main>;
}
