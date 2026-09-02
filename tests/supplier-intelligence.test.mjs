import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("inteligência comercial usa no máximo três recomendações explicáveis", () => {
  assert.match(page, /const supplierInsights = \[/);
  assert.match(page, /\.filter\(Boolean\)\.slice\(0, 3\)/);
  assert.match(page, /Recomendações explicáveis, baseadas apenas nos seus dados reais/);
  assert.match(page, /match\.reasons\.join/);
  assert.doesNotMatch(page, /Math\.random\(\)/);
});

test("recomendações não duplicam oportunidades e usam catálogo e métricas reais", () => {
  const insights = page.slice(page.indexOf("const supplierInsights = ["), page.indexOf("].filter(Boolean).slice(0, 3)", page.indexOf("const supplierInsights = [")));
  assert.doesNotMatch(insights, /pendingSupplierOpportunities\[0\]/);
  assert.match(page, /uncoveredCategory/);
  assert.match(page, /supplierStats\?\.quoteResponses7d/);
  assert.match(page, /supplierStats\?\.quoteRequests7d/);
});

test("bloco de inteligência é responsivo e respeita movimento reduzido", () => {
  assert.match(css, /\.commercial-intelligence\{/);
  assert.match(css, /\.intelligence-grid\{display:grid/);
  assert.match(css, /@media\(max-width:900px\)\{\.intelligence-grid\{grid-template-columns:1fr\}/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\.intelligence-grid article\{transition:none\}\}/);
});
