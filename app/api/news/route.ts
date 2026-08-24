import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { sectorNews } from "../../../db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const news = await db.select().from(sectorNews)
    .where(eq(sectorNews.status, "approved"))
    .orderBy(desc(sectorNews.publishedAt))
    .limit(60);
  // Conteúdo público, igual para qualquer visitante — não varia por sessão, então pode ir para o cache de borda.
  return Response.json({ news }, { headers: { "cache-control": "public, max-age=120, stale-while-revalidate=300, s-maxage=120" } });
}
