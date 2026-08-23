"use client";

import { SignIn } from "@clerk/react";

export default function SignInPage() {
  const returnTo = typeof window === "undefined" ? "/" : new URLSearchParams(window.location.search).get("return_to") || "/";
  return <main className="auth-page"><section className="auth-card auth-card-signin"><a className="brand" href="/"><span className="brand-mark"><span></span><span></span><span></span></span><span>Hub <b>Brasil</b></span></a><h1>Acesse o Hub Brasil</h1><p>Use seu e-mail para receber um código de acesso.</p><SignIn routing="hash" signUpUrl={`/sign-up?return_to=${encodeURIComponent(returnTo)}`} forceRedirectUrl={returnTo} appearance={{ elements: { socialButtonsBlockButton: { display: "none" }, dividerRow: { display: "none" } } }} /></section></main>;
}
