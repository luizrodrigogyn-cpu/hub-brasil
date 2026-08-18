import { getDb } from "../../../db";
import { leads } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";

export async function POST(request: Request) {
  try {
    const user = await getApiUser();
    if (!user) return Response.json({ error: "Faça login para continuar.", signIn: "/signin-with-chatgpt?return_to=/" }, { status: 401 });
    const body = await request.json() as Record<string, string>;
    const name = body.name?.trim();
    const phone = body.phone?.trim();
    const company = body.company?.trim() || null;
    const instagram = body.instagram?.trim() || null;
    const role = body.role === "supplier" ? "supplier" : "client";
    const category = body.category?.trim() || null;
    const city = body.city?.trim() || null;
    const state = body.state?.trim() || null;
    const description = body.description?.trim() || null;
    const logoConsent = body.logoConsent === "true";
    if (!name || !phone || (!company && !instagram)) return Response.json({ error: "Preencha nome, telefone e empresa ou Instagram." }, { status: 400 });
    if (!/^\d{10,11}$/.test(phone.replace(/\D/g, ""))) return Response.json({ error: "Informe um telefone brasileiro válido com DDD." }, { status: 400 });
    if (role === "supplier" && (!company || !category || !city || !state)) return Response.json({ error: "Fornecedor deve informar empresa, categoria, cidade e estado." }, { status: 400 });
    const values = { name, phone, company, instagram, role, authUserId: user.userId, email: user.email, status: role === "supplier" ? "pending" : "approved", category, city, state, description, logoConsentAt: role === "supplier" && logoConsent ? new Date().toISOString() : null };
    const [lead] = await getDb().insert(leads).values(values).onConflictDoUpdate({ target: leads.authUserId, set: { name, phone, company, instagram, role, email: user.email, category, city, state, description, logoConsentAt: role === "supplier" && logoConsent ? new Date().toISOString() : null, status: role === "supplier" ? "pending" : "approved", phoneVerifiedAt: null } }).returning();
    return Response.json({ lead }, { status: 201 });
  } catch { return Response.json({ error: "Não foi possível registrar o acesso." }, { status: 500 }); }
}
