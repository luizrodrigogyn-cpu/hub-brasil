import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { featureCatalog, organizationFeatures, organizations } from "../../../../db/schema";
import { getApiUser, isHubAdmin } from "../../../admin-auth";

async function requireAdmin() {
  const user = await getApiUser();
  return user && isHubAdmin(user) ? user : null;
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Acesso restrito ao Gestor Master com 2FA." }, { status: 403 });
  const organizationId = new URL(request.url).searchParams.get("organizationId");
  const db = getDb();
  const catalog = await db.select().from(featureCatalog).orderBy(featureCatalog.featureKey);
  const overrides = organizationId ? await db.select().from(organizationFeatures).where(eq(organizationFeatures.organizationId, organizationId)) : [];
  return Response.json({ catalog, organizationId, overrides }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Acesso restrito ao Gestor Master com 2FA." }, { status: 403 });
  const body = await request.json() as { organizationId?: string; featureKey?: string; enabled?: boolean; configuration?: unknown };
  if (!body.organizationId || !body.featureKey || typeof body.enabled !== "boolean") return Response.json({ error: "Organização, módulo e estado são obrigatórios." }, { status: 400 });
  const db = getDb();
  const [[organization], [feature]] = await Promise.all([
    db.select({ id: organizations.id }).from(organizations).where(and(eq(organizations.id, body.organizationId), eq(organizations.status, "active"))).limit(1),
    db.select({ key: featureCatalog.featureKey }).from(featureCatalog).where(eq(featureCatalog.featureKey, body.featureKey)).limit(1),
  ]);
  if (!organization || !feature) return Response.json({ error: "Organização ou módulo inexistente." }, { status: 404 });
  await db.insert(organizationFeatures).values({ organizationId: body.organizationId, featureKey: body.featureKey, enabled: body.enabled, configuration: body.configuration ? JSON.stringify(body.configuration).slice(0, 4000) : null, changedBy: admin.email }).onConflictDoUpdate({ target: [organizationFeatures.organizationId, organizationFeatures.featureKey], set: { enabled: body.enabled, configuration: body.configuration ? JSON.stringify(body.configuration).slice(0, 4000) : null, changedBy: admin.email, updatedAt: new Date().toISOString() } });
  return Response.json({ ok: true });
}
