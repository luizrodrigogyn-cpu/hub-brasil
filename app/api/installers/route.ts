import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { installers } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";
import { isValidBrazilState, normalizeBrazilState, type BrazilState } from "../../brazil-states";
import { encryptPii } from "../../pii-crypto";
import { ensurePersonalOrganization } from "../../tenant-context";

const SPECIALTIES = new Set([
  "Rastreador veicular", "Bloqueador", "Telemetria", "Videotelemetria",
  "Sensores e acessórios", "CAN / OBD", "Identificação de motorista", "Manutenção técnica",
]);

function stringArray(value: unknown, allowed?: Set<string>, limit = 27): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).map((item) => item.trim()).filter((item) => item && (!allowed || allowed.has(item))))].slice(0, limit);
}

function storedArray(value: string): string[] {
  try { return stringArray(JSON.parse(value || "[]")); } catch { return []; }
}

function publicInstaller(row: typeof installers.$inferSelect) {
  const specialties = stringArray(storedArray(row.specialties), SPECIALTIES, 8);
  const serviceStates = storedArray(row.serviceStates).filter((value): value is BrazilState => isValidBrazilState(value));
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    state: row.state,
    specialties,
    serviceStates,
    description: row.description,
    photoUrl: row.photoKey ? `/api/installer-photo?key=${encodeURIComponent(row.photoKey)}` : null,
    phonePreview: "WhatsApp protegido",
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().toLocaleLowerCase("pt-BR").slice(0, 80);
  const stateRaw = normalizeBrazilState(url.searchParams.get("state") || "");
  const state = isValidBrazilState(stateRaw) ? stateRaw : "";
  const city = (url.searchParams.get("city") || "").trim().toLocaleLowerCase("pt-BR").slice(0, 80);
  const specialty = (url.searchParams.get("specialty") || "").trim();
  const rows = await getDb().select().from(installers).where(and(eq(installers.status, "approved"), eq(installers.contactConsent, true)));
  const filtered = rows.map(publicInstaller).filter((item) => {
    if (state && item.state !== state && !item.serviceStates.includes(state)) return false;
    if (city && item.city.toLocaleLowerCase("pt-BR") !== city) return false;
    if (specialty && !item.specialties.includes(specialty)) return false;
    if (query && ![item.name, item.city, item.state, ...item.specialties].join(" ").toLocaleLowerCase("pt-BR").includes(query)) return false;
    return true;
  });
  return Response.json({ installers: filtered }, { headers: { "cache-control": "public, max-age=30, s-maxage=30", vary: "Cookie" } });
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return Response.json({ error: "Faça login para cadastrar seu perfil.", signIn: "/sign-in?return_to=/instaladores" }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const name = String(body.name || "").trim().slice(0, 120);
  const phone = String(body.phone || "").trim();
  const city = String(body.city || "").trim().slice(0, 100);
  const state = normalizeBrazilState(String(body.state || ""));
  const description = String(body.description || "").trim().slice(0, 800) || null;
  const specialties = stringArray(body.specialties, SPECIALTIES, 8);
  const serviceStates = stringArray(body.serviceStates, undefined, 27).map(normalizeBrazilState).filter(isValidBrazilState);
  const contactConsent = body.contactConsent === true;
  const termsConsent = body.termsConsent === true;
  const privacyConsent = body.privacyConsent === true;
  const noTransactionsConsent = body.noTransactionsConsent === true;
  if (!name || !phone || !city || !state || !specialties.length || !contactConsent || !termsConsent || !privacyConsent || !noTransactionsConsent) return Response.json({ error: "Informe os dados obrigatórios e confirme todos os termos do cadastro profissional." }, { status: 400 });
  if (!/^\d{10,11}$/.test(phone.replace(/\D/g, ""))) return Response.json({ error: "Informe um WhatsApp brasileiro válido com DDD." }, { status: 400 });
  if (!isValidBrazilState(state)) return Response.json({ error: "Informe uma UF brasileira válida." }, { status: 400 });
  const organizationId = await ensurePersonalOrganization(user.userId, name, "installer");
  const now = new Date().toISOString();
  const phoneEncrypted = await encryptPii(phone);
  if (!phoneEncrypted) return Response.json({ error: "Não foi possível proteger o WhatsApp." }, { status: 500 });
  const consentVersion = "2026-08-30";
  const consentSnapshot = JSON.stringify({ version: consentVersion, acceptedAt: now, terms: true, privacy: true, professionalPublication: true, authenticatedWhatsappRelease: true, noFinancialTransactions: true });
  const values = { organizationId, ownerUserId: user.userId, name, phone: "[encrypted]", phoneEncrypted, city, state, specialties: JSON.stringify(specialties), serviceStates: JSON.stringify(serviceStates), description, contactConsent: true, consentAt: now, consentVersion, consentSnapshot, status: "pending", phoneVerifiedAt: null, updatedAt: now };
  const [installer] = await getDb().insert(installers).values(values).onConflictDoUpdate({ target: installers.ownerUserId, set: values }).returning({ id: installers.id, status: installers.status });
  return Response.json({ installer }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getApiUser();
  if (!user) return Response.json({ error: "Faça login para editar seu perfil." }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const name = String(body.name || "").trim().slice(0, 120);
  const phone = String(body.phone || "").trim();
  const city = String(body.city || "").trim().slice(0, 100);
  const state = normalizeBrazilState(String(body.state || ""));
  const description = String(body.description || "").trim().slice(0, 800) || null;
  const specialties = stringArray(body.specialties, SPECIALTIES, 8);
  const serviceStates = stringArray(body.serviceStates, undefined, 27).map(normalizeBrazilState).filter(isValidBrazilState);
  if (!name || !phone || !city || !state || !specialties.length || !/^\d{10,11}$/.test(phone.replace(/\D/g, "")) || !isValidBrazilState(state)) return Response.json({ error: "Revise os dados obrigatórios do perfil." }, { status: 400 });
  const [current] = await getDb().select({ id: installers.id }).from(installers).where(eq(installers.ownerUserId, user.userId));
  if (!current) return Response.json({ error: "Perfil não encontrado." }, { status: 404 });
  const phoneEncrypted = await encryptPii(phone);
  if (!phoneEncrypted) return Response.json({ error: "Não foi possível proteger o WhatsApp." }, { status: 500 });
  await getDb().update(installers).set({ name, phone: "[encrypted]", phoneEncrypted, city, state, specialties: JSON.stringify(specialties), serviceStates: JSON.stringify(serviceStates), description, status: "pending", phoneVerifiedAt: null, updatedAt: new Date().toISOString() }).where(eq(installers.id, current.id));
  return Response.json({ ok: true });
}
