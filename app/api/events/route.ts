import { and, eq, gte } from "drizzle-orm";
import { getDb } from "../../../db";
import { leads, supplierEvents } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";
import { getTenantContext } from "../../tenant-context";
import { FEATURES, requireFeature } from "../../features";
import { isValidBrazilState, normalizeBrazilState } from "../../brazil-states";

// Igual a /api/suppliers e /api/products: o nome do organizador só aparece completo para
// viewer autenticado, então só é seguro cachear na borda a resposta anônima.
function cacheHeaders(personalized: boolean) {
  return { "cache-control": personalized ? "private, no-store" : "public, max-age=60, stale-while-revalidate=180, s-maxage=60", vary: "Cookie" };
}

export async function GET() {
  try { const user = await getApiUser(); const [viewer] = user ? await getDb().select({ id: leads.id }).from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.status, "approved"))) : []; const events = await getDb().select({ id: supplierEvents.id, name: supplierEvents.name, supplierName: supplierEvents.supplierName, venue: supplierEvents.venue, city: supplierEvents.city, state: supplierEvents.state, eventDate: supplierEvents.eventDate, registrationUrl: supplierEvents.registrationUrl, description: supplierEvents.description }).from(supplierEvents).where(and(eq(supplierEvents.status, "approved"), gte(supplierEvents.eventDate, new Date().toISOString().slice(0, 10)))); return Response.json({ events: events.map((item) => ({ ...item, supplierName: viewer || !item.supplierName ? item.supplierName : "Organizador protegido" })) }, { headers: cacheHeaders(Boolean(viewer)) }); }
  catch { return Response.json({ events: [] }); }
}

export async function POST(request: Request) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return Response.json({ error: "Faça login para publicar.", signIn: "/sign-in?return_to=/" }, { status: 401 });
    const { user, organizationId } = tenant;
    const featureError = await requireFeature(organizationId, FEATURES.events);
    if (featureError) return featureError;
    const [supplier] = await getDb().select().from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.organizationId, organizationId), eq(leads.role, "supplier")));
    if (!supplier || supplier.status !== "approved" || !supplier.phoneVerifiedAt) return Response.json({ error: "Seu fornecedor precisa ter telefone validado e cadastro aprovado pelo gestor." }, { status: 403 });
    const body = await request.json() as Record<string, string>;
    const required = ["name", "venue", "city", "state", "date", "link"];
    if (required.some((key) => !body[key]?.trim())) return Response.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
    const state = normalizeBrazilState(body.state);
    if (!isValidBrazilState(state)) return Response.json({ error: "Informe uma UF brasileira válida (ex.: SP, RJ, MG)." }, { status: 400 });
    const [event] = await getDb().insert(supplierEvents).values({ organizationId, name: body.name.trim(), venue: body.venue.trim(), city: body.city.trim(), state, eventDate: body.date, registrationUrl: body.link.trim(), description: body.description?.trim() || null, ownerUserId: user.userId, supplierId: supplier.id, supplierName: supplier.company || supplier.name, status: "pending" }).returning();
    return Response.json({ event, pending: true }, { status: 201 });
  } catch { return Response.json({ error: "Não foi possível cadastrar o evento." }, { status: 500 }); }
}
