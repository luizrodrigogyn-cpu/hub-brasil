import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { conversationMessages, conversations, leads } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";

async function profileForUser() {
  const user = await getApiUser();
  if (!user) return { user: null, profile: null };
  const [profile] = await getDb().select().from(leads).where(eq(leads.authUserId, user.userId));
  return { user, profile };
}

export async function GET(request: Request) {
  const { user, profile } = await profileForUser();
  if (!user || !profile) return Response.json({ error: "Faça login e conclua seu cadastro para acessar mensagens." }, { status: 401 });
  const url = new URL(request.url);
  const conversationId = Number(url.searchParams.get("conversationId"));
  const db = getDb();
  const isSupplier = profile.role === "supplier";
  const list = isSupplier
    ? await db.select({ id: conversations.id, subject: conversations.subject, supplierId: conversations.supplierId, clientUserId: conversations.clientUserId, updatedAt: conversations.updatedAt, clientName: leads.name, clientCompany: leads.company })
      .from(conversations).leftJoin(leads, eq(leads.authUserId, conversations.clientUserId)).where(eq(conversations.supplierId, profile.id)).orderBy(desc(conversations.updatedAt))
    : await db.select({ id: conversations.id, subject: conversations.subject, supplierId: conversations.supplierId, clientUserId: conversations.clientUserId, updatedAt: conversations.updatedAt, supplierName: leads.company, supplierCity: leads.city, supplierState: leads.state })
      .from(conversations).innerJoin(leads, eq(leads.id, conversations.supplierId)).where(eq(conversations.clientUserId, user.userId)).orderBy(desc(conversations.updatedAt));
  if (!conversationId) {
    // "Visto": contagem de mensagens da outra parte ainda não lidas, para badge na lista.
    const unread = list.length ? await db.select({ conversationId: conversationMessages.conversationId, total: sql<number>`count(*)` }).from(conversationMessages).where(and(isNull(conversationMessages.readAt), ne(conversationMessages.senderUserId, user.userId))).groupBy(conversationMessages.conversationId) : [];
    const unreadMap = new Map(unread.map((item) => [item.conversationId, Number(item.total)]));
    return Response.json({ conversations: list.map((item) => ({ ...item, unreadCount: unreadMap.get(item.id) || 0 })) });
  }
  const current = list.find((item) => item.id === conversationId);
  if (!current) return Response.json({ error: "Conversa não encontrada." }, { status: 404 });
  // Marca como lida qualquer mensagem da outra parte ao abrir a conversa.
  await db.update(conversationMessages).set({ readAt: new Date().toISOString() }).where(and(eq(conversationMessages.conversationId, conversationId), isNull(conversationMessages.readAt), ne(conversationMessages.senderUserId, user.userId)));
  const messages = await db.select().from(conversationMessages).where(eq(conversationMessages.conversationId, conversationId)).orderBy(conversationMessages.createdAt);
  return Response.json({ conversations: list, conversation: current, messages, currentUserId: user.userId });
}

export async function POST(request: Request) {
  const { user, profile } = await profileForUser();
  if (!user || !profile || profile.status !== "approved") return Response.json({ error: "Conclua um cadastro aprovado para usar as mensagens." }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const text = String(body.message || "").trim().slice(0, 2000);
  if (!text) return Response.json({ error: "Escreva uma mensagem." }, { status: 400 });
  const db = getDb();
  let conversationId = Number(body.conversationId) || 0;
  if (!conversationId) {
    if (profile.role !== "client") return Response.json({ error: "A nova conversa deve ser iniciada por um cliente." }, { status: 403 });
    const supplierId = Number(body.supplierId);
    const [supplier] = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, supplierId), eq(leads.role, "supplier"), eq(leads.status, "approved"))).limit(1);
    if (!supplier) return Response.json({ error: "Fornecedor indisponível." }, { status: 404 });
    const [conversation] = await db.insert(conversations).values({ clientUserId: user.userId, supplierId, subject: String(body.subject || "Contato pelo Hub Brasil").trim().slice(0, 140) }).onConflictDoUpdate({ target: [conversations.clientUserId, conversations.supplierId], set: { updatedAt: new Date().toISOString() } }).returning();
    conversationId = conversation.id;
  }
  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  if (!conversation || (profile.role === "client" ? conversation.clientUserId !== user.userId : conversation.supplierId !== profile.id)) return Response.json({ error: "Você não tem acesso a esta conversa." }, { status: 403 });
  const [message] = await db.insert(conversationMessages).values({ conversationId, senderUserId: user.userId, body: text }).returning();
  await db.update(conversations).set({ updatedAt: new Date().toISOString() }).where(eq(conversations.id, conversationId));
  return Response.json({ ok: true, conversationId, message }, { status: 201 });
}
