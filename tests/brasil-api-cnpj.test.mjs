import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { clearCompanyLookupCache, lookupCompanyByCnpj } from "../app/brasil-api.ts";

const validCnpj = "19.131.243/0001-97";

test("BrasilAPI preenche somente os dados cadastrais úteis e reutiliza o cache", async () => {
  clearCompanyLookupCache();
  let requests = 0;
  const fetcher = async () => {
    requests += 1;
    return Response.json({
      razao_social: "Empresa Exemplo Ltda",
      nome_fantasia: "Empresa Exemplo",
      municipio: "Goiânia",
      uf: "GO",
      descricao_situacao_cadastral: "ATIVA",
      logradouro: "Avenida Brasil",
      numero: "100",
      bairro: "Centro",
      cep: "74000000",
      qsa: [{ nome_socio: "dado que não deve sair do endpoint" }],
    });
  };

  const first = await lookupCompanyByCnpj(validCnpj, { fetcher });
  const second = await lookupCompanyByCnpj(validCnpj, { fetcher });
  assert.equal(first.company.company, "Empresa Exemplo");
  assert.equal(first.company.city, "Goiânia");
  assert.equal(first.company.registrationStatus, "ATIVA");
  assert.equal("qsa" in first.company, false);
  assert.equal(second.cached, true);
  assert.equal(requests, 1);
});

test("429 e falha de rede viram indisponibilidade controlada", async () => {
  clearCompanyLookupCache();
  await assert.rejects(
    lookupCompanyByCnpj(validCnpj, { fetcher: async () => new Response(null, { status: 429 }) }),
    /provider_unavailable/,
  );
  await assert.rejects(
    lookupCompanyByCnpj(validCnpj, { fetcher: async () => { throw new Error("timeout"); } }),
    /provider_unavailable/,
  );
});

test("formulário mantém fallback manual e aprovação independente", () => {
  const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const leadsRoute = fs.readFileSync(new URL("../app/api/leads/route.ts", import.meta.url), "utf8");
  assert.match(page, /Empresa encontrada — dados preenchidos automaticamente/);
  assert.match(page, /A consulta externa não bloqueia seu cadastro/);
  assert.match(page, /await lookupCompanyByCnpj\(cnpj\)/);
  assert.match(page, /name="company" required/);
  assert.match(page, /name="city" required/);
  assert.match(leadsRoute, /status: role === "supplier" \? "pending" : "approved"/);
});
