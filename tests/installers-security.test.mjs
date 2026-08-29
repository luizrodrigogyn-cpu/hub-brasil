import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

test("cadastro de instalador não coleta CPF, endereço, orçamento ou pagamento", () => {
  const api = readFileSync("app/api/installers/route.ts", "utf8");
  for (const field of ["cpf", "address", "budget", "payment"]) assert.doesNotMatch(api, new RegExp(`body\\.${field}\\b`, "i"));
  assert.match(api, /encryptPii\(phone\)/);
  assert.match(api, /contactConsent/);
});

test("WhatsApp só é liberado por rota autenticada e sem cache", () => {
  const contact = readFileSync("app/api/installers/[id]/contact/route.ts", "utf8");
  assert.match(contact, /getApiUser/);
  assert.match(contact, /status: 401/);
  assert.match(contact, /private, no-store/);
  assert.match(contact, /eq\(installers\.status, "approved"\)/);
});

test("Worker impede enquadramento do site em páginas externas", () => {
  const worker = readFileSync("worker/index.ts", "utf8");
  assert.match(worker, /x-frame-options/);
  assert.match(worker, /DENY/);
});

test("foto do instalador exige login, consentimento e imagem real", () => {
  const photo = readFileSync("app/api/installer-photo/route.ts", "utf8");
  assert.match(photo, /getApiUser/);
  assert.match(photo, /photoConsent/);
  assert.match(photo, /matchesImageSignature/);
  assert.match(photo, /installer-photos\//);
  assert.match(photo, /status: "pending"/);
  assert.doesNotMatch(photo, /image\/svg\+xml/);
});

test("cadastros de fornecedor e instalador usam campo visual de WhatsApp", () => {
  const field = readFileSync("app/whatsapp-field.tsx", "utf8");
  const supplier = readFileSync("app/page.tsx", "utf8");
  const installer = readFileSync("app/instaladores/page.tsx", "utf8");
  assert.match(field, /whatsapp-icon/);
  assert.match(field, /formatBrazilPhone/);
  assert.match(field, /inputMode="tel"/);
  assert.match(supplier, /<WhatsAppField/);
  assert.match(installer, /<WhatsAppField/);
});

test("D1: apenas instaladores aprovados e consentidos entram no diretório", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE installers (id INTEGER PRIMARY KEY, name TEXT, status TEXT, contact_consent INTEGER, phone TEXT, phone_encrypted TEXT);
    INSERT INTO installers VALUES
      (1,'Aprovado','approved',1,'[encrypted]','enc:v1:segredo'),
      (2,'Pendente','pending',1,'[encrypted]','enc:v1:segredo'),
      (3,'Sem consentimento','approved',0,'[encrypted]','enc:v1:segredo');
  `);
  const rows = db.prepare("SELECT id,name,phone FROM installers WHERE status='approved' AND contact_consent=1").all();
  assert.deepEqual(rows.map((row) => ({ ...row })), [{ id: 1, name: "Aprovado", phone: "[encrypted]" }]);
});
