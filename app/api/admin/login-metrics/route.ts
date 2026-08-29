import { desc, gte, isNull, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { loginSessions } from "../../../../db/schema";
import { getApiUser, isHubAdmin } from "../../../admin-auth";

export async function GET() {
  const admin = await getApiUser();
  if (!isHubAdmin(admin)) return Response.json({ error: "Acesso restrito ao Gestor Master com 2FA." }, { status: 403 });
  const db = getDb();
  const since24h = new Date(Date.now() - 86400000).toISOString();
  const [summary, recent] = await Promise.all([
    db.select({ sessions24h: sql<number>`count(*)`, users24h: sql<number>`count(distinct ${loginSessions.userId})` }).from(loginSessions).where(gte(loginSessions.lastSeenAt, since24h)),
    db.select({ sessionId: loginSessions.sessionId, userId: loginSessions.userId, firstSeenAt: loginSessions.firstSeenAt, lastSeenAt: loginSessions.lastSeenAt }).from(loginSessions).where(isNull(loginSessions.revokedAt)).orderBy(desc(loginSessions.lastSeenAt)).limit(100),
  ]);
  return Response.json({ sessions24h: Number(summary[0]?.sessions24h || 0), users24h: Number(summary[0]?.users24h || 0), recent }, { headers: { "Cache-Control": "no-store" } });
}
