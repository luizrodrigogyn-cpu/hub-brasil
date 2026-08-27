"use client";

import { useState } from "react";

type ErrorPayload = {
  errorId?: string;
  message: string;
  source: "boundary" | "user";
  path?: string;
  stack?: string;
  details?: string;
};

export async function reportTechnicalError(payload: ErrorPayload) {
  try {
    await fetch("/api/error-reports", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...payload,
        path: payload.path || window.location.pathname,
        userAgent: navigator.userAgent.slice(0, 300),
      }),
      keepalive: true,
    });
  } catch {
    // O relatório não pode causar um segundo erro para o visitante.
  }
}

export default function ErrorReporterButton() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  async function report() {
    const details = window.prompt("Conte em poucas palavras o que aconteceu. Não informe senha nem código de acesso.", "");
    if (details === null) return;
    setState("sending");
    const errorId = crypto.randomUUID();
    await reportTechnicalError({ errorId, message: "Relato enviado pelo visitante", source: "user", details: details.slice(0, 1000) });
    setState("sent");
    window.setTimeout(() => setState("idle"), 4000);
  }

  return <button className="error-report-button" type="button" onClick={report} disabled={state === "sending"} aria-label="Reportar problema técnico">
    {state === "sending" ? "Enviando…" : state === "sent" ? "Relato enviado ✓" : "Reportar problema"}
  </button>;
}
