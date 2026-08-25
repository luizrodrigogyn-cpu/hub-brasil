import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { activityEvents, leads, supplierRatings } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";

export async function GET() {
  try {
    const user = await getApiUser();
    const [viewer] = user ? await getDb().select({ id: leads.id }).from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.status, "approved"))) : [];
    if (!viewer) return Response.json({ ratings: {} });
    const db = getDb();
    // Agrupado por supplierId (estável) em vez do texto salvo na avaliação, que fica
    // desatualizado se a gestão renomear a empresa depois. O nome exibido vem sempre atualizado
    // de `leads`, então bate com o nome que o front mostra em qualquer outra tela.
    const summaries = await db.select({ supplierId: supplierRatings.supplierId, average: sql<number>`avg(${supplierRatings.stars})`, total: sql<number>`count(*)` }).from(supplierRatings).where(isNotNull(supplierRatings.supplierId)).groupBy(supplierRatings.supplierId);
    const eligible = summaries.filter((item) => Number(item.total) >= 3);
    const supplierIds = eligible.map((item) => item.supplierId) as number[];
    const currentSuppliers = supplierIds.length ? await db.select({ id: leads.id, company: leads.company, name: leads.name }).from(leads).where(inArray(leads.id, supplierIds)) : [];
    const nameById = new Map(currentSuppliers.map((item) => [item.id, item.company || item.name]));
    const ratings: Record<string, { average: number; total: number }> = {};
    for (const item of eligible) {
      const name = item.supplierId != null ? nameById.get(item.supplierId) : null;
      if (name) ratings[name] = { average: Number(item.average), total: Number(item.total) };
    }
    return Response.json({ ratings });
  } catch { return Response.json({ ratings: {} }); }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser();
    if (!user) return Response.json({ error: "Faça login para avaliar.", signIn: "/sign-in?return_to=/" }, { status: 401 });
    // O front agora manda o supplierId diretamente (não mais o nome da empresa): resolver por
    // nome escolhia "o primeiro resultado encontrado" quando dois fornecedores tinham o mesmo
    // nome — arriscado, mesmo sendo raro hoje. Validar o ID direto elimina essa ambiguidade.
    const body = await request.json() as { supplierId?: number; stars?: number };
    const supplierId = Number(body.supplierId);
    if (!Number.isInteger(supplierId) || supplierId <= 0 || !Number.isInteger(body.stars) || body.stars! < 1 || body.stars! > 5) return Response.json({ error: "Avaliação inválida." }, { status: 400 });
    const [client] = await getDb().select({ role: leads.role }).from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.status, "approved")));
    if (client?.role !== "client") return Response.json({ error: "Somente clientes aprovados podem avaliar." }, { status: 403 });
    const [supplier] = await getDb().select({ id: leads.id, company: leads.company, name: leads.name }).from(leads).where(and(eq(leads.id, supplierId), eq(leads.role, "supplier"), eq(leads.status, "approved")));
    if (!supplier) return Response.json({ error: "Fornecedor não encontrado." }, { status: 404 });
    const [eligible] = await getDb().select({ id: activityEvents.id }).from(activityEvents).where(and(eq(activityEvents.actorUserId, user.userId), eq(activityEvents.supplierId, supplierId), inArray(activityEvents.kind, ["whatsapp_click", "quote_request"]))).limit(1);
    if (!eligible) return Response.json({ error: "A avaliação é liberada após um contato ou pedido de cotação registrado." }, { status: 403 });
    const supplierName = supplier.company || supplier.name;
    // Vínculo pelo supplierId (estável): a chave de unicidade da avaliação é (supplierId,
    // raterUserId), imune a renomeação de empresa. `supplierName` fica só como registro do texto
    // usado neste momento.
    await getDb().insert(supplierRatings).values({ supplierId, supplierName, stars: body.stars!, raterUserId: user.userId }).onConflictDoUpdate({ target: [supplierRatings.supplierId, supplierRatings.raterUserId], set: { stars: body.stars!, supplierName } });
    const [summary] = await getDb().select({ average: sql<number>`avg(${supplierRatings.stars})`, total: sql<number>`count(*)` }).from(supplierRatings).where(eq(supplierRatings.supplierId, supplierId));
    return Response.json({ average: Number(summary.average), total: Number(summary.total) }, { status: 201 });
  } catch { return Response.json({ error: "Não foi possível avaliar." }, { status: 500 }); }
}
