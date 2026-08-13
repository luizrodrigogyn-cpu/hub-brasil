import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { supplierRatings } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";

export async function GET() {
  try {
    const summaries = await getDb().select({ supplierName: supplierRatings.supplierName, average: sql<number>`avg(${supplierRatings.stars})`, total: sql<number>`count(*)` }).from(supplierRatings).groupBy(supplierRatings.supplierName);
    return Response.json({ ratings: Object.fromEntries(summaries.map((item) => [item.supplierName, { average: Number(item.average), total: Number(item.total) }])) });
  } catch { return Response.json({ ratings: {} }); }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser();
    if (!user) return Response.json({ error: "Faça login para avaliar.", signIn: "/signin-with-chatgpt?return_to=/" }, { status: 401 });
    const body = await request.json() as { supplierName?: string; stars?: number };
    if (!body.supplierName || !Number.isInteger(body.stars) || body.stars! < 1 || body.stars! > 5) return Response.json({ error: "Avaliação inválida." }, { status: 400 });
    await getDb().insert(supplierRatings).values({ supplierName: body.supplierName, stars: body.stars!, raterUserId: user.userId }).onConflictDoUpdate({ target: [supplierRatings.supplierName, supplierRatings.raterUserId], set: { stars: body.stars! } });
    const [summary] = await getDb().select({ average: sql<number>`avg(${supplierRatings.stars})`, total: sql<number>`count(*)` }).from(supplierRatings).where(eq(supplierRatings.supplierName, body.supplierName));
    return Response.json({ average: Number(summary.average), total: Number(summary.total) }, { status: 201 });
  } catch { return Response.json({ error: "Não foi possível avaliar." }, { status: 500 }); }
}
