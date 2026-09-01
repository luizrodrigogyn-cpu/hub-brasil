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

test("todos os uploads de imagem validam a assinatura real do arquivo", () => {
  const profile = readFileSync("app/api/profile-photo/route.ts", "utf8");
  const supplier = readFileSync("app/api/supplier-logo/route.ts", "utf8");
  const helper = readFileSync("app/image-security.ts", "utf8");
  assert.match(profile, /matchesImageSignature/);
  assert.match(supplier, /matchesImageSignature/);
  assert.match(helper, /image\/jpeg/);
  assert.match(helper, /image\/png/);
  assert.match(helper, /image\/webp/);
  assert.doesNotMatch(helper, /image\/svg\+xml/);
});

test("rota de imagens mantém produto pendente privado e libera prévia apenas ao gestor", () => {
  const api = readFileSync("app/api/product-images/route.ts", "utf8");
  assert.match(api, /eq\(products\.imageKey, key\)/);
  assert.match(api, /isHubAdmin/);
  assert.match(api, /product\.status !== "approved" && !adminPreview/);
  assert.match(api, /private, no-store/);
});

test("fornecedor pendente prepara produtos sem publicá-los antes da gestão", () => {
  const api = readFileSync("app/api/products/route.ts", "utf8");
  const page = readFileSync("app/page.tsx", "utf8");
  assert.match(api, /supplier\.status === "rejected"/);
  assert.match(api, /status: "pending"/);
  assert.match(page, /Cadastrar primeiro produto/);
  assert.match(page, /será publicado depois da aprovação da gestão/);
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

test("lista de usuários fica restrita ao gestor e descriptografa o telefone no servidor", () => {
  const api = readFileSync("app/api/admin/content/route.ts", "utf8");
  const dashboard = readFileSync("app/admin/AdminDashboard.tsx", "utf8");
  assert.match(api, /adminAccessState/);
  assert.match(api, /state !== "granted"/);
  assert.match(api, /registrations/);
  assert.match(api, /decryptPii\(item\.phoneEncrypted/);
  assert.match(dashboard, /Usuários cadastrados/);
  assert.match(dashboard, /Fornecedor/);
  assert.match(dashboard, /Usuário/);
});

test("instaladores ficam somente na lista própria do gestor", () => {
  const api = readFileSync("app/api/admin/content/route.ts", "utf8");
  assert.match(api, /const installerOwnerIds = new Set\(installerRows\.map\(\(item\) => item\.ownerUserId\)\)/);
  assert.equal((api.match(/!installerOwnerIds\.has\(item\.authUserId\)/g) || []).length, 2);
});

test("fluxo de cadastro preserva o perfil instalador e retorna ao formulário", () => {
  const signup = readFileSync("app/sign-up/page.tsx", "utf8");
  const directory = readFileSync("app/instaladores/page.tsx", "utf8");
  assert.match(signup, /"client" \| "supplier" \| "installer"/);
  assert.match(signup, /Sou instalador/);
  assert.match(signup, /initialRole === "instalador"/);
  assert.match(directory, /perfil=instalador/);
  assert.match(directory, /cadastro=aberto/);
  assert.match(directory, /setFormOpen\(true\)/);
});

test("aceites do instalador são obrigatórios e versionados no servidor", () => {
  const api = readFileSync("app/api/installers/route.ts", "utf8");
  const form = readFileSync("app/instaladores/page.tsx", "utf8");
  const migration = readFileSync("drizzle/0025_installer_consent_snapshot.sql", "utf8");
  for (const consent of ["termsConsent", "privacyConsent", "noTransactionsConsent", "contactConsent"]) {
    assert.match(api, new RegExp(consent));
    assert.match(form, new RegExp(consent));
  }
  assert.match(api, /consentVersion/);
  assert.match(api, /consentSnapshot/);
  assert.match(migration, /consent_version/);
  assert.match(migration, /consent_snapshot/);
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

test("gestor revisa logo e controla o destaque estadual do fornecedor no mapa", () => {
  const admin = readFileSync("app/admin/AdminDashboard.tsx", "utf8");
  const api = readFileSync("app/api/admin/content/route.ts", "utf8");
  const suppliers = readFileSync("app/api/suppliers/route.ts", "utf8");
  assert.match(admin, /api\/supplier-logo\?key=/);
  assert.match(admin, /☆ Destacar/);
  assert.match(admin, /remove_map_highlight/);
  assert.match(api, /body\.action === "highlight_map"/);
  assert.match(api, /state: supplier\.state/);
  assert.match(suppliers, /highlightedOnMap: highlightMap\.has/);
});

test("mapa usa marcador em gota para a logo e separa fornecedores da mesma UF", () => {
  const page = readFileSync("app/page.tsx", "utf8");
  const css = readFileSync("app/globals.css", "utf8");
  assert.match(page, /stateOccurrence/);
  assert.match(page, /mapPoint\(item\.state, stateOccurrence\)/);
  assert.match(css, /border-radius:50% 50% 50% 0/);
  assert.match(css, /object-fit:contain/);
});

test("mapa exibe empresa, mas protege produtos e WhatsApp ate o cadastro", () => {
  const page = readFileSync("app/page.tsx", "utf8");
  const css = readFileSync("app/globals.css", "utf8");
  const suppliers = readFileSync("app/api/suppliers/route.ts", "utf8");
  const products = readFileSync("app/api/products/route.ts", "utf8");
  assert.match(page, /selectedMapSupplier/);
  assert.match(page, /supplier-map-popover/);
  assert.match(page, /PRODUTOS E SOLUÇÕES/);
  assert.match(page, /slice\(0, 3\)/);
  assert.match(page, /Ver perfil e produtos/);
  assert.match(page, /registered \? "Ver perfil e produtos →" : "Cadastre-se para ver produtos e WhatsApp →"/);
  assert.match(page, /Cadastre-se para ver produtos, detalhes e WhatsApp/);
  assert.match(suppliers, /return viewer \? base : \{ id: item\.id, name: item\.name/);
  assert.match(suppliers, /phone: null, instagram: null, website: null/);
  assert.match(products, /supplierPhone: viewer \? supplier\?\.phone \|\| null : null/);
  assert.match(products, /specs: viewer \? specs : null/);
  assert.match(css, /\.supplier-map-popover\{/);
});

test("gestor revisa fotos e aprova produtos em lote sem expor pendentes", () => {
  const admin = readFileSync("app/admin/AdminDashboard.tsx", "utf8");
  const api = readFileSync("app/api/admin/content/route.ts", "utf8");
  const images = readFileSync("app/api/product-images/route.ts", "utf8");
  assert.match(admin, /approveSelectedProducts/);
  assert.match(admin, /Aprovar selecionados/);
  assert.match(admin, /product-review-photo/);
  assert.match(admin, /setPreviewProduct/);
  assert.match(admin, /PRÉVIA PARA A GESTÃO/);
  assert.match(admin, /parseProductSpecs/);
  assert.match(admin, /Descrição técnica/);
  assert.match(admin, /Homologado ANATEL/);
  assert.match(admin, /Manual técnico/);
  assert.match(api, /approve_many/);
  assert.match(api, /slice\(0, 50\)/);
  assert.match(api, /product\.supplierId/);
  assert.match(api, /supplierId: supplier\.id/);
  assert.match(images, /isHubAdmin/);
  assert.match(images, /private, no-store/);
});
