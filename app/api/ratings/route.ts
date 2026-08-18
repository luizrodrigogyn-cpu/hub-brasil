import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { activityEvents, leads, supplierRatings } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";

export async function GET() {
  try {
    const user = await getApiUser();
    const [viewer] = user ? await getDb().select({ id: leads.id }).from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.status, "approved"))) : [];
    if (!viewer) return Response.json({ ratings: {} });
    const summaries = await getDb().select({ supplierName: supplierRatings.supplierName, average: sql<number>`avg(${supplierRatings.stars})`, total: sql<number>`count(*)` }).from(supplierRatings).groupBy(supplierRatings.supplierName);
    return Response.json({ ratings: Object.fromEntries(summaries.filter((item) => Number(item.total) >= 3).map((item) => [item.supplierName, { average: Number(item.average), total: Number(item.total) }])) });
  } catch { return Response.json({ ratings: {} }); }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser();
    if (!user) return Response.json({ error: "Faça login para avaliar.", signIn: "/signin-with-chatgpt?return_to=/" }, { status: 401 });
    const body = await request.json() as { supplierName?: string; stars?: number };
    if (!body.supplierName || !Number.isInteger(body.stars) || body.stars! < 1 || body.stars! > 5) return Response.json({ error: "Avaliação inválida." }, { status: 400 });
    const [client] = await getDb().select({ role: leads.role }).from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.status, "approved")));
    if (client?.role !== "client") return Response.json({ error: "Somente clientes aprovados podem avaliar." }, { status: 403 });
    const supplierRows = await getDb().select({ id: leads.id }).from(leads).where(and(eq(leads.role, "supplier"), eq(leads.status, "approved"), eq(leads.company, body.supplierName)));
    if (!supplierRows.length) return Response.json({ error: "Fornecedor não encontrado." }, { status: 404 });
    const [eligible] = await getDb().select({ id: activityEvents.id }).from(activityEvents).where(and(eq(activityEvents.actorUserId, user.userId), inArray(activityEvents.supplierId, supplierRows.map((item) => item.id)), inArray(activityEvents.kind, ["whatsapp_click", "quote_request"]))).limit(1);
    if (!eligible) return Response.json({ error: "A avaliação é liberada após um contato ou pedido de cotação registrado." }, { status: 403 });
    await getDb().insert(supplierRatings).values({ supplierName: body.supplierName, stars: body.stars!, raterUserId: user.userId }).onConflictDoUpdate({ target: [supplierRatings.supplierName, supplierRatings.raterUserId], set: { stars: body.stars! } });
    const [summary] = await getDb().select({ average: sql<number>`avg(${supplierRatings.stars})`, total: sql<number>`count(*)` }).from(supplierRatings).where(eq(supplierRatings.supplierName, body.supplierName));
    return Response.json({ average: Number(summary.average), total: Number(summary.total) }, { status: 201 });
  } catch { return Response.json({ error: "Não foi possível avaliar." }, { status: 500 }); }
}
