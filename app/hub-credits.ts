import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { activityEvents, contentReports, conversationMessages, conversations, creditLedger, creditRules, creditWallets, eventInterests, favorites, founderMemberSlots, highlightActivations, hubScoreSnapshots, hubSettings, leads, needInterests, products, quoteRecipients, referrals, supplierEvents, supplierRatings, supplierUpdates } from "../db/schema";

export const DEFAULT_CREDIT_RULES = [
  ["profile_complete", "Perfil empresarial completo", 250, "earn"],
  ["approved_verified", "Telefone validado e empresa aprovada", 300, "earn"],
  ["product_approved", "Produto aprovado", 150, "earn"],
  ["update_approved", "Novidade aprovada", 100, "earn"],
  ["quote_responded", "Resposta válida a cotação", 75, "earn"],
  ["need_interest", "Participação válida em demanda", 75, "earn"],
  ["qualified_referral", "Indicação qualificada", 400, "earn"],
  ["highlight_map", "Destaque no mapa por 7 dias", 200, "spend"],
  ["highlight_search", "Destaque na busca por 7 dias", 150, "spend"],
  ["highlight_product", "Produto em destaque por 7 dias", 100, "spend"],
] as const;

export function normalizeCnpj(value: string) { return value.replace(/\D/g, ""); }

