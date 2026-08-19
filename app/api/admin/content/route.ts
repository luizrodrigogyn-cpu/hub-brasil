import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { contentReports, creditLedger, creditWallets, deletionRequests, highlightActivations, leads, marketNeeds, moderationAudit, products, sectorNews, supplierEvents, supplierUpdates, technicalArticles } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { isAdminEmail } from "../../../admin-auth";
import { assignFounderMember, awardCredit, ensureReferralCode, qualifyReferralIfReady, recomputeHubScore } from "../../../hub-credits";

async function authorized() { const user = await getChatGPTUser(); return user && isAdminEmail(user.email); }

export async function GET() {
  if (!(await authorized())) return Response.json({ error: "Acesso restrito ao gestor." }, { status: 403 });
  const db = getDb();
  const [suppliers, productRows, events, needs, updates, articles, news, reports, deletions, audit] = await Promise.all([
    db.select().from(leads).where(eq(leads.role, "supplier")).orderBy(desc(leads.createdAt)),
    db.select().from(products).orderBy(desc(products.createdAt)),
    db.select().from(supplierEvents).orderBy(desc(supplierEvents.createdAt)),
    db.select().from(marketNeeds).orderBy(desc(marketNeeds.createdAt)),
    db.select().from(supplierUpdates).orderBy(desc(supplierUpdates.createdAt)),
    db.select().from(technicalArticles).orderBy(desc(technicalArticles.createdAt)),
    db.select().from(sectorNews).orderBy(desc(sectorNews.createdAt)),
    db.select().from(contentReports).orderBy(desc(contentReports.createdAt)),
    db.select().from(deletionRequests).orderBy(desc(deletionRequests.requestedAt)),
    db.select().from(moderationAudit).orderBy(desc(moderationAudit.createdAt)).limit(50),
  ]);
  const [wallets, credits, highlights] = await Promise.all([db.select().from(creditWallets), db.select().from(creditLedger).orderBy(desc(creditLedger.createdAt)).limit(100), db.select().from(highlightActivations).orderBy(desc(highlightActivations.createdAt)).limit(100)]);
  return Response.json({ suppliers, products: productRows, events, needs, updates, articles, news, reports, deletions, audit, wallets, credits, highlights });
}

