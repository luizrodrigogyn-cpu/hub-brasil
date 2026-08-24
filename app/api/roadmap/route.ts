import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { activityEvents, alertPreferences, contentReports, creditLedger, creditWallets, deletionRequests, favorites, highlightActivations, leads, products, quoteRecipients, quoteRequests, referrals, supplierEvents } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";
import { activeHighlights, awardCredit, profileCompleteness, qualifyReferralIfReady, recomputeHubScore, ruleFor } from "../../hub-credits";
import { isValidBrazilState, normalizeBrazilState } from "../../brazil-states";

const allowedFavoriteTypes = new Set(["supplier", "product", "event"]);

function list(value: unknown) {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 30) : [];
}

function normalizeText(value: unknown, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function normalizeIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0).filter((item, index, rows) => rows.indexOf(item) === index);
}

function toPositiveInt(value: unknown, fallback: number, max: number) {
  const candidate = Number(value);
  if (!Number.isFinite(candidate) || candidate <= 0) return fallback;
  return Math.floor(Math.min(max, Math.max(fallback, candidate)));
}

async function ensureQuoteBriefingColumns() {
  const schema = await env.DB.prepare("PRAGMA table_info(quote_requests)").all<{ name: string }>();
  const columns = new Set((schema.results || []).map((column) => column.name));
  if (!columns.has("budget")) await env.DB.exec("ALTER TABLE quote_requests ADD COLUMN budget TEXT");
  if (!columns.has("urgency")) await env.DB.exec("ALTER TABLE quote_requests ADD COLUMN urgency TEXT");
  if (!columns.has("integration")) await env.DB.exec("ALTER TABLE quote_requests ADD COLUMN integration TEXT");
}

