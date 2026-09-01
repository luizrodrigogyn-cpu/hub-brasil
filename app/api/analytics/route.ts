import { and, eq, gte } from "drizzle-orm";
import { getDb } from "../../../db";
import { activityEvents } from "../../../db/schema";
import { getTenantContext } from "../../tenant-context";
import { getApiUser } from "../../admin-auth";

const supplierJourneyKinds = new Set([
  "supplier_registration_started",
  "supplier_registration_completed",
  "supplier_dashboard_view",
  "supplier_product_started",
  "supplier_product_created",
  "supplier_opportunity_opened",
]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { kind?: unknown } | null;
  const kind = typeof body?.kind === "string" ? body.kind : "";
  if (!supplierJourneyKinds.has(kind)) return Response.json({ error: "Evento não permitido." }, { status: 400 });

  const isRegistrationStart = kind === "supplier_registration_started";
  const context = await getTenantContext();
  const user = context?.user || await getApiUser();
  if (!user) return Response.json({ error: "Acesso não autenticado." }, { status: 401 });
  if (!isRegistrationStart && context?.profile?.role !== "supplier") {
    return Response.json({ error: "Evento disponível somente para fornecedores." }, { status: 403 });
  }

  // Evita duplicar eventos por cliques repetidos ou re-renderização. Nenhum texto digitado,
  // e-mail, telefone, IP ou outro dado pessoal é recebido ou salvo por esta rota.
  const since = new Date(Date.now() - 60_000).toISOString();
  const [recent] = await getDb().select({ id: activityEvents.id }).from(activityEvents).where(and(
    eq(activityEvents.actorUserId, user.userId),
    eq(activityEvents.kind, kind),
    gte(activityEvents.createdAt, since),
  )).limit(1);
  if (!recent) {
    await getDb().insert(activityEvents).values({
      actorOrganizationId: context?.organizationId || null,
      supplierOrganizationId: context?.profile?.role === "supplier" ? context.organizationId : null,
      actorUserId: user.userId,
      supplierId: context?.profile?.role === "supplier" ? context.profile.id : null,
      kind,
    });
  }

  return Response.json({ ok: true, recorded: !recent });
}
