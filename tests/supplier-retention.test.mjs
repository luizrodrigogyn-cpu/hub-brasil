import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/roadmap/route.ts", import.meta.url), "utf8");

test("Hub Créditos usa carteira e histórico reais com linguagem B2B", () => {
  assert.match(page, /Visibilidade conquistada/);
  assert.match(page, /dashboard\.credits\?\.wallet\?\.availableBalance/);
  assert.match(page, /supplierCreditEntries\.slice\(0, 10\)/);
  assert.match(page, /sem valor monetário/);
  assert.doesNotMatch(page, /confete|moedas voando/i);
});

test("Performance fica fora do cockpit e usa métricas reais de 7 e 30 dias", () => {
  assert.match(page, /view === "supplier-performance"/);
  for (const field of ["quoteRequests7d", "quoteResponses7d", "responseRate7d", "avgResponseMinutes7d", "quoteRequests30d", "product_view"]) assert.ok(page.includes(field));
  assert.match(route, /since7d/);
  assert.match(route, /since30d/);
});

test("Bloco D é aditivo e mantém retorno ao cockpit", () => {
  assert.match(page, /Voltar ao painel/);
  assert.match(page, /Somente ações reais registradas na plataforma/);
});
