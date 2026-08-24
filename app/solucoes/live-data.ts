import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { leads, products, sectorNews, supplierEvents } from "../../db/schema";

export async function getEcosystemCounts() {
  try {
    const db = getDb();
    const [[supplierRow], [productRow]] = await Promise.all([
      db.select({ total: sql<number>`count(*)` }).from(leads).where(and(eq(leads.role, "supplier"), eq(leads.status, "approved"), isNotNull(leads.phoneVerifiedAt))),
      db.select({ total: sql<number>`count(*)` }).from(products).where(eq(products.status, "approved")),
    ]);
    return { suppliers: Number(supplierRow?.total || 0), products: Number(productRow?.total || 0) };
  } catch {
    return { suppliers: 0, products: 0 };
  }
}

export async function getLatestNews(limit = 3) {
  try {
    const db = getDb();
    const rows = await db
      .select({ id: sectorNews.id, title: sectorNews.title, summary: sectorNews.summary, category: sectorNews.category })
      .from(sectorNews)
      .where(eq(sectorNews.status, "approved"))
      .orderBy(desc(sectorNews.publishedAt))
      .limit(limit);
    return rows;
  } catch {
    return [];
  }
}

export async function getUpcomingEvents(limit = 3) {
  try {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db
      .select({ id: supplierEvents.id, name: supplierEvents.name, city: supplierEvents.city, state: supplierEvents.state, eventDate: supplierEvents.eventDate })
      .from(supplierEvents)
      .where(and(eq(supplierEvents.status, "approved"), sql`${supplierEvents.eventDate} >= ${today}`))
      .orderBy(supplierEvents.eventDate)
      .limit(limit);
    return rows;
  } catch {
    return [];
  }
}
