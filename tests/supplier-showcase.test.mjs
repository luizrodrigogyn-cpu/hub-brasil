import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const productsRoute = readFileSync(new URL("../app/api/products/route.ts", import.meta.url), "utf8");

test("perfil público premium mantém confiança, catálogo, região, avaliações e cotação", () => {
  assert.match(page, /premium-profile-hero/);
  assert.match(page, /Fornecedor verificado/);
  assert.match(page, /Catálogo de produtos/);
  assert.match(page, /Área de atendimento/);
  assert.match(page, /avaliações verificadas/);
  assert.match(page, /Solicitar cotação estruturada/);
});

test("perfil progressivo mostra uma única próxima ação positiva", () => {
  assert.match(page, /Seu perfil está \{supplierCompleteness\}% completo/);
  assert.match(page, /Uma melhoria de cada vez/);
  assert.match(page, /supplierProfileNextAction/);
  assert.match(page, /PRÓXIMO PASSO/);
});

test("cadastro rápido exige somente nome, categoria e descrição curta", () => {
  assert.match(page, /Cadastre um produto em 1 minuto/);
  assert.match(page, /name="shortDescription"/);
  assert.match(page, /Quer deixar este produto mais completo/);
  assert.doesNotMatch(page, /name="technicalDetails"[^>]*required/);
  assert.match(productsRoute, /!values\.name \|\| !values\.category \|\| !shortDescription/);
  assert.match(productsRoute, /status: "pending"/);
});

test("campos avançados continuam disponíveis e opcionais", () => {
  for (const label of ["Especificações técnicas", "Aplicação", "Diferenciais", "Manual técnico", "Ficha técnica \\(opcional\\)"]) assert.match(page, new RegExp(label));
});
