"use client";

import { useEffect, useState } from "react";
import { reportTechnicalError } from "./error-reporter";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [errorId] = useState(() => error.digest || crypto.randomUUID());
  useEffect(() => {
    void reportTechnicalError({ errorId, message: error.message || "Erro global", stack: error.stack?.slice(0, 4000), source: "boundary" });
  }, [error, errorId]);
  return <html lang="pt-BR"><body><main className="error-fallback" role="alert"><div><h1>Não foi possível carregar esta tela.</h1><p>O erro foi registrado com segurança.</p><button type="button" onClick={reset}>Tentar novamente</button><a href="/">Ir para o início</a><small>Protocolo: {errorId}</small></div></main></body></html>;
}
