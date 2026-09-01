import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const analytics = readFileSync(new URL("../app/api/analytics/route.ts", import.meta.url), "utf8");
const kpis = readFileSync(new URL("../app/api/admin/kpis/route.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const admin = readFileSync(new URL("../app/admin/AdminDashboard.tsx", import.meta.url), "utf8");

test("medição aceita somente eventos funcionais previamente permitidos", () => {
  assert.match(analytics, /supplierJourneyKinds = new Set/);
  assert.match(analytics, /Evento não permitido/);
  assert.doesNotMatch(analytics, /body\.(email|phone|name|ip|metadata)/);
});

test("identidade e fornecedor são derivados da sessão, nunca do corpo", () => {
  assert.match(analytics, /actorUserId: user\.userId/);
  assert.match(analytics, /supplierId: context\?\.profile\?\.role === "supplier" \? context\.profile\.id : null/);
  assert.match(analytics, /gte\(activityEvents\.createdAt, since\)/);
});

test("jornada cobre cadastro, cockpit, produto e oportunidade", () => {
  for (const kind of ["supplier_registration_started", "supplier_registration_completed", "supplier_dashboard_view", "supplier_product_started", "supplier_product_created", "supplier_opportunity_opened"]) {
    assert.match(analytics, new RegExp(kind));
  }
  assert.match(page, /trackSupplierJourney\("supplier_dashboard_view"\)/);
  assert.match(page, /openSupplierOpportunity/);
  assert.match(page, /openSupplierProductForm/);
});

test("gestão recebe contagens reais e taxa só com amostra mínima", () => {
  assert.match(kpis, /gte\(activityEvents\.createdAt, since30d\)/);
  assert.match(kpis, /registrationStarted >= MIN_SAMPLE/);
  assert.match(admin, /Jornada do fornecedor/);
  assert.match(admin, /amostra pequena/);
});