export async function GET() {
  const user = await getApiUser();
  if (!user) return Response.json({ error: "Faça login para acessar o painel.", signIn: "/sign-in?return_to=/" }, { status: 401 });
  await ensureQuoteBriefingColumns();
  const db = getDb();
  const [profile] = await db.select().from(leads).where(eq(leads.authUserId, user.userId));
  if (!profile) return Response.json({ error: "Conclua seu cadastro no Hub para acessar o painel." }, { status: 403 });

  const [saved, alerts, clientQuotesRaw] = await Promise.all([
    db.select().from(favorites).where(eq(favorites.userId, user.userId)).orderBy(desc(favorites.createdAt)),
    db.select().from(alertPreferences).where(eq(alertPreferences.userId, user.userId)),
    db.select().from(quoteRequests).where(eq(quoteRequests.clientUserId, user.userId)).orderBy(desc(quoteRequests.createdAt)).limit(30),
  ]);
  const clientQuoteIds = clientQuotesRaw.map((item) => item.id);
  const clientQuoteStats = clientQuoteIds.length
    ? await db.select({ quoteId: quoteRecipients.quoteId, total: sql<number>`count(*)`, responded: sql<number>`sum(case when ${quoteRecipients.status} = 'responded' then 1 else 0 end)`, declined: sql<number>`sum(case when ${quoteRecipients.status} = 'declined' then 1 else 0 end)` }).from(quoteRecipients).where(inArray(quoteRecipients.quoteId, clientQuoteIds)).groupBy(quoteRecipients.quoteId)
    : [];
  const clientQuoteStatsMap = new Map(clientQuoteStats.map((item) => [item.quoteId, item]));
  const clientQuotes = clientQuotesRaw.map((quote) => {
    const stats = clientQuoteStatsMap.get(quote.id);
    const recipientsResponded = Number(stats?.responded || 0);
    const recipientsDeclined = Number(stats?.declined || 0);
    return { ...quote, recipientsTotal: Number(stats?.total || 0), recipientsResponded, recipientsDeclined, recipientsCompleted: recipientsResponded + recipientsDeclined };
  });
  const contactHistory = await db.select({ id: activityEvents.id, supplierId: activityEvents.supplierId, productId: activityEvents.productId, kind: activityEvents.kind, createdAt: activityEvents.createdAt }).from(activityEvents).where(eq(activityEvents.actorUserId, user.userId)).orderBy(desc(activityEvents.createdAt)).limit(80);
  const completeness = profileCompleteness(profile as unknown as Record<string, unknown>);

  let supplierMetrics = null;
  let supplierQuotes: unknown[] = [];
  let supplierStats: { totalReceived: number; totalResponded: number; acceptanceRate: number; newLeads: number } | null = null;
  if (profile.role === "supplier") {
    const since90 = new Date(Date.now() - 90 * 86400000).toISOString();
    const since48h = new Date(Date.now() - 48 * 3600000).toISOString();
    const metrics = await db.select({ kind: activityEvents.kind, total: sql<number>`count(*)` })
      .from(activityEvents).where(and(eq(activityEvents.supplierId, profile.id), gte(activityEvents.createdAt, since90))).groupBy(activityEvents.kind);
    supplierMetrics = Object.fromEntries(metrics.map((item) => [item.kind, Number(item.total)]));
    const rawSupplierQuotes = await db.select({ id: quoteRequests.id, protocol: quoteRequests.protocol, category: quoteRequests.category, application: quoteRequests.application, quantity: quoteRequests.quantity, city: quoteRequests.city, state: quoteRequests.state, deadline: quoteRequests.deadline, notes: quoteRequests.notes, status: quoteRecipients.status, createdAt: quoteRequests.createdAt })
      .from(quoteRecipients).innerJoin(quoteRequests, eq(quoteRecipients.quoteId, quoteRequests.id)).where(eq(quoteRecipients.supplierId, profile.id)).orderBy(desc(quoteRequests.createdAt)).limit(30);
    supplierQuotes = rawSupplierQuotes.map((quote) => ({ ...quote, isNewLead: quote.status === "sent" && new Date(quote.createdAt).toISOString() >= since48h }));
    const [allTimeRow] = await db.select({ total: sql<number>`count(*)`, responded: sql<number>`sum(case when ${quoteRecipients.status} = 'responded' then 1 else 0 end)` }).from(quoteRecipients).where(eq(quoteRecipients.supplierId, profile.id));
    const [newLeadsRow] = await db.select({ total: sql<number>`count(*)` }).from(quoteRecipients).where(and(eq(quoteRecipients.supplierId, profile.id), eq(quoteRecipients.status, "sent"), gte(quoteRecipients.createdAt, since48h)));
    const totalReceived = Number(allTimeRow?.total || 0);
    const totalResponded = Number(allTimeRow?.responded || 0);
    supplierStats = { totalReceived, totalResponded, acceptanceRate: totalReceived > 0 ? Math.round((totalResponded / totalReceived) * 100) : 0, newLeads: Number(newLeadsRow?.total || 0) };
  }

  const supplierIds = saved.filter((item) => item.entityType === "supplier").map((item) => item.entityId);
  const productIds = saved.filter((item) => item.entityType === "product").map((item) => item.entityId);
  const eventIds = saved.filter((item) => item.entityType === "event").map((item) => item.entityId);
  const [savedSuppliers, savedProducts, savedEvents] = await Promise.all([
    supplierIds.length ? db.select({ id: leads.id, name: leads.company, category: leads.category, city: leads.city, state: leads.state }).from(leads).where(inArray(leads.id, supplierIds)) : [],
    productIds.length ? db.select({ id: products.id, name: products.name, supplierName: products.supplierName, category: products.category }).from(products).where(inArray(products.id, productIds)) : [],
    eventIds.length ? db.select({ id: supplierEvents.id, name: supplierEvents.name, city: supplierEvents.city, state: supplierEvents.state, eventDate: supplierEvents.eventDate }).from(supplierEvents).where(inArray(supplierEvents.id, eventIds)) : [],
  ]);

  const [wallet] = profile.role === "supplier" ? await db.select().from(creditWallets).where(eq(creditWallets.supplierId, profile.id)) : [];
  const ledger = profile.role === "supplier" ? await db.select().from(creditLedger).where(eq(creditLedger.supplierId, profile.id)).orderBy(desc(creditLedger.createdAt)).limit(30) : [];
  const referralRows = profile.role === "supplier" ? await db.select().from(referrals).where(eq(referrals.referrerSupplierId, profile.id)) : [];
  const highlights = profile.role === "supplier" ? await activeHighlights(db, profile.id) : [];
  return Response.json({
    profile: { id: profile.id, name: profile.name, company: profile.company, role: profile.role, status: profile.status, verificationStatus: profile.verificationStatus, verifiedAt: profile.verifiedAt, phoneVerifiedAt: profile.phoneVerifiedAt, completeness, hubScore: profile.hubScore, founderMemberAt: profile.founderMemberAt, referralCode: profile.referralCode, phone: profile.phone, instagram: profile.instagram, website: profile.website, address: profile.address, city: profile.city, state: profile.state, description: profile.description, categories: JSON.parse(profile.categories || "[]"), serviceStates: JSON.parse(profile.serviceStates || "[]"), services: JSON.parse(profile.services || "[]"), serviceMode: profile.serviceMode, servesNationwide: profile.servesNationwide },
    favorites: { suppliers: savedSuppliers, products: savedProducts, events: savedEvents },
    alerts: alerts[0] ? { ...alerts[0], categories: JSON.parse(alerts[0].categories || "[]"), states: JSON.parse(alerts[0].states || "[]"), contentTypes: JSON.parse(alerts[0].contentTypes || "[]") } : null,
    clientQuotes,
    supplierQuotes,
    supplierMetrics,
    supplierStats,
    contactHistory,
    credits: profile.role === "supplier" ? { wallet: wallet || { availableBalance: 0, totalEarned: 0, totalUsed: 0 }, ledger, highlights, referrals: { invited: referralRows.length, registered: referralRows.length, complete: referralRows.filter((item) => ["qualified"].includes(item.status)).length, qualified: referralRows.filter((item) => item.status === "qualified").length } } : null,
  });
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return Response.json({ error: "Faça login para continuar.", signIn: "/sign-in?return_to=/" }, { status: 401 });
  const db = getDb();
  const [profile] = await db.select().from(leads).where(eq(leads.authUserId, user.userId));
  if (!profile || profile.status !== "approved") return Response.json({ error: "Seu cadastro precisa estar aprovado." }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const action = String(body.action || "");

  if (action === "favorite") {
    const entityType = String(body.entityType || "");
    const entityId = Number(body.entityId);
    if (!allowedFavoriteTypes.has(entityType) || !Number.isInteger(entityId) || entityId < 1) return Response.json({ error: "Favorito inválido." }, { status: 400 });
    await db.insert(favorites).values({ userId: user.userId, entityType, entityId }).onConflictDoNothing();
    if (entityType === "supplier") await db.insert(activityEvents).values({ actorUserId: user.userId, supplierId: entityId, kind: "favorite" });
    return Response.json({ ok: true });
  }

  if (action === "unfavorite") {
    await db.delete(favorites).where(and(eq(favorites.userId, user.userId), eq(favorites.entityType, String(body.entityType)), eq(favorites.entityId, Number(body.entityId))));
    return Response.json({ ok: true });
  }

  if (action === "alerts") {
    const values = { userId: user.userId, categories: JSON.stringify(list(body.categories)), states: JSON.stringify(list(body.states)), contentTypes: JSON.stringify(list(body.contentTypes)), frequency: body.frequency === "off" ? "off" : "weekly", active: body.frequency !== "off", unsubscribeToken: crypto.randomUUID(), updatedAt: new Date().toISOString() };
    await db.insert(alertPreferences).values(values).onConflictDoUpdate({ target: alertPreferences.userId, set: values });
    return Response.json({ ok: true });
  }

  if (action === "supplier_profile") {
    if (profile.role !== "supplier") return Response.json({ error: "Apenas fornecedores podem editar a área de atuação." }, { status: 403 });
    const serviceStates = list(body.serviceStates);
    const services = list(body.services);
    const serviceMode = ["presential", "remote", "both"].includes(String(body.serviceMode)) ? String(body.serviceMode) : "both";
    await db.update(leads).set({ serviceStates: JSON.stringify(serviceStates), services: JSON.stringify(services), serviceMode, servesNationwide: Boolean(body.servesNationwide), updatedAt: new Date().toISOString() }).where(eq(leads.id, profile.id));
    const [updated] = await db.select().from(leads).where(eq(leads.id, profile.id));
    if (updated && profileCompleteness(updated as unknown as Record<string, unknown>) >= 80) await awardCredit(db,{supplierId:profile.id,ruleKey:"profile_complete",sourceType:"supplier_profile",sourceId:profile.id,idempotencyKey:`profile-complete:${profile.id}`});
    await recomputeHubScore(db, profile.id, "perfil_atualizado");
    await qualifyReferralIfReady(db, profile.id);
    return Response.json({ ok: true });
  }

  if (action === "report") {
    const entityType = String(body.entityType || "");
    const entityId = Number(body.entityId);
    const reason = String(body.reason || "").trim();
    if (!allowedFavoriteTypes.has(entityType) || !Number.isInteger(entityId) || !reason) return Response.json({ error: "Informe o conteúdo e o motivo da denúncia." }, { status: 400 });
    await db.insert(contentReports).values({ reporterUserId: user.userId, entityType, entityId, reason: reason.slice(0, 120), details: String(body.details || "").trim().slice(0, 1500) || null });
    return Response.json({ ok: true }, { status: 201 });
  }

  if (action === "request_deletion") {
    const [existing] = await db.select().from(deletionRequests).where(and(eq(deletionRequests.userId, user.userId), eq(deletionRequests.status, "pending")));
    if (!existing) await db.insert(deletionRequests).values({ userId:user.userId, email:user.email, reason:String(body.reason||"").trim().slice(0,800)||null });
    return Response.json({ ok:true, message:"Solicitação registrada para análise segura." }, { status:201 });
  }

  if (action === "quote") {
    if (profile.role !== "client") return Response.json({ error: "A cotação deve ser criada por um perfil de cliente." }, { status: 403 });
    await ensureQuoteBriefingColumns();
    const supplierIds = normalizeIds(body.supplierIds).slice(0, 8);
    const category = normalizeText(body.category);
    const application = normalizeText(body.application);
    const city = normalizeText(body.city);
    const state = normalizeBrazilState(normalizeText(body.state));
    const notes = normalizeText(body.notes).slice(0, 2000);
    const contactConsent = body.contactConsent === true || String(body.contactConsent).toLowerCase() === "true";
    const quantity = toPositiveInt(body.quantity, 1, 120);
    const deadlineText = normalizeText(body.deadline);
    const deadline = deadlineText ? new Date(`${deadlineText}T23:59:59`) : null;
    const allowedBudgets = new Set(["Econômico", "Intermediário", "Avançado"]);
    const allowedUrgencies = new Set(["Imediata", "Até 15 dias", "Sem pressa"]);
    const allowedIntegrations = new Set(["API", "Planilha / exportação", "Nenhuma integração necessária"]);
    const budget = normalizeText(body.budget);
    const urgency = normalizeText(body.urgency);
    const integration = Array.isArray(body.integration) ? body.integration.map((item: unknown) => normalizeText(item)).filter((item: string) => allowedIntegrations.has(item)).slice(0, 3) : [];
    if (budget && !allowedBudgets.has(budget)) return Response.json({ error: "Faixa de orçamento inválida." }, { status: 400 });
    if (urgency && !allowedUrgencies.has(urgency)) return Response.json({ error: "Urgência inválida." }, { status: 400 });
    if (integration.includes("Nenhuma integração necessária") && integration.length > 1) return Response.json({ error: "Escolha integrações específicas ou nenhuma integração." }, { status: 400 });
    if (deadlineText && (!deadline || Number.isNaN(deadline.getTime()) || deadline < new Date())) return Response.json({ error: "Prazo inválido para solicitação de cotação." }, { status: 400 });
    if (!contactConsent) return Response.json({ error: "Confirme o consentimento para compartilhamento do seu contato." }, { status: 400 });
    if (!category || !application || !city || !state || !supplierIds.length) return Response.json({ error: "Preencha a necessidade e escolha ao menos um fornecedor." }, { status: 400 });
    if (!isValidBrazilState(state)) return Response.json({ error: "Informe uma UF brasileira válida (ex.: SP, RJ, MG)." }, { status: 400 });
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(quoteRequests).where(and(eq(quoteRequests.clientUserId, user.userId), gte(quoteRequests.createdAt, oneHourAgo)));
    if (Number(total) >= 3) return Response.json({ error: "Limite temporário atingido. Aguarde antes de enviar outra cotação." }, { status: 429 });
    const approved = await db.select({ id: leads.id }).from(leads).where(and(inArray(leads.id, supplierIds), eq(leads.role, "supplier"), eq(leads.status, "approved")));
    if (!approved.length) return Response.json({ error: "Nenhum fornecedor selecionado está disponível." }, { status: 400 });
    const protocol = `HB-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const consentSnapshot = JSON.stringify({ version: "2026-08-24", consent: true, shared: ["nome", "telefone", "empresa_ou_instagram", "necessidade"], supplierIds: approved.map((item) => item.id), acceptedAt: new Date().toISOString() });
    const [quote] = await db.insert(quoteRequests).values({ protocol, clientUserId: user.userId, category, application, quantity, city, state, deadline: deadlineText || null, notes: notes || null, budget: budget || null, urgency: urgency || null, integration: integration.length ? JSON.stringify(integration) : null, consentSnapshot }).returning();
    await db.batch(approved.map((supplier) => db.insert(quoteRecipients).values({ quoteId: quote.id, supplierId: supplier.id })).concat(approved.map((supplier) => db.insert(activityEvents).values({ actorUserId: user.userId, supplierId: supplier.id, kind: "quote_request" }))));
    return Response.json({ ok: true, protocol }, { status: 201 });
  }

  if (action === "track") {
    const kind = String(body.kind || "");
    const allowedKinds = new Set(["profile_view", "product_view", "whatsapp_click", "website_click", "contact_revealed", "quote_request"]);
    if (!allowedKinds.has(kind)) return Response.json({ error: "Evento inválido." }, { status: 400 });
    const supplierId = Number(body.supplierId);
    const productId = Number(body.productId);
    const eventId = Number(body.eventId);
    if (kind === "quote_request" && (!supplierId || supplierId <= 0)) return Response.json({ error: "Fornecedor obrigatório para esta ação." }, { status: 400 });
    if (kind === "contact_revealed" && (!supplierId || supplierId <= 0)) return Response.json({ error: "Fornecedor obrigatório para esta ação." }, { status: 400 });
    if (kind === "contact_revealed") {
      if (profile.role !== "client") return Response.json({ error: "Somente usuários podem revelar contatos." }, { status: 403 });
      const [supplier] = await db.select({ id: leads.id, phoneVerifiedAt: leads.phoneVerifiedAt }).from(leads).where(and(eq(leads.id, supplierId), eq(leads.role, "supplier"), eq(leads.status, "approved"))).limit(1);
      if (!supplier?.phoneVerifiedAt) return Response.json({ error: "Fornecedor indisponível." }, { status: 404 });
      const [existing] = await db.select({ id: activityEvents.id }).from(activityEvents).where(and(eq(activityEvents.actorUserId, user.userId), eq(activityEvents.kind, "contact_revealed"), eq(activityEvents.supplierId, supplierId))).limit(1);
      if (existing) return Response.json({ ok: true, alreadyRevealed: true });
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const [{ total }] = await db.select({ total: sql<number>`count(distinct ${activityEvents.supplierId})` }).from(activityEvents).where(and(eq(activityEvents.actorUserId, user.userId), eq(activityEvents.kind, "contact_revealed"), gte(activityEvents.createdAt, oneHourAgo)));
      if (Number(total) >= 20) return Response.json({ error: "Limite de contatos atingido. Tente novamente em uma hora." }, { status: 429 });
    }
    if (kind === "product_view" && (!productId || productId <= 0 || !supplierId || supplierId <= 0)) return Response.json({ error: "Produto e fornecedor obrigatórios." }, { status: 400 });
    await db.insert(activityEvents).values({ actorUserId: user.userId, supplierId: Number.isInteger(supplierId) && supplierId > 0 ? supplierId : null, productId: Number.isInteger(productId) && productId > 0 ? productId : null, eventId: Number.isInteger(eventId) && eventId > 0 ? eventId : null, kind });
    return Response.json({ ok: true });
  }

  if (action === "quote_response") {
    if (profile.role !== "supplier") return Response.json({ error: "Apenas o fornecedor destinatário pode atualizar esta cotação." }, { status: 403 });
    const quoteId = Number(body.quoteId);
    const responseStatus = body.responseStatus === "declined" ? "declined" : "responded";
    const [recipient] = await db.select().from(quoteRecipients).where(and(eq(quoteRecipients.quoteId, quoteId), eq(quoteRecipients.supplierId, profile.id)));
    if (!recipient) return Response.json({ error: "Cotação não encontrada para este fornecedor." }, { status: 404 });
    await db.update(quoteRecipients).set({ status: responseStatus, respondedAt: new Date().toISOString() }).where(eq(quoteRecipients.id, recipient.id));
    await db.insert(activityEvents).values({ actorUserId: user.userId, supplierId: profile.id, kind: responseStatus === "responded" ? "quote_responded" : "quote_declined" });
    if (responseStatus === "responded") { await awardCredit(db,{supplierId:profile.id,ruleKey:"quote_responded",sourceType:"quote_recipient",sourceId:recipient.id,idempotencyKey:`quote-responded:${recipient.id}`}); await recomputeHubScore(db,profile.id,"cotacao_respondida"); await qualifyReferralIfReady(db,profile.id); }
    return Response.json({ ok: true });
  }

  if (action === "activate_highlight") {
    if (profile.role !== "supplier" || profile.status !== "approved" || profile.programStatus !== "eligible") return Response.json({ error: "Sua empresa não está elegível para destaques." }, { status: 403 });
    const placement = String(body.placement || "");
    const ruleKey = placement === "map" ? "highlight_map" : placement === "search" ? "highlight_search" : placement === "product" ? "highlight_product" : "";
    const rule = ruleKey ? await ruleFor(db, ruleKey) : null;
    if (!rule || !rule.active || rule.kind !== "spend" || profile.hubScore < 40) return Response.json({ error: "Destaque indisponível. É necessário Hub Score mínimo de 40 e regra ativa." }, { status: 400 });
    const [wallet] = await db.select().from(creditWallets).where(eq(creditWallets.supplierId, profile.id));
    if (!wallet || wallet.availableBalance < rule.amount) return Response.json({ error: "Saldo de Hub Créditos insuficiente." }, { status: 400 });
    const active = await activeHighlights(db, profile.id);
    if (active.some((item: { placement: string }) => item.placement === placement)) return Response.json({ error: "Você já possui este destaque ativo." }, { status: 409 });
    const productId = Number(body.productId) || null;
    if (placement === "product") { const [product] = await db.select().from(products).where(and(eq(products.id, productId || 0), eq(products.ownerUserId, user.userId), eq(products.status, "approved"))); if (!product) return Response.json({ error: "Selecione um produto aprovado da sua empresa." }, { status: 400 }); }
    const now = new Date(); const ends = new Date(now.getTime() + 7 * 86400000);
    const [highlight] = await db.insert(highlightActivations).values({ supplierId: profile.id, productId, placement, state: profile.state, startsAt: now.toISOString(), endsAt: ends.toISOString(), creditCost: rule.amount }).returning();
    await db.insert(creditLedger).values({ supplierId: profile.id, amount: -rule.amount, direction: "debit", ruleKey, sourceType: "highlight", sourceId: highlight.id, idempotencyKey: `highlight:${highlight.id}`, note: rule.label });
    await db.update(creditWallets).set({ availableBalance: sql`${creditWallets.availableBalance} - ${rule.amount}`, totalUsed: sql`${creditWallets.totalUsed} + ${rule.amount}`, updatedAt: now.toISOString() }).where(eq(creditWallets.supplierId, profile.id));
    return Response.json({ ok: true, highlight });
  }

  if (action === "close_quote") {
    if (profile.role !== "client") return Response.json({ error: "Apenas o cliente pode encerrar a cotação." }, { status: 403 });
    const quoteId = Number(body.quoteId);
    const [quote] = await db.select().from(quoteRequests).where(and(eq(quoteRequests.id, quoteId), eq(quoteRequests.clientUserId, user.userId)));
    if (!quote) return Response.json({ error: "Cotação não encontrada." }, { status: 404 });
    await db.update(quoteRequests).set({ status: "closed", closedAt: new Date().toISOString() }).where(eq(quoteRequests.id, quoteId));
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Ação desconhecida." }, { status: 400 });
}
