import { and, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { activityEvents, highlightActivations, leads, products, quoteRecipients, supplierRatings } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";
import { decryptPii } from "../../pii-crypto";

function parsePriceTokens(text: string | null | undefined): number[] {
  if (!text) return [];
  const matches = text.match(/\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?/g);
  if (!matches) return [];
  return matches.map((raw) => Number(raw.replace(/\./g, "").replace(",", "."))).filter((value) => Number.isFinite(value) && value > 0);
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function slaLabelFromHours(hours: number): string {
  if (hours < 1) return "menos de 1h";
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.round(hours / 24);
  return `${days} dia${days > 1 ? "s" : ""}`;
}

function parseStringArray(value: string | null | undefined): string[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

// Resposta varia por sessão (telefone revelado, contatos, nome real x "Fornecedor protegido").
// Só é seguro colocar em cache compartilhado/edge quando não há viewer autenticado — caso
// contrário um visitante anônimo poderia herdar dados de outra pessoa da borda.
function cacheHeaders(personalized: boolean) {
  return { "cache-control": personalized ? "private, no-store" : "public, max-age=30, stale-while-revalidate=120, s-maxage=30", vary: "Cookie" };
}

export async function GET() {
  try {
    const user = await getApiUser();
    const [viewer] = user ? await getDb().select({ id: leads.id, role: leads.role }).from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.status, "approved"))) : [];
    const revealedRows = viewer?.role === "client" ? await getDb().select({ supplierId: activityEvents.supplierId }).from(activityEvents).where(and(eq(activityEvents.actorUserId, user!.userId), eq(activityEvents.kind, "contact_revealed"))) : [];
    const revealedIds = new Set(revealedRows.map((row) => row.supplierId));
    const encryptedRows = await getDb().select({ id: leads.id, name: leads.company, category: leads.category, categories: leads.categories, city: leads.city, state: leads.state, description: leads.description, logoKey: leads.logoKey, phone: leads.phone, phoneEncrypted: leads.phoneEncrypted, instagram: leads.instagram, instagramEncrypted: leads.instagramEncrypted, website: leads.website, verificationStatus: leads.verificationStatus, verifiedAt: leads.verifiedAt, hubScore: leads.hubScore, founderMemberAt: leads.founderMemberAt, serviceStates: leads.serviceStates, services: leads.services, serviceMode: leads.serviceMode, servesNationwide: leads.servesNationwide, updatedAt: leads.updatedAt, createdAt: leads.createdAt }).from(leads).where(and(eq(leads.status, "approved"), eq(leads.role, "supplier"), isNotNull(leads.phoneVerifiedAt)));
    const rows = await Promise.all(encryptedRows.map(async (item) => ({ ...item, phone: await decryptPii(item.phoneEncrypted || item.phone), instagram: await decryptPii(item.instagramEncrypted || item.instagram) })));
    // Avaliações e produtos agora são agrupados por supplierId (estável) em vez do texto
    // supplierName salvo na linha — que fica desatualizado se a gestão renomear a empresa.
    const [ratings, responses, slaRows, priceRows, productCountRows] = await Promise.all([
      getDb().select({ supplierId: supplierRatings.supplierId, average: sql<number>`avg(${supplierRatings.stars})`, total: sql<number>`count(*)` }).from(supplierRatings).where(isNotNull(supplierRatings.supplierId)).groupBy(supplierRatings.supplierId),
      getDb().select({ supplierId: quoteRecipients.supplierId, total: sql<number>`count(*)`, responded: sql<number>`sum(case when ${quoteRecipients.status} = 'responded' then 1 else 0 end)` }).from(quoteRecipients).groupBy(quoteRecipients.supplierId),
      getDb().select({ supplierId: quoteRecipients.supplierId, avgHours: sql<number>`avg((julianday(${quoteRecipients.respondedAt}) - julianday(${quoteRecipients.createdAt})) * 24)`, respondedCount: sql<number>`count(*)` }).from(quoteRecipients).where(and(eq(quoteRecipients.status, "responded"), isNotNull(quoteRecipients.respondedAt))).groupBy(quoteRecipients.supplierId),
      getDb().select({ supplierId: products.supplierId, averagePrice: products.averagePrice }).from(products).where(and(eq(products.status, "approved"), isNotNull(products.averagePrice), isNotNull(products.supplierId))),
      getDb().select({ supplierId: products.supplierId, total: sql<number>`count(*)` }).from(products).where(and(eq(products.status, "approved"), isNotNull(products.supplierId))).groupBy(products.supplierId),
    ]);
    const slaMap = new Map(slaRows.map((item) => [item.supplierId, item]));
    // Estatística da plataforma (não de um fornecedor específico) usada nas chamadas de ação
    // recorrentes ("responda em média em X"). Só é exibida com amostra mínima para não virar
    // promessa vazia num Hub com poucas cotações respondidas ainda.
    const platformRespondedTotal = slaRows.reduce((sum, item) => sum + Number(item.respondedCount || 0), 0);
    const platformWeightedHours = slaRows.reduce((sum, item) => sum + Number(item.avgHours || 0) * Number(item.respondedCount || 0), 0);
    const platformSlaLabel = platformRespondedTotal >= 5 ? slaLabelFromHours(platformWeightedHours / platformRespondedTotal) : null;
    const priceMap = new Map<number, number[]>();
    for (const row of priceRows) {
      const tokens = parsePriceTokens(row.averagePrice);
      if (!tokens.length || row.supplierId == null) continue;
      priceMap.set(row.supplierId, [...(priceMap.get(row.supplierId) || []), ...tokens]);
    }
    const productCountMap = new Map(productCountRows.filter((item) => item.supplierId != null).map((item) => [item.supplierId as number, Number(item.total)]));
    const highlights = await getDb().select().from(highlightActivations).where(and(eq(highlightActivations.status, "active"), sql`${highlightActivations.endsAt} > ${new Date().toISOString()}`));
    const highlightMap = new Map(highlights.filter((item) => item.placement === "map" || item.placement === "search").map((item) => [`${item.supplierId}:${item.placement}`, item]));
    const ratingMap = new Map(ratings.filter((item) => item.supplierId != null).map((item) => [item.supplierId as number, item]));
    const responseMap = new Map(responses.map((item) => [item.supplierId, item]));
    const ranked = rows.filter((item) => item.name && item.category && item.city && item.state).map((item) => {
      const digits = String(item.phone || "").replace(/\D/g, "");
      const phonePreview = digits.length >= 3 ? `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}••••-••••` : "Contato protegido";
      const completenessFields = [item.name,item.phone,item.category,item.city,item.state,item.description,item.serviceStates||item.servesNationwide,item.services];
      const completeness = completenessFields.filter(Boolean).length / completenessFields.length;
      const rating = ratingMap.get(item.id); const response = responseMap.get(item.id);
      const quoteRequests = Number(response?.total || 0);
      const quoteResponses = Number(response?.responded || 0);
      const responseRate = response?.total ? Number(response.responded) / Number(response.total) : 0;
      const fresh = Date.now() - new Date(item.updatedAt).getTime() < 120 * 86400000;
      const newSupplier = Date.now() - new Date(item.createdAt).getTime() < 30 * 86400000;
      const qualityScore = item.hubScore || Math.round((item.verificationStatus === "verified" ? 30 : 15) + completeness * 25 + (fresh ? 15 : 5) + (rating && Number(rating.total) >= 3 ? (Number(rating.average) / 5) * 20 : newSupplier ? 10 : 5) + responseRate * 10);
      const qualityReasons = [item.verificationStatus === "verified" ? "telefone e perfil verificados" : "cadastro aprovado", completeness >= .75 ? "perfil completo" : null, fresh ? "dados atualizados" : null, responseRate >= .6 ? "boa taxa de resposta" : null, newSupplier ? "novo no Hub" : null].filter(Boolean);
      const parsedCategories = parseStringArray(item.categories);
      const categories = parsedCategories.length ? parsedCategories : [item.category];
      const contactRevealed = revealedIds.has(item.id);
      const cleanInstagram = String(item.instagram || "").replace(/^@/, "");
      const instagramPreview = cleanInstagram ? (cleanInstagram.length > 2 ? `@${cleanInstagram.slice(0, 2)}${"•".repeat(Math.max(3, cleanInstagram.length - 2))}` : "Instagram protegido") : null;
      const parsedServiceStates = [...new Set(parseStringArray(item.serviceStates))];
      const additionalStates = parsedServiceStates.filter((state) => state !== item.state);
      const serviceAreaLabel = item.servesNationwide ? "Atende todo o Brasil" : additionalStates.length ? `Atende ${item.state} + ${additionalStates.length} estado${additionalStates.length > 1 ? "s" : ""}` : `Atende ${item.state}`;
      const sla = slaMap.get(item.id);
      const slaLabel = sla && Number(sla.respondedCount) >= 3 ? `Responde em média em ${slaLabelFromHours(Number(sla.avgHours))}` : null;
      const priceTokens = priceMap.get(item.id) || [];
      const priceRangeLabel = priceTokens.length ? (Math.min(...priceTokens) === Math.max(...priceTokens) ? `A partir de ${formatCurrency(Math.min(...priceTokens))}` : `${formatCurrency(Math.min(...priceTokens))} – ${formatCurrency(Math.max(...priceTokens))}`) : null;
      const productCount = productCountMap.get(item.id) || 0;
      // Selos exibidos no card: exigem amostra mínima para não virar promessa vazia
      // ("resposta rápida" com 1 cotação respondida em 100% não é sinal confiável).
      const fastResponder = quoteRequests >= 3 && responseRate >= 0.6;
      const base = { ...item, phone: contactRevealed ? item.phone : null, instagram: contactRevealed ? item.instagram : instagramPreview, contactRevealed, categories, phonePreview, qualityScore, qualityReasons, quoteRequests, quoteResponses, responseRate, highlightedOnMap: highlightMap.has(`${item.id}:map`), highlightedInSearch: highlightMap.has(`${item.id}:search`), founderMember: Boolean(item.founderMemberAt), serviceStates: parsedServiceStates, services: parseStringArray(item.services), slaLabel, priceRangeLabel, productCount, serviceAreaLabel, newSupplier, fastResponder };
      return viewer ? base : { id: item.id, name: "Fornecedor protegido", category: item.category, city: item.city, state: item.state, description: "Cadastre-se gratuitamente para conhecer esta empresa e acessar seus contatos.", logoKey: item.logoKey, phone: null, instagram: null, website: null, contactRevealed: false, phonePreview, qualityScore, qualityReasons, slaLabel, priceRangeLabel, productCount, serviceAreaLabel, newSupplier, fastResponder };
    }).sort((a,b) => Number((b as { highlightedInSearch?: boolean }).highlightedInSearch) - Number((a as { highlightedInSearch?: boolean }).highlightedInSearch) || b.qualityScore - a.qualityScore || Number(a.id) - Number(b.id));
    return Response.json({ suppliers: ranked, rankingExplanation: "Ordem baseada em verificação, completude, atualização, avaliações elegíveis e taxa de resposta. Pagamentos não alteram a posição.", platformSlaLabel }, { headers: cacheHeaders(Boolean(viewer)) });
  } catch { return Response.json({ suppliers: [] }); }
}
