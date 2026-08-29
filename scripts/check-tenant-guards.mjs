import { readFileSync } from "node:fs";

const tenantRoutes = [
  "app/api/community/route.ts",
  "app/api/events/route.ts",
  "app/api/leads/route.ts",
  "app/api/match/route.ts",
  "app/api/messages/route.ts",
  "app/api/products/route.ts",
  "app/api/profile-photo/route.ts",
  "app/api/ratings/route.ts",
  "app/api/roadmap/route.ts",
  "app/api/supplier-logo/route.ts",
];
const adminRoutes = [
  "app/api/admin/content/route.ts",
  "app/api/admin/features/route.ts",
  "app/api/admin/kpis/route.ts",
  "app/api/admin/leads.csv/route.ts",
  "app/api/admin/login-metrics/route.ts",
];

const failures = [];
for (const file of tenantRoutes) {
  const source = readFileSync(file, "utf8");
  if (!source.includes("getTenantContext")) failures.push(`${file}: sem contexto obrigatório de organização`);
}
for (const file of adminRoutes) {
  const source = readFileSync(file, "utf8");
  if (!/(isHubAdmin|adminAccessState|requireHubAdmin)/.test(source)) failures.push(`${file}: sem gate de Gestor Master/2FA`);
}
const leadSource = readFileSync("app/api/leads/route.ts", "utf8");
for (const field of ["phoneEncrypted", "emailEncrypted", "addressEncrypted", "cnpjEncrypted", "instagramEncrypted"]) {
  if (!leadSource.includes(field)) failures.push(`leads: campo ${field} não é cifrado na gravação`);
}
const installerSource = readFileSync("app/api/installers/route.ts", "utf8");
if (!installerSource.includes("phoneEncrypted") || !installerSource.includes("encryptPii(phone)")) failures.push("installers: WhatsApp não é cifrado na gravação");
for (const forbidden of ["cpf", "budget", "payment", "address"]) {
  if (new RegExp(`body\\.${forbidden}\\b`, "i").test(installerSource)) failures.push(`installers: campo proibido ${forbidden} encontrado no cadastro`);
}
const contactSource = readFileSync("app/api/installers/[id]/contact/route.ts", "utf8");
if (!contactSource.includes("getApiUser")) failures.push("installers: liberação de WhatsApp sem autenticação");
if (failures.length) {
  console.error(`Gate de isolamento reprovado:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`Gate de isolamento aprovado: ${tenantRoutes.length} rotas por tenant, ${adminRoutes.length} rotas administrativas e gravação cifrada conferidas.`);
