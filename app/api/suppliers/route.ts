import { and, eq, isNotNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { leads } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";

export async function GET() {
  try {
    const user = await getApiUser();
    const [viewer] = user ? await getDb().select({ id: leads.id }).from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.status, "approved"))) : [];
    const rows = await getDb().select({ id: leads.id, name: leads.company, category: leads.category, city: leads.city, state: leads.state, description: leads.description, phone: leads.phone, instagram: leads.instagram }).from(leads).where(and(eq(leads.status, "approved"), eq(leads.role, "supplier"), isNotNull(leads.phoneVerifiedAt)));
    return Response.json({ suppliers: rows.filter((item) => item.name && item.category && item.city && item.state).map((item) => ({ ...item, phone: viewer ? item.phone : null, instagram: viewer ? item.instagram : null })) });
  } catch { return Response.json({ suppliers: [] }); }
}
