import { getDb } from "../../../db";
import { leads, referrals } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";
import { isValidCnpj, normalizeCnpj } from "../../hub-credits";
import { isValidBrazilState, normalizeBrazilState } from "../../brazil-states";
import { and, eq } from "drizzle-orm";
import { ensurePersonalOrganization, getTenantContext } from "../../tenant-context";
import { blindIndex, decryptLeadPii, encryptPii } from "../../pii-crypto";

export async function POST(request: Request) {
  try {
    const user = await getApiUser();
    if (!user) return Response.json({ error: "Faça login para continuar.", signIn: "/sign-in?return_to=/" }, { status: 401 });
    const body = await request.json() as Record<string, string>;
    const name = body.name?.trim();
    const phone = body.phone?.trim();
    const company = body.company?.trim() || null;
    const instagram = body.instagram?.trim() || null;
    const websiteRawInput = body.website?.trim() || "";
    // Mesma normalização do PATCH: evita salvar sem protocolo e o link quebrar depois.
    const website = websiteRawInput ? (websiteRawInput.startsWith("http://") || websiteRawInput.startsWith("https://") ? websiteRawInput : `https://${websiteRawInput}`) : null;
    const role = body.role === "supplier" ? "supplier" : "client";
    const address = body.address?.trim();
    const category = body.category?.trim() || null;
    const selectedCategories = (() => { try { const parsed = JSON.parse(body.categories || "[]"); return Array.isArray(parsed) ? [...new Set(parsed.map(String).map((item) => item.trim()).filter(Boolean))].slice(0, 12) : []; } catch { return []; } })();
    const city = body.city?.trim() || null;
    const stateRaw = body.state?.trim() || null;
    const state = stateRaw ? normalizeBrazilState(stateRaw) : null;
    const description = body.description?.trim() || null;
    const cnpj = body.cnpj?.trim() || null;
    const cnpjNormalized = cnpj ? normalizeCnpj(cnpj) : null;
    const cnpjBlindIndex = await blindIndex(cnpjNormalized);
    const referralCode = body.referralCode?.trim().toUpperCase() || null;
    const logoConsent = body.logoConsent === "true";
    if (!name || !phone || !address) return Response.json({ error: "Preencha nome, telefone e endereço." }, { status: 400 });
    if (!/^\d{10,11}$/.test(phone.replace(/\D/g, ""))) return Response.json({ error: "Informe um telefone brasileiro válido com DDD." }, { status: 400 });
    if (role === "supplier" && (!company || !category || !selectedCategories.length || !city || !state || !cnpj)) return Response.json({ error: "Fornecedor deve informar empresa, CNPJ, ao menos uma solução, cidade e estado." }, { status: 400 });
    if (role === "supplier" && !isValidBrazilState(state || "")) return Response.json({ error: "Informe uma UF brasileira válida (ex.: SP, RJ, MG)." }, { status: 400 });
    if (role === "supplier" && !isValidCnpj(cnpj || "")) return Response.json({ error: "Informe um CNPJ com dígitos válidos. Esta validação não confirma a situação oficial da empresa." }, { status: 400 });
    if (role === "client" && cnpj && !isValidCnpj(cnpj)) return Response.json({ error: "O CNPJ informado não possui dígitos válidos." }, { status: 400 });
    const db = getDb();
    const organizationId = await ensurePersonalOrganization(user.userId, company || name, role);
    const [current] = await db.select({ id: leads.id }).from(leads).where(eq(leads.authUserId, user.userId));
    if (role === "supplier" && cnpjNormalized) {
      const [duplicate] = await db.select({ id: leads.id }).from(leads).where(eq(leads.cnpjBlindIndex, cnpjBlindIndex!));
      if (duplicate && duplicate.id !== current?.id) return Response.json({ error: "Este CNPJ já possui cadastro no Hub Brasil." }, { status: 409 });
    }
    const categories = role === "supplier" ? JSON.stringify(selectedCategories) : null;
    const encrypted = { phoneEncrypted: await encryptPii(phone), instagramEncrypted: await encryptPii(instagram), emailEncrypted: await encryptPii(user.email), addressEncrypted: await encryptPii(address), cnpjEncrypted: await encryptPii(cnpj) };
    const values = { name, phone: "[encrypted]", ...encrypted, company, instagram: null, website, role, organizationId, authUserId: user.userId, email: null, address: null, status: role === "supplier" ? "pending" : "approved", category, categories, city, state, description, cnpj: null, cnpjNormalized: null, cnpjBlindIndex, cnpjValidationStatus: cnpj ? "checksum_valid" : "not_informed", logoConsentAt: role === "supplier" && logoConsent ? new Date().toISOString() : null };
    const [lead] = await db.insert(leads).values(values).onConflictDoUpdate({ target: leads.authUserId, set: { name, phone: "[encrypted]", ...encrypted, company, instagram: null, website, role, email: null, address: null, category, categories, city, state, description, cnpj: null, cnpjNormalized: null, cnpjBlindIndex, cnpjValidationStatus: cnpj ? "checksum_valid" : "not_informed", logoConsentAt: role === "supplier" && logoConsent ? new Date().toISOString() : null, status: role === "supplier" ? "pending" : "approved", phoneVerifiedAt: null } }).returning();
    if (role === "supplier" && referralCode) {
      const [referrer] = await db.select().from(leads).where(eq(leads.referralCode, referralCode));
      if (referrer && referrer.id !== lead.id && referrer.role === "supplier" && referrer.status === "approved" && referrer.cnpjBlindIndex !== cnpjBlindIndex) {
        await db.insert(referrals).values({ referrerSupplierId: referrer.id, referredSupplierId: lead.id, referralCode }).onConflictDoNothing();
      }
    }
    return Response.json({ lead: await decryptLeadPii(lead) }, { status: 201 });
  } catch { return Response.json({ error: "Não foi possível registrar o acesso." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return Response.json({ error: "Faça login para editar sua empresa." }, { status: 401 });
    const { user, organizationId } = tenant;
    const body = await request.json() as Record<string, unknown>;
    const db = getDb();
    const [profile] = await db.select().from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.organizationId, organizationId)));
    if (!profile || profile.role !== "supplier") return Response.json({ error: "Apenas fornecedores podem editar a empresa." }, { status: 403 });
    const company = String(body.company || "").trim();
    const phone = String(body.phone || "").trim();
    const instagram = String(body.instagram || "").trim() || null;
    const websiteRaw = String(body.website || "").trim();
    const website = websiteRaw ? (websiteRaw.startsWith("http://") || websiteRaw.startsWith("https://") ? websiteRaw : `https://${websiteRaw}`) : null;
    const address = String(body.address || "").trim();
    const city = String(body.city || "").trim();
    const state = normalizeBrazilState(String(body.state || ""));
    const description = String(body.description || "").trim().slice(0, 1500) || null;
    if (!company || !phone || !address || !city || !state) return Response.json({ error: "Informe empresa, telefone, endereço, cidade e estado." }, { status: 400 });
    if (!/^\d{10,11}$/.test(phone.replace(/\D/g, ""))) return Response.json({ error: "Informe um telefone brasileiro válido com DDD." }, { status: 400 });
    if (!isValidBrazilState(state)) return Response.json({ error: "Informe uma UF brasileira válida (ex.: SP, RJ, MG)." }, { status: 400 });
    const categories = Array.isArray(body.categories) ? [...new Set(body.categories.map(String).map((item) => item.trim()).filter(Boolean))].slice(0, 12) : JSON.parse(profile.categories || "[]");
    if (!categories.length) return Response.json({ error: "Selecione ao menos uma solução." }, { status: 400 });
    await db.update(leads).set({ company, phone: "[encrypted]", phoneEncrypted: await encryptPii(phone), instagram: null, instagramEncrypted: await encryptPii(instagram), website, address: null, addressEncrypted: await encryptPii(address), city, state, description, category: categories[0], categories: JSON.stringify(categories), updatedAt: new Date().toISOString() }).where(eq(leads.id, profile.id));
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Não foi possível salvar as alterações." }, { status: 500 }); }
}
