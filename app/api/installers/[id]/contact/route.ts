import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { installerContactEvents, installers } from "../../../../../db/schema";
import { getApiUser } from "../../../../admin-auth";
import { decryptPii } from "../../../../pii-crypto";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getApiUser();
  if (!user) return Response.json({ error: "Faça login para liberar o WhatsApp.", signIn: "/sign-in?return_to=/instaladores" }, { status: 401 });
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Instalador inválido." }, { status: 400 });
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [{ total }] = await getDb().select({ total: sql<number>`count(*)` }).from(installerContactEvents).where(and(eq(installerContactEvents.actorUserId, user.userId), gte(installerContactEvents.createdAt, since)));
  if (Number(total) >= 20) return Response.json({ error: "Limite de contatos atingido. Tente novamente mais tarde." }, { status: 429, headers: { "retry-after": "3600" } });
  const [installer] = await getDb().select({ id: installers.id, phoneEncrypted: installers.phoneEncrypted }).from(installers).where(and(eq(installers.id, id), eq(installers.status, "approved"), eq(installers.contactConsent, true)));
  if (!installer) return Response.json({ error: "Instalador não encontrado." }, { status: 404 });
  const phone = await decryptPii(installer.phoneEncrypted);
  if (!phone) return Response.json({ error: "Contato temporariamente indisponível." }, { status: 503 });
  await getDb().insert(installerContactEvents).values({ installerId: installer.id, actorUserId: user.userId });
  return Response.json({ phone }, { headers: { "cache-control": "private, no-store" } });
}