export function isValidCnpj(value: string) {
  const cnpj = normalizeCnpj(value);
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digit = (base: string, weights: number[]) => {
    const sum = base.split("").reduce((total, item, index) => total + Number(item) * weights[index], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const first = digit(cnpj.slice(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]);
  const second = digit(`${cnpj.slice(0, 12)}${first}`, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return first === Number(cnpj[12]) && second === Number(cnpj[13]);
}

export function profileCompleteness(profile: Record<string, unknown>) {
  const checks = [profile.name, profile.phone, profile.company, profile.category, profile.city, profile.state, profile.description, profile.phoneVerifiedAt, profile.serviceStates || profile.servesNationwide, profile.services];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export async function ensureCreditRules(db: any) {
  for (const [ruleKey, label, amount, kind] of DEFAULT_CREDIT_RULES) {
    await db.insert(creditRules).values({ ruleKey, label, amount, kind }).onConflictDoNothing();
  }
  await db.insert(hubSettings).values({ settingKey: "founder_member_limit", value: "15" }).onConflictDoUpdate({
    target: hubSettings.settingKey,
    set: { value: "15", updatedAt: new Date().toISOString() },
  });
}

export async function assignFounderMember(db: any, supplierId: number) {
  await ensureCreditRules(db);
  const [supplier] = await db.select().from(leads).where(eq(leads.id, supplierId));
  if (!supplier || supplier.founderMemberAt || supplier.status !== "approved" || !supplier.phoneVerifiedAt) return false;
  const claimedAt = new Date().toISOString();

  try {
    // D1 batches are committed atomically. The slot is only claimed when the
    // supplier is still eligible, and the supplier receives the seal only if
    // that exact slot was claimed in this batch.
    const [claim] = await db.batch([
      db.run(sql`
        UPDATE founder_member_slots
        SET supplier_id = ${supplierId}, claimed_at = ${claimedAt}
        WHERE slot_number = (
          SELECT slot_number
          FROM founder_member_slots
          WHERE supplier_id IS NULL
          ORDER BY slot_number ASC
          LIMIT 1
        )
        AND supplier_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM founder_member_slots WHERE supplier_id = ${supplierId}
        )
        AND EXISTS (
          SELECT 1 FROM leads
          WHERE id = ${supplierId}
            AND role = 'supplier'
            AND status = 'approved'
            AND phone_verified_at IS NOT NULL
            AND founder_member_at IS NULL
        )
      `),
      db.run(sql`
        UPDATE leads
        SET founder_member_at = ${claimedAt}
        WHERE id = ${supplierId}
          AND founder_member_at IS NULL
          AND EXISTS (
            SELECT 1 FROM founder_member_slots WHERE supplier_id = ${supplierId}
          )
      `),
    ]);
    return Number((claim as { meta?: { changes?: number } }).meta?.changes || 0) === 1;
  } catch {
    // During a rolling deployment, the application must remain available until
    // the database migration that creates the slots has been applied.
    return false;
  }
}

export async function ensureReferralCode(db: any, supplierId: number) {
  const [supplier] = await db.select().from(leads).where(eq(leads.id, supplierId));
  if (!supplier) return null;
  if (supplier.referralCode) return supplier.referralCode;
  const base = String(supplier.company || supplier.name || "EMPRESA").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 26).toUpperCase() || "EMPRESA";
  const code = `HUB-${base}-${supplierId}`;
  await db.update(leads).set({ referralCode: code }).where(eq(leads.id, supplierId));
  return code;
}

export async function ruleFor(db: any, ruleKey: string) {
  await ensureCreditRules(db);
  const [rule] = await db.select().from(creditRules).where(eq(creditRules.ruleKey, ruleKey));
  return rule;
}

export async function recomputeHubScore(db: any, supplierId: number, reason: string) {
  const [supplier] = await db.select().from(leads).where(eq(leads.id, supplierId));
  if (!supplier || supplier.role !== "supplier") return null;
  const [approvedProducts, respondedQuotes, rating] = await Promise.all([
    db.select({ total: sql<number>`count(*)` }).from(products).where(and(eq(products.ownerUserId, supplier.authUserId || ""), eq(products.status, "approved"))),
    db.select({ total: sql<number>`count(*)` }).from(quoteRecipients).where(and(eq(quoteRecipients.supplierId, supplierId), eq(quoteRecipients.status, "responded"))),
    db.select({ average: sql<number>`avg(${supplierRatings.stars})`, total: sql<number>`count(*)` }).from(supplierRatings).where(eq(supplierRatings.supplierId, supplierId)),
  ]);
  const completeness = profileCompleteness(supplier as unknown as Record<string, unknown>);
  const fresh = Date.now() - new Date(supplier.updatedAt).getTime() < 120 * 86400000;
  const score = Math.min(100, Math.round(
    (supplier.status === "approved" ? 15 : 0) +
    (supplier.phoneVerifiedAt ? 15 : 0) +
    (supplier.verificationStatus === "verified" ? 15 : 0) +
    completeness * 0.25 +
    Math.min(10, Number(approvedProducts.total) * 2) +
    Math.min(10, Number(respondedQuotes.total) * 2) +
    (Number(rating.total) >= 3 ? (Number(rating.average) / 5) * 10 : 0) +
    (fresh ? 10 : 0),
  ));
  const breakdown = { approved: supplier.status === "approved", phoneValidated: Boolean(supplier.phoneVerifiedAt), verified: supplier.verificationStatus === "verified", completeness, approvedProducts: Number(approvedProducts.total), respondedQuotes: Number(respondedQuotes.total), eligibleRatings: Number(rating.total), fresh };
  await db.update(leads).set({ hubScore: score, hubScoreUpdatedAt: new Date().toISOString() }).where(eq(leads.id, supplierId));
  await db.insert(hubScoreSnapshots).values({ supplierId, score, breakdown: JSON.stringify(breakdown), reason });
  return { score, breakdown };
}

export async function awardCredit(db: any, args: { supplierId: number; ruleKey: string; sourceType: string; sourceId?: number | null; idempotencyKey: string; note?: string }) {
  const rule = await ruleFor(db, args.ruleKey);
  if (!rule || !rule.active || rule.kind !== "earn") return { awarded: false, reason: "Regra inativa" };
  const [existing] = await db.select({ id: creditLedger.id }).from(creditLedger).where(eq(creditLedger.idempotencyKey, args.idempotencyKey));
  if (existing) return { awarded: false, reason: "Ação já registrada" };
  // db.batch garante que o lancamento no ledger e o credito na carteira sejam atomicos: sem isso, uma falha
  // entre as duas escritas deixava o ledger provando um credito que a carteira nunca recebeu — e, por causa
  // da checagem de idempotencia acima, um retry nunca mais aplicava o valor faltante.
  const [[entry]] = await db.batch([
    db.insert(creditLedger).values({ supplierId: args.supplierId, amount: rule.amount, direction: "credit", ruleKey: args.ruleKey, sourceType: args.sourceType, sourceId: args.sourceId || null, idempotencyKey: args.idempotencyKey, note: args.note || rule.label }).returning(),
    db.insert(creditWallets).values({ supplierId: args.supplierId, availableBalance: rule.amount, totalEarned: rule.amount }).onConflictDoUpdate({ target: creditWallets.supplierId, set: { availableBalance: sql`${creditWallets.availableBalance} + ${rule.amount}`, totalEarned: sql`${creditWallets.totalEarned} + ${rule.amount}`, updatedAt: new Date().toISOString() } }),
  ]);
  return { awarded: true, entry };
}

export async function qualifyReferralIfReady(db: any, referredSupplierId: number) {
  const [referral] = await db.select().from(referrals).where(eq(referrals.referredSupplierId, referredSupplierId));
  if (!referral || referral.status === "qualified") return;
  const [supplier] = await db.select().from(leads).where(eq(leads.id, referredSupplierId));
  if (!supplier || supplier.status !== "approved" || !supplier.phoneVerifiedAt || !(supplier.cnpjBlindIndex || supplier.cnpjNormalized) || profileCompleteness(supplier as unknown as Record<string, unknown>) < 80) return;
  const [[approvedProduct], [respondedQuote], [approvedUpdate], [needInterest]] = await Promise.all([
    db.select({ id: products.id }).from(products).where(and(eq(products.ownerUserId, supplier.authUserId || ""), eq(products.status, "approved"))).limit(1),
    db.select({ id: quoteRecipients.id }).from(quoteRecipients).where(and(eq(quoteRecipients.supplierId, supplier.id), eq(quoteRecipients.status, "responded"))).limit(1),
    db.select({ id: supplierUpdates.id }).from(supplierUpdates).where(and(eq(supplierUpdates.supplierId, supplier.id), eq(supplierUpdates.status, "approved"))).limit(1),
    db.select({ id: needInterests.id }).from(needInterests).where(eq(needInterests.supplierId, supplier.id)).limit(1),
  ]);
  if (!approvedProduct && !respondedQuote && !approvedUpdate && !needInterest) return;
  await db.update(referrals).set({ status: "qualified", firstUsefulActionAt: new Date().toISOString(), qualifiedAt: new Date().toISOString() }).where(eq(referrals.id, referral.id));
  await awardCredit(db, { supplierId: referral.referrerSupplierId, ruleKey: "qualified_referral", sourceType: "referral", sourceId: referral.id, idempotencyKey: `qualified-referral:${referral.id}`, note: "Indicação qualificada" });
}

export async function activeHighlights(db: any, supplierId?: number) {
  const { highlightActivations } = await import("../db/schema");
  const filters = [eq(highlightActivations.status, "active"), sql`${highlightActivations.endsAt} > ${new Date().toISOString()}`];
  if (supplierId) filters.push(eq(highlightActivations.supplierId, supplierId));
  return db.select().from(highlightActivations).where(and(...filters)).orderBy(desc(highlightActivations.endsAt));
}

// Exclusao completa de um fornecedor (usada pela gestao e por solicitacoes de privacidade/LGPD).
// Antes, a exclusao so removia produtos, eventos e o cadastro em `leads` — cotacoes, mensagens,
// creditos, destaques, indicacoes, avaliacoes, favoritos e denuncias ligados a este fornecedor
// ficavam orfaos no banco (sem FK enforcement no D1, a escrita nao falhava, so deixava lixo).
export async function deleteSupplierCascade(db: any, supplierId: number) {
  const [supplier] = await db.select().from(leads).where(eq(leads.id, supplierId));
  if (!supplier) return false;
  const ownerUserId = supplier.authUserId || "";

  // Localiza por supplierId (vínculo estável) OU ownerUserId (fallback para linhas legadas de
  // antes da migração 0020, que ainda não têm supplierId preenchido). Usar só ownerUserId
  // deixava de fora produtos/eventos cujo dono não tinha authUserId gravado, ou cujo supplierId
  // foi setado por um caminho diferente do de cadastro normal.
  const productMatch = ownerUserId ? or(eq(products.supplierId, supplierId), eq(products.ownerUserId, ownerUserId)) : eq(products.supplierId, supplierId);
  const eventMatch = ownerUserId ? or(eq(supplierEvents.supplierId, supplierId), eq(supplierEvents.ownerUserId, ownerUserId)) : eq(supplierEvents.supplierId, supplierId);
  const [ownedProducts, ownedEvents] = await Promise.all([
    db.select({ id: products.id }).from(products).where(productMatch),
    db.select({ id: supplierEvents.id }).from(supplierEvents).where(eventMatch),
  ]);
  const productIds = ownedProducts.map((item: { id: number }) => item.id);
  const eventIds = ownedEvents.map((item: { id: number }) => item.id);
  const supplierConversations = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.supplierId, supplierId));
  const conversationIds = supplierConversations.map((item: { id: number }) => item.id);

  const statements = [
    conversationIds.length ? db.delete(conversationMessages).where(inArray(conversationMessages.conversationId, conversationIds)) : null,
    conversationIds.length ? db.delete(conversations).where(inArray(conversations.id, conversationIds)) : null,
    db.delete(quoteRecipients).where(eq(quoteRecipients.supplierId, supplierId)),
    db.delete(creditLedger).where(eq(creditLedger.supplierId, supplierId)),
    db.delete(creditWallets).where(eq(creditWallets.supplierId, supplierId)),
    db.delete(highlightActivations).where(eq(highlightActivations.supplierId, supplierId)),
    db.delete(referrals).where(or(eq(referrals.referrerSupplierId, supplierId), eq(referrals.referredSupplierId, supplierId))),
    db.delete(activityEvents).where(eq(activityEvents.supplierId, supplierId)),
    db.delete(needInterests).where(eq(needInterests.supplierId, supplierId)),
    db.delete(supplierUpdates).where(eq(supplierUpdates.supplierId, supplierId)),
    db.delete(hubScoreSnapshots).where(eq(hubScoreSnapshots.supplierId, supplierId)),
    db.update(founderMemberSlots).set({ supplierId: null, claimedAt: null }).where(eq(founderMemberSlots.supplierId, supplierId)),
    db.delete(favorites).where(and(eq(favorites.entityType, "supplier"), eq(favorites.entityId, supplierId))),
    db.delete(contentReports).where(and(eq(contentReports.entityType, "supplier"), eq(contentReports.entityId, supplierId))),
    eventIds.length ? db.delete(eventInterests).where(inArray(eventInterests.eventId, eventIds)) : null,
    eventIds.length ? db.delete(favorites).where(and(eq(favorites.entityType, "event"), inArray(favorites.entityId, eventIds))) : null,
    eventIds.length ? db.delete(contentReports).where(and(eq(contentReports.entityType, "event"), inArray(contentReports.entityId, eventIds))) : null,
    productIds.length ? db.delete(favorites).where(and(eq(favorites.entityType, "product"), inArray(favorites.entityId, productIds))) : null,
    productIds.length ? db.delete(contentReports).where(and(eq(contentReports.entityType, "product"), inArray(contentReports.entityId, productIds))) : null,
    // Antes filtrava por nome/empresa: avaliações feitas sob um nome anterior (a empresa foi
    // renomeada depois) sobreviviam à exclusão. Pelo supplierId, nenhuma escapa.
    db.delete(supplierRatings).where(eq(supplierRatings.supplierId, supplierId)),
    db.delete(products).where(productMatch),
    db.delete(supplierEvents).where(eventMatch),
    db.delete(leads).where(eq(leads.id, supplierId)),
  ].filter(Boolean);

  // db.batch garante que tudo isso seja aplicado atomicamente — ou a exclusao acontece por inteiro
  // (importante para o caso de uso de LGPD) ou nao muda nada, sem risco de excluir so metade.
  await db.batch(statements as any);
  return true;
}
