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
  return Response.json({ news });
}
