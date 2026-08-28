import { and, desc, eq, gt } from "drizzle-orm";
import { getDb } from "../../../db";
import { eventInterests, leads, marketNeeds, needInterests, supplierUpdates, technicalArticles } from "../../../db/schema";
import { getTenantContext } from "../../tenant-context";
import { FEATURES, requireFeature } from "../../features";
import { awardCredit, qualifyReferralIfReady } from "../../hub-credits";
import { isValidBrazilState, normalizeBrazilState } from "../../brazil-states";

export async function GET() {
  const tenant = await getTenantContext();
  if (!tenant) return Response.json({ error: "Faça login para acessar a comunidade.", signIn: "/sign-in?return_to=/" }, { status: 401 });
  const { user, organizationId } = tenant;
  const featureError = await requireFeature(organizationId, FEATURES.community);
  if (featureError) return featureError;
  const db = getDb();
  const [profile] = await db.select().from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.organizationId, organizationId)));
  if (!profile || profile.status !== "approved") return Response.json({ error: "Seu cadastro precisa estar aprovado." }, { status: 403 });
  const now = new Date().toISOString();
  const [needs, updates, articles, eventReminders] = await Promise.all([
    db.select({ id: marketNeeds.id, category: marketNeeds.category, title: marketNeeds.title, description: marketNeeds.description, city: marketNeeds.city, state: marketNeeds.state, deadline: marketNeeds.deadline, createdAt: marketNeeds.createdAt }).from(marketNeeds).where(and(eq(marketNeeds.status, "approved"), gt(marketNeeds.expiresAt, now))).orderBy(desc(marketNeeds.createdAt)).limit(40),
    db.select({ id: supplierUpdates.id, supplierId: supplierUpdates.supplierId, title: supplierUpdates.title, content: supplierUpdates.content, link: supplierUpdates.link, publishedAt: supplierUpdates.publishedAt }).from(supplierUpdates).where(and(eq(supplierUpdates.status, "approved"), gt(supplierUpdates.expiresAt, now))).orderBy(desc(supplierUpdates.publishedAt)).limit(30),
    db.select({ id: technicalArticles.id, title: technicalArticles.title, slug: technicalArticles.slug, summary: technicalArticles.summary, category: technicalArticles.category, author: technicalArticles.author, sourceType: technicalArticles.sourceType, reviewedAt: technicalArticles.reviewedAt }).from(technicalArticles).where(eq(technicalArticles.status, "published")).orderBy(desc(technicalArticles.reviewedAt)).limit(30),
    db.select().from(eventInterests).where(eq(eventInterests.organizationId, organizationId)),
  ]);
  const myNeeds = profile.role === "client" ? await db.select().from(marketNeeds).where(eq(marketNeeds.clientOrganizationId, organizationId)).orderBy(desc(marketNeeds.createdAt)) : [];
  const myInterests = profile.role === "supplier" ? await db.select({ id: needInterests.id, needId: needInterests.needId, status: needInterests.status, message: needInterests.message, createdAt: needInterests.createdAt }).from(needInterests).where(eq(needInterests.supplierOrganizationId, organizationId)) : [];
  return Response.json({ needs, updates, articles, eventReminders, myNeeds, myInterests, role: profile.role });
}

export async function POST(request: Request) {
  const tenant = await getTenantContext();
  if (!tenant) return Response.json({ error: "Faça login para continuar.", signIn: "/sign-in?return_to=/" }, { status: 401 });
  const { user, organizationId } = tenant;
  const featureError = await requireFeature(organizationId, FEATURES.community);
  if (featureError) return featureError;
  const db = getDb();
  const [profile] = await db.select().from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.organizationId, organizationId)));
  if (!profile || profile.status !== "approved") return Response.json({ error: "Seu cadastro precisa estar aprovado." }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const action = String(body.action || "");
  if (action === "create_need") {
    if (profile.role !== "client") return Response.json({ error: "Somente clientes podem publicar necessidades." }, { status: 403 });
    const category = String(body.category || "").trim(), title = String(body.title || "").trim(), description = String(body.description || "").trim(), city = String(body.city || "").trim(), state = normalizeBrazilState(String(body.state || ""));
    if (!category || !title || !description || !city || !state) return Response.json({ error: "Preencha os campos obrigatórios." }, { status: 400 });
    if (!isValidBrazilState(state)) return Response.json({ error: "Informe uma UF brasileira válida (ex.: SP, RJ, MG)." }, { status: 400 });
    await db.insert(marketNeeds).values({ clientOrganizationId: organizationId, clientUserId: user.userId, category, title: title.slice(0, 120), description: description.slice(0, 2000), city, state, deadline: String(body.deadline || "") || null, expiresAt: new Date(Date.now() + 45 * 86400000).toISOString() });
    return Response.json({ ok: true, pending: true }, { status: 201 });
  }
  if (action === "interest") {
    if (profile.role !== "supplier" || profile.verificationStatus !== "verified") return Response.json({ error: "Somente fornecedores verificados podem manifestar interesse." }, { status: 403 });
    const needId = Number(body.needId); if (!Number.isInteger(needId)) return Response.json({ error: "Demanda inválida." }, { status: 400 });
    await db.insert(needInterests).values({ supplierOrganizationId: organizationId, needId, supplierId: profile.id, message: String(body.message || "").trim().slice(0, 800) || null }).onConflictDoUpdate({ target: [needInterests.needId, needInterests.supplierId], set: { supplierOrganizationId: organizationId, message: String(body.message || "").trim().slice(0, 800) || null, status: "interested" } });
    const [interest] = await db.select().from(needInterests).where(and(eq(needInterests.needId,needId),eq(needInterests.supplierId,profile.id)));
    if (interest) { await awardCredit(db,{supplierId:profile.id,ruleKey:"need_interest",sourceType:"need_interest",sourceId:interest.id,idempotencyKey:`need-interest:${interest.id}`}); await qualifyReferralIfReady(db,profile.id); }
    return Response.json({ ok: true }, { status: 201 });
  }
  if (action === "create_update") {
    if (profile.role !== "supplier" || profile.verificationStatus !== "verified") return Response.json({ error: "Somente fornecedores verificados podem publicar novidades." }, { status: 403 });
    const title = String(body.title || "").trim(), content = String(body.content || "").trim(); if (!title || !content) return Response.json({ error: "Informe título e conteúdo." }, { status: 400 });
    await db.insert(supplierUpdates).values({ organizationId, supplierId: profile.id, ownerUserId: user.userId, title: title.slice(0, 120), content: content.slice(0, 2500), link: String(body.link || "").trim() || null, expiresAt: new Date(Date.now() + 90 * 86400000).toISOString() });
    return Response.json({ ok: true, pending: true }, { status: 201 });
  }
  if (action === "event_interest") {
    const eventId = Number(body.eventId); if (!Number.isInteger(eventId)) return Response.json({ error: "Evento inválido." }, { status: 400 });
    await db.insert(eventInterests).values({ organizationId, eventId, userId: user.userId, reminderEnabled: body.reminderEnabled !== false }).onConflictDoUpdate({ target: [eventInterests.eventId, eventInterests.userId], set: { organizationId, reminderEnabled: body.reminderEnabled !== false } });
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Ação desconhecida." }, { status: 400 });
}
