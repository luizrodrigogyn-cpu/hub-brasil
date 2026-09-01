import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("cockpit limita a home aos quatro indicadores comerciais", () => {
  for (const label of ["OPORTUNIDADES", "INTERAÇÕES", "TAXA DE RESPOSTA", "HUB CRÉDITOS"]) assert.ok(page.includes(label));
  const start = page.indexOf('className="cockpit-kpis"');
  const cockpitKpis = page.slice(start, page.indexOf('className="for-you-section"', start));
  assert.equal((cockpitKpis.match(/<article(?:\s|>)/g) || []).length, 4);
});

test("Para você seleciona no máximo três ações prioritárias", () => {
  assert.ok(page.includes("].filter(Boolean).slice(0, 3)"));
  assert.ok(page.includes("As ações mais importantes para gerar negócios agora."));
});

test("feed comercial reutiliza o motor de compatibilidade e protege a ação existente", () => {
  assert.ok(page.includes("calculateCommercialMatch"));
  assert.ok(page.includes("matchScore(supplier"));
  assert.ok(page.includes("Tenho interesse"));
  assert.ok(page.includes('respondQuote(selectedOpportunity.id, "responded")'));
  assert.ok(page.includes("Quantidade"));
  assert.ok(page.includes("Localização"));
  assert.ok(page.includes("Prazo"));
  assert.ok(page.includes("Aplicação"));
});
