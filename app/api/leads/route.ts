import { getDb } from "../../../db";
import { leads, referrals } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";
import { isValidCnpj, normalizeCnpj } from "../../hub-credits";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const user = await getApiUser();
    if (!user) return Response.json({ error: "Faça login para continuar.", signIn: "/sign-in?return_to=/" }, { status: 401 });
    const body = await request.json() as Record<string, string>;
    const name = body.name?.trim();
    const phone = body.phone?.trim();
    const company = body.company?.trim() || null;
    const instagram = body.instagram?.trim() || null;
    const role = body.role === "supplier" ? "supplier" : "client";
    const category = body.category?.trim() || null;
    const selectedCategories = (() => { try { const parsed = JSON.parse(body.categories || "[]"); return Array.isArray(parsed) ? [...new Set(parsed.map(String).map((item) => item.trim()).filter(Boolean))].slice(0, 12) : []; } catch { return []; } })();
    const city = body.city?.trim() || null;
    const state = body.state?.trim() || null;
    const description = body.description?.trim() || null;
    const cnpj = body.cnpj?.trim() || null;
    const cnpjNormalized = cnpj ? normalizeCnpj(cnpj) : null;
    const referralCode = body.referralCode?.trim().toUpperCase() || null;
    const logoConsent = body.logoConsent === "true";
    if (!name || !phone || (!company && !instagram)) return Response.json({ error: "Preencha nome, telefone e empresa ou Instagram." }, { status: 400 });
    if (!/^\d{10,11}$/.test(phone.replace(/\D/g, ""))) return Response.json({ error: "Informe um telefone brasileiro válido com DDD." }, { status: 400 });
    if (role === "supplier" && (!company || !category || !selectedCategories.length || !city || !state || !cnpj)) return Response.json({ error: "Fornecedor deve informar empresa, CNPJ, ao menos uma solução, cidade e estado." }, { status: 400 });
    if (role === "supplier" && !isValidCnpj(cnpj || "")) return Response.json({ error: "Informe um CNPJ com dígitos válidos. Esta validação não confirma a situação oficial da empresa." }, { status: 400 });
    const db = getDb();
    const [current] = await db.select({ id: leads.id }).from(leads).where(eq(leads.authUserId, user.userId));
    if (role === "supplier" && cnpjNormalized) {
      const [duplicate] = await db.select({ id: leads.id }).from(leads).where(eq(leads.cnpjNormalized, cnpjNormalized));
      if (duplicate && duplicate.id !== current?.id) return Response.json({ error: "Este CNPJ já possui cadastro no Hub Brasil." }, { status: 409 });
    }
    const categories = role === "supplier" ? JSON.stringify(selectedCategories) : null;
    const values = { name, phone, company, instagram, role, authUserId: user.userId, email: user.email, status: role === "supplier" ? "pending" : "approved", category, categories, city, state, description, cnpj, cnpjNormalized, cnpjValidationStatus: role === "supplier" ? "checksum_valid" : "not_informed", logoConsentAt: role === "supplier" && logoConsent ? new Date().toISOString() : null };
    const [lead] = await db.insert(leads).values(values).onConflictDoUpdate({ target: leads.authUserId, set: { name, phone, company, instagram, role, email: user.email, category, categories, city, state, description, cnpj, cnpjNormalized, cnpjValidationStatus: role === "supplier" ? "checksum_valid" : "not_informed", logoConsentAt: role === "supplier" && logoConsent ? new Date().toISOString() : null, status: role === "supplier" ? "pending" : "approved", phoneVerifiedAt: null } }).returning();
    if (role === "supplier" && referralCode) {
      const [referrer] = await db.select().from(leads).where(eq(leads.referralCode, referralCode));
      if (referrer && referrer.id !== lead.id && referrer.role === "supplier" && referrer.status === "approved" && referrer.cnpjNormalized !== cnpjNormalized) {
        await db.insert(referrals).values({ referrerSupplierId: referrer.id, referredSupplierId: lead.id, referralCode }).onConflictDoNothing();
      }
    }
    return Response.json({ lead }, { status: 201 });
  } catch { return Response.json({ error: "Não foi possível registrar o acesso." }, { status: 500 }); }
}
