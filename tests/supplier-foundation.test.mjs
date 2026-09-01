import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const leadsRoute = fs.readFileSync(new URL("../app/api/leads/route.ts", import.meta.url), "utf8");
const baseline = fs.readFileSync(new URL("../docs/experiencia-fornecedor-baseline.md", import.meta.url), "utf8");

test("Bloco A documenta a baseline sem migração destrutiva", () => {
  assert.match(baseline, /não exige migração de banco/i);
  assert.match(baseline, /nenhum registro, ID ou coluna existente será removido/i);
  assert.match(baseline, /organização e propriedade no servidor/i);
});

test("entrada do fornecedor apresenta proposta curta e três benefícios", () => {
  assert.match(page, /Coloque sua empresa na frente de quem está procurando soluções para rastreamento, telemetria e IoT/);
  assert.match(page, /Cadastrar minha empresa/);
  assert.match(page, /Ganhe visibilidade/);
  assert.match(page, /Receba oportunidades/);
  assert.match(page, /Construa reputação/);
});

test("cadastro inicial do fornecedor mantém apenas os dados essenciais obrigatórios", () => {
  assert.match(page, /Cadastro essencial/);
  assert.match(page, /O que sua empresa oferece\?/);
  assert.match(page, /Logo da empresa <small>Opcional/);
  assert.doesNotMatch(page, /registrationRole === "supplier"[^\n]*<label>CNPJ<input name="cnpj" required/);
  assert.match(leadsRoute, /Fornecedor deve informar empresa, WhatsApp, ao menos uma solução, cidade e estado/);
  assert.match(leadsRoute, /role === "supplier" && cnpj && !isValidCnpj/);
  assert.match(leadsRoute, /cadastro=fornecedor/);
});

test("pós-cadastro informa curadoria antes de sugerir o primeiro produto", () => {
  const reward = page.indexOf("Sua empresa entrou para o Hub Brasil");
  const effort = page.indexOf("Adicione seu primeiro produto");
  assert.ok(reward >= 0 && effort > reward);
  assert.match(page, /Seu perfil agora está em análise/);
  assert.match(page, /Ver meu perfil/);
});
