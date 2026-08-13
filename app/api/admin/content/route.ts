import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { leads, products, supplierEvents } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { isAdminEmail } from "../../../admin-auth";

async function authorized() { const user = await getChatGPTUser(); return user && isAdminEmail(user.email); }

export async function GET() {
  if (!(await authorized())) return Response.json({ error: "Acesso restrito ao gestor." }, { status: 403 });
  const db = getDb();
  const [suppliers, productRows, events] = await Promise.all([
    db.select().from(leads).where(eq(leads.role, "supplier")).orderBy(desc(leads.createdAt)),
    db.select().from(products).orderBy(desc(products.createdAt)),
    db.select().from(supplierEvents).orderBy(desc(supplierEvents.createdAt)),
  ]);
  return Response.json({ suppliers, products: productRows, events });
}

export async function POST(request: Request) {
  if (!(await authorized())) return Response.json({ error: "Acesso restrito ao gestor." }, { status: 403 });
  const body = await request.json() as { entity?: string; id?: number; action?: string; value?: string };
  if (!body.id || !body.entity || !body.action) return Response.json({ error: "Ação inválida." }, { status: 400 });
  const db = getDb();
  if (body.entity === "supplier") {
    if (body.action === "verify_phone") await db.update(leads).set({ phoneVerifiedAt: new Date().toISOString() }).where(eq(leads.id, body.id));
    else if (body.action === "approve") await db.update(leads).set({ status: "approved" }).where(eq(leads.id, body.id));
    else if (body.action === "reject") await db.update(leads).set({ status: "rejected" }).where(eq(leads.id, body.id));
    else if (body.action === "edit_company") await db.update(leads).set({ company: String(body.value || "").trim() }).where(eq(leads.id, body.id));
    else if (body.action === "delete") await db.delete(leads).where(eq(leads.id, body.id));
  } else if (body.entity === "product") {
    if (body.action === "approve" || body.action === "reject") await db.update(products).set({ status: body.action === "approve" ? "approved" : "rejected" }).where(eq(products.id, body.id));
    else if (body.action === "edit_name") await db.update(products).set({ name: String(body.value || "").trim() }).where(eq(products.id, body.id));
    else if (body.action === "delete") await db.delete(products).where(eq(products.id, body.id));
  } else if (body.entity === "event") {
    if (body.action === "approve" || body.action === "reject") await db.update(supplierEvents).set({ status: body.action === "approve" ? "approved" : "rejected" }).where(eq(supplierEvents.id, body.id));
    else if (body.action === "edit_name") await db.update(supplierEvents).set({ name: String(body.value || "").trim() }).where(eq(supplierEvents.id, body.id));
    else if (body.action === "delete") await db.delete(supplierEvents).where(eq(supplierEvents.id, body.id));
  }
  return Response.json({ ok: true });
}
