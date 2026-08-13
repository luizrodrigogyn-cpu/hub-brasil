import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { leads, moderationAudit, products, supplierEvents } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { isAdminEmail } from "../../../admin-auth";

async function authorized() { const user = await getChatGPTUser(); return user && isAdminEmail(user.email); }

export async function GET() {
  if (!(await authorized())) return Response.json({ error: "Acesso restrito ao gestor." }, { status: 403 });
  const db = getDb();
  const [suppliers, productRows, events, audit] = await Promise.all([
    db.select().from(leads).where(eq(leads.role, "supplier")).orderBy(desc(leads.createdAt)),
    db.select().from(products).orderBy(desc(products.createdAt)),
    db.select().from(supplierEvents).orderBy(desc(supplierEvents.createdAt)),
    db.select().from(moderationAudit).orderBy(desc(moderationAudit.createdAt)).limit(50),
  ]);
  return Response.json({ suppliers, products: productRows, events, audit });
}

export async function POST(request: Request) {
  const admin = await getChatGPTUser();
  if (!admin || !isAdminEmail(admin.email)) return Response.json({ error: "Acesso restrito ao gestor." }, { status: 403 });
  const body = await request.json() as { entity?: string; id?: number; action?: string; value?: string };
  if (!body.id || !body.entity || !body.action) return Response.json({ error: "Ação inválida." }, { status: 400 });
  const db = getDb();
  if (body.entity === "supplier") {
    if (body.action === "verify_phone") await db.update(leads).set({ phoneVerifiedAt: new Date().toISOString() }).where(eq(leads.id, body.id));
    else if (body.action === "approve") { const [supplier] = await db.select().from(leads).where(eq(leads.id, body.id)); if (!supplier?.phoneVerifiedAt) return Response.json({ error: "Valide o telefone antes de aprovar." }, { status: 400 }); await db.update(leads).set({ status: "approved" }).where(eq(leads.id, body.id)); }
    else if (body.action === "reject") await db.update(leads).set({ status: "rejected" }).where(eq(leads.id, body.id));
    else if (body.action === "edit_company") await db.update(leads).set({ company: String(body.value || "").trim() }).where(eq(leads.id, body.id));
    else if (body.action === "delete") { const [supplier] = await db.select().from(leads).where(eq(leads.id, body.id)); if (supplier?.authUserId) { await db.delete(products).where(eq(products.ownerUserId, supplier.authUserId)); await db.delete(supplierEvents).where(eq(supplierEvents.ownerUserId, supplier.authUserId)); } await db.delete(leads).where(eq(leads.id, body.id)); }
  } else if (body.entity === "product") {
    if (body.action === "approve") { const [product] = await db.select().from(products).where(eq(products.id, body.id)); const [supplier] = product?.ownerUserId ? await db.select().from(leads).where(eq(leads.authUserId, product.ownerUserId)) : []; if (!supplier || supplier.status !== "approved" || !supplier.phoneVerifiedAt) return Response.json({ error: "O fornecedor ainda não está aprovado." }, { status: 400 }); await db.update(products).set({ status: "approved" }).where(eq(products.id, body.id)); }
    else if (body.action === "reject") await db.update(products).set({ status: "rejected" }).where(eq(products.id, body.id));
    else if (body.action === "edit_name") await db.update(products).set({ name: String(body.value || "").trim() }).where(eq(products.id, body.id));
    else if (body.action === "delete") await db.delete(products).where(eq(products.id, body.id));
  } else if (body.entity === "event") {
    if (body.action === "approve") { const [event] = await db.select().from(supplierEvents).where(eq(supplierEvents.id, body.id)); if (!event) return Response.json({ error: "Evento não encontrado." }, { status: 404 }); if (event.ownerUserId) { const [supplier] = await db.select().from(leads).where(eq(leads.authUserId, event.ownerUserId)); if (!supplier || supplier.status !== "approved" || !supplier.phoneVerifiedAt) return Response.json({ error: "O fornecedor ainda não está aprovado." }, { status: 400 }); } await db.update(supplierEvents).set({ status: "approved" }).where(eq(supplierEvents.id, body.id)); }
    else if (body.action === "reject") await db.update(supplierEvents).set({ status: "rejected" }).where(eq(supplierEvents.id, body.id));
    else if (body.action === "edit_name") await db.update(supplierEvents).set({ name: String(body.value || "").trim() }).where(eq(supplierEvents.id, body.id));
    else if (body.action === "delete") await db.delete(supplierEvents).where(eq(supplierEvents.id, body.id));
  }
  await db.insert(moderationAudit).values({ adminEmail: admin.email, entity: body.entity, entityId: body.id, action: body.action });
  return Response.json({ ok: true });
}