export async function POST(request: Request) {
  const admin = await getChatGPTUser();
  if (!admin || !isAdminEmail(admin.email)) return Response.json({ error: "Acesso restrito ao gestor." }, { status: 403 });
  const body = await request.json() as { entity?: string; id?: number; action?: string; value?: string; title?:string; summary?:string; content?:string; category?:string; author?:string; sourceName?:string; sourceUrl?:string; imageUrl?:string; publishedAt?:string };
  if (!body.entity || !body.action || (!["create_article", "create_news"].includes(body.action) && !body.id)) return Response.json({ error: "Ação inválida." }, { status: 400 });
  const db = getDb();
  if (body.entity === "supplier") {
    if (body.action === "verify_phone") { await db.update(leads).set({ phoneVerifiedAt: new Date().toISOString() }).where(eq(leads.id, body.id)); await recomputeHubScore(db, body.id!, "telefone_validado"); }
    else if (body.action === "confirm_cnpj") await db.update(leads).set({ cnpjValidationStatus: "manually_confirmed" }).where(eq(leads.id, body.id));
    else if (body.action === "grant_verified") { const [supplier] = await db.select().from(leads).where(eq(leads.id, body.id)); if (!supplier?.phoneVerifiedAt || supplier.status !== "approved") return Response.json({ error: "Aprove e valide o telefone antes de conceder o selo." }, { status: 400 }); await db.update(leads).set({ verificationStatus: "verified", verifiedAt: new Date().toISOString() }).where(eq(leads.id, body.id)); await recomputeHubScore(db,body.id!,"selo_verificado"); }
    else if (body.action === "suspend_verified") await db.update(leads).set({ verificationStatus: "suspended", verifiedAt: null }).where(eq(leads.id, body.id));
    else if (body.action === "approve") { const [supplier] = await db.select().from(leads).where(eq(leads.id, body.id)); if (!supplier?.phoneVerifiedAt) return Response.json({ error: "Valide o telefone antes de aprovar." }, { status: 400 }); await db.update(leads).set({ status: "approved" }).where(eq(leads.id, body.id)); await ensureReferralCode(db,body.id!); await awardCredit(db,{supplierId:body.id!,ruleKey:"approved_verified",sourceType:"supplier",sourceId:body.id!,idempotencyKey:`approved-verified:${body.id}`}); await assignFounderMember(db,body.id!); await recomputeHubScore(db,body.id!,"fornecedor_aprovado"); await qualifyReferralIfReady(db,body.id!); }
    else if (body.action === "reject") await db.update(leads).set({ status: "rejected", verificationStatus: "unverified", verifiedAt: null }).where(eq(leads.id, body.id));
    else if (body.action === "edit_company") await db.update(leads).set({ company: String(body.value || "").trim() }).where(eq(leads.id, body.id));
    else if (body.action === "delete") { const [supplier] = await db.select().from(leads).where(eq(leads.id, body.id)); if (supplier?.authUserId) { await db.delete(products).where(eq(products.ownerUserId, supplier.authUserId)); await db.delete(supplierEvents).where(eq(supplierEvents.ownerUserId, supplier.authUserId)); } await db.delete(leads).where(eq(leads.id, body.id)); }
  } else if (body.entity === "product") {
    if (body.action === "approve") { const [product] = await db.select().from(products).where(eq(products.id, body.id)); const [supplier] = product?.ownerUserId ? await db.select().from(leads).where(eq(leads.authUserId, product.ownerUserId)) : []; if (!supplier || supplier.status !== "approved" || !supplier.phoneVerifiedAt) return Response.json({ error: "O fornecedor ainda não está aprovado." }, { status: 400 }); await db.update(products).set({ status: "approved" }).where(eq(products.id, body.id)); await awardCredit(db,{supplierId:supplier.id,ruleKey:"product_approved",sourceType:"product",sourceId:body.id!,idempotencyKey:`product-approved:${body.id}`}); await recomputeHubScore(db,supplier.id,"produto_aprovado"); await qualifyReferralIfReady(db,supplier.id); }
    else if (body.action === "reject") await db.update(products).set({ status: "rejected" }).where(eq(products.id, body.id));
    else if (body.action === "edit_name") await db.update(products).set({ name: String(body.value || "").trim() }).where(eq(products.id, body.id));
    else if (body.action === "delete") await db.delete(products).where(eq(products.id, body.id));
  } else if (body.entity === "event") {
    if (body.action === "approve") { const [event] = await db.select().from(supplierEvents).where(eq(supplierEvents.id, body.id)); if (!event) return Response.json({ error: "Evento não encontrado." }, { status: 404 }); if (event.ownerUserId) { const [supplier] = await db.select().from(leads).where(eq(leads.authUserId, event.ownerUserId)); if (!supplier || supplier.status !== "approved" || !supplier.phoneVerifiedAt) return Response.json({ error: "O fornecedor ainda não está aprovado." }, { status: 400 }); } await db.update(supplierEvents).set({ status: "approved" }).where(eq(supplierEvents.id, body.id)); }
    else if (body.action === "reject") await db.update(supplierEvents).set({ status: "rejected" }).where(eq(supplierEvents.id, body.id));
    else if (body.action === "edit_name") await db.update(supplierEvents).set({ name: String(body.value || "").trim() }).where(eq(supplierEvents.id, body.id));
    else if (body.action === "delete") await db.delete(supplierEvents).where(eq(supplierEvents.id, body.id));
  } else if (body.entity === "report") {
    if (body.action === "resolve") await db.update(contentReports).set({ status: "resolved" }).where(eq(contentReports.id, body.id));
    else if (body.action === "dismiss") await db.update(contentReports).set({ status: "dismissed" }).where(eq(contentReports.id, body.id));
    else if (body.action === "delete") await db.delete(contentReports).where(eq(contentReports.id, body.id));
  } else if (body.entity === "need") {
    if (body.action === "approve") await db.update(marketNeeds).set({ status: "approved" }).where(eq(marketNeeds.id, body.id));
    else if (body.action === "reject") await db.update(marketNeeds).set({ status: "rejected" }).where(eq(marketNeeds.id, body.id));
    else if (body.action === "delete") await db.delete(marketNeeds).where(eq(marketNeeds.id, body.id));
  } else if (body.entity === "update") {
    if (body.action === "approve") { const [update] = await db.select().from(supplierUpdates).where(eq(supplierUpdates.id,body.id)); await db.update(supplierUpdates).set({ status: "approved", publishedAt: new Date().toISOString() }).where(eq(supplierUpdates.id, body.id)); if(update){await awardCredit(db,{supplierId:update.supplierId,ruleKey:"update_approved",sourceType:"update",sourceId:body.id!,idempotencyKey:`update-approved:${body.id}`});await qualifyReferralIfReady(db,update.supplierId);} }
    else if (body.action === "reject") await db.update(supplierUpdates).set({ status: "rejected" }).where(eq(supplierUpdates.id, body.id));
    else if (body.action === "delete") await db.delete(supplierUpdates).where(eq(supplierUpdates.id, body.id));
  } else if (body.entity === "article") {
    if (body.action === "create_article") { const title=String(body.title||"").trim(),summary=String(body.summary||"").trim(),content=String(body.content||"").trim(),category=String(body.category||"").trim(); if(!title||!summary||!content||!category)return Response.json({error:"Preencha título, resumo, conteúdo e categoria."},{status:400}); const slug=`${title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}-${Date.now().toString(36)}`; const [article]=await db.insert(technicalArticles).values({title,slug,summary,content,category,author:String(body.author||admin.email),sourceType:"editorial",status:"published",reviewedAt:new Date().toISOString()}).returning(); await db.insert(moderationAudit).values({adminEmail:admin.email,entity:"article",entityId:article.id,action:"create_article"}); return Response.json({ok:true}); }
    if (body.action === "publish" || body.action === "approve") await db.update(technicalArticles).set({ status:"published", reviewedAt:new Date().toISOString() }).where(eq(technicalArticles.id, body.id));
    else if (body.action === "unpublish" || body.action === "reject") await db.update(technicalArticles).set({ status:"draft" }).where(eq(technicalArticles.id, body.id));
    else if (body.action === "edit_name") await db.update(technicalArticles).set({ title:String(body.value||"").trim() }).where(eq(technicalArticles.id, body.id));
    else if (body.action === "delete") await db.delete(technicalArticles).where(eq(technicalArticles.id, body.id));
  } else if (body.entity === "news") {
    if (body.action === "create_news") {
      const title = String(body.title || "").trim();
      const summary = String(body.summary || "").trim();
      const category = String(body.category || "").trim();
      const sourceName = String(body.sourceName || "").trim();
      const sourceUrl = String(body.sourceUrl || "").trim();
      const publishedAt = String(body.publishedAt || new Date().toISOString()).trim();
      if (!title || !summary || !category || !sourceName || !/^https:\/\//i.test(sourceUrl)) return Response.json({ error: "Preencha os dados e informe um link HTTPS válido." }, { status: 400 });
      const [newsItem] = await db.insert(sectorNews).values({ title, summary, category, sourceName, sourceUrl, imageUrl: String(body.imageUrl || "").trim() || null, publishedAt, status: "pending", origin: "manual" }).returning();
      await db.insert(moderationAudit).values({ adminEmail: admin.email, entity: "news", entityId: newsItem.id, action: "create_news" });
      return Response.json({ ok: true });
    }
    if (body.action === "approve") await db.update(sectorNews).set({ status: "approved" }).where(eq(sectorNews.id, body.id));
    else if (body.action === "reject") await db.update(sectorNews).set({ status: "rejected" }).where(eq(sectorNews.id, body.id));
    else if (body.action === "edit_name") await db.update(sectorNews).set({ title: String(body.value || "").trim() }).where(eq(sectorNews.id, body.id));
    else if (body.action === "delete") await db.delete(sectorNews).where(eq(sectorNews.id, body.id));
  } else if (body.entity === "credit") {
    if (body.action === "adjust") {
      const supplierId = Number(body.id), amount = Number(body.value);
      if (!Number.isInteger(amount) || !amount) return Response.json({ error: "Informe um ajuste inteiro diferente de zero." }, { status: 400 });
      await db.insert(creditLedger).values({ supplierId, amount, direction: amount > 0 ? "credit" : "debit", ruleKey: "admin_adjustment", sourceType: "admin", idempotencyKey: `admin-adjust:${supplierId}:${crypto.randomUUID()}`, note: "Ajuste administrativo" });
      await db.insert(creditWallets).values({ supplierId, availableBalance: amount, totalEarned: Math.max(0, amount), totalUsed: Math.max(0, -amount) }).onConflictDoUpdate({ target: creditWallets.supplierId, set: { availableBalance: sql`${creditWallets.availableBalance} + ${amount}`, totalEarned: sql`${creditWallets.totalEarned} + ${Math.max(0, amount)}`, totalUsed: sql`${creditWallets.totalUsed} + ${Math.max(0, -amount)}`, updatedAt: new Date().toISOString() } });
    } else if (body.action === "cancel_highlight") await db.update(highlightActivations).set({ status: "cancelled", cancelledAt: new Date().toISOString(), cancelledBy: admin.email, cancelReason: String(body.value || "Cancelado pela gestão") }).where(eq(highlightActivations.id, body.id));
  } else if (body.entity === "deletion") {
    if (body.action === "complete" || body.action === "approve") await db.update(deletionRequests).set({status:"completed",completedAt:new Date().toISOString()}).where(eq(deletionRequests.id,body.id));
    else if (body.action === "reject") await db.update(deletionRequests).set({status:"rejected"}).where(eq(deletionRequests.id,body.id));
    else if (body.action === "delete") await db.delete(deletionRequests).where(eq(deletionRequests.id,body.id));
  }
  await db.insert(moderationAudit).values({ adminEmail: admin.email, entity: body.entity, entityId: body.id!, action: body.action });
  return Response.json({ ok: true });
}
