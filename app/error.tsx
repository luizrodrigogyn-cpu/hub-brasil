"use client";

import { useEffect, useState } from "react";
import { reportTechnicalError } from "./error-reporter";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [errorId] = useState(() => error.digest || crypto.randomUUID());

  useEffect(() => {
    void reportTechnicalError({
      errorId,
      message: error.message || "Erro inesperado na interface",
      stack: error.stack?.slice(0, 4000),
      source: "boundary",
    });
  }, [error, errorId]);

  return <main className="error-fallback" role="alert">
    <div>
      <span>Hub Brasil</span>
      <h1>Algo não saiu como esperado.</h1>
      <p>O problema já foi registrado. Você pode tentar novamente sem perder o acesso ao site.</p>
      <button type="button" onClick={reset}>Tentar novamente</button>
      <a href="/">Voltar para o início</a>
      <small>Protocolo: {errorId}</small>
    </div>
  </main>;
}
