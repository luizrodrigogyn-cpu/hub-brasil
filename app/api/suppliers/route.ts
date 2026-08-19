import { and, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { highlightActivations, leads, quoteRecipients, supplierRatings } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";

export async function GET() {
  try {
    const user = await getApiUser();
    const [viewer] = user ? await getDb().select({ id: leads.id }).from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.status, "approved"))) : [];
    const rows = await getDb().select({ id: leads.id, name: leads.company, category: leads.category, city: leads.city, state: leads.state, description: leads.description, logoKey: leads.logoKey, phone: leads.phone, instagram: leads.instagram, verificationStatus: leads.verificationStatus, verifiedAt: leads.verifiedAt, hubScore: leads.hubScore, founderMemberAt: leads.founderMemberAt, serviceStates: leads.serviceStates, services: leads.services, serviceMode: leads.serviceMode, servesNationwide: leads.servesNationwide, updatedAt: leads.updatedAt, createdAt: leads.createdAt }).from(leads).where(and(eq(leads.status, "approved"), eq(leads.role, "supplier"), isNotNull(leads.phoneVerifiedAt)));
    const [ratings, responses] = await Promise.all([
      getDb().select({ supplierName: supplierRatings.supplierName, average: sql<number>`avg(${supplierRatings.stars})`, total: sql<number>`count(*)` }).from(supplierRatings).groupBy(supplierRatings.supplierName),
      getDb().select({ supplierId: quoteRecipients.supplierId, total: sql<number>`count(*)`, responded: sql<number>`sum(case when ${quoteRecipients.status} = 'responded' then 1 else 0 end)` }).from(quoteRecipients).groupBy(quoteRecipients.supplierId),
    ]);
    const highlights = await getDb().select().from(highlightActivations).where(and(eq(highlightActivations.status, "active"), sql`${highlightActivations.endsAt} > ${new Date().toISOString()}`));
    const highlightMap = new Map(highlights.filter((item) => item.placement === "map" || item.placement === "search").map((item) => [`${item.supplierId}:${item.placement}`, item]));
    const ratingMap = new Map(ratings.map((item) => [item.supplierName, item]));
    const responseMap = new Map(responses.map((item) => [item.supplierId, item]));
    const ranked = rows.filter((item) => item.name && item.category && item.city && item.state).map((item) => {
      const digits = String(item.phone || "").replace(/\D/g, "");
      const phonePreview = digits.length >= 3 ? `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}••••-••••` : "Contato protegido";
      const completenessFields = [item.name,item.phone,item.category,item.city,item.state,item.description,item.serviceStates||item.servesNationwide,item.services];
      const completeness = completenessFields.filter(Boolean).length / completenessFields.length;
      const rating = ratingMap.get(item.name || ""); const response = responseMap.get(item.id);
      const responseRate = response?.total ? Number(response.responded) / Number(response.total) : 0;
      const fresh = Date.now() - new Date(item.updatedAt).getTime() < 120 * 86400000;
      const newSupplier = Date.now() - new Date(item.createdAt).getTime() < 30 * 86400000;
      const qualityScore = item.hubScore || Math.round((item.verificationStatus === "verified" ? 30 : 15) + completeness * 25 + (fresh ? 15 : 5) + (rating && Number(rating.total) >= 3 ? (Number(rating.average) / 5) * 20 : newSupplier ? 10 : 5) + responseRate * 10);
      const qualityReasons = [item.verificationStatus === "verified" ? "telefone e perfil verificados" : "cadastro aprovado", completeness >= .75 ? "perfil completo" : null, fresh ? "dados atualizados" : null, responseRate >= .6 ? "boa taxa de resposta" : null, newSupplier ? "novo no Hub" : null].filter(Boolean);
      const base = { ...item, phonePreview, qualityScore, qualityReasons, highlightedOnMap: highlightMap.has(`${item.id}:map`), highlightedInSearch: highlightMap.has(`${item.id}:search`), founderMember: Boolean(item.founderMemberAt), serviceStates: JSON.parse(item.serviceStates || "[]"), services: JSON.parse(item.services || "[]") };
      return viewer ? base : { id: item.id, name: "Fornecedor protegido", category: item.category, city: item.city, state: item.state, description: "Cadastre-se gratuitamente para conhecer esta empresa e acessar seus contatos.", logoKey: item.logoKey, phone: null, instagram: null, phonePreview, qualityScore, qualityReasons };
    }).sort((a,b) => Number((b as { highlightedInSearch?: boolean }).highlightedInSearch) - Number((a as { highlightedInSearch?: boolean }).highlightedInSearch) || b.qualityScore - a.qualityScore || Number(a.id) - Number(b.id));
    return Response.json({ suppliers: ranked, rankingExplanation: "Ordem baseada em verificação, completude, atualização, avaliações elegíveis e taxa de resposta. Pagamentos não alteram a posição." });
  } catch { return Response.json({ suppliers: [] }); }
}
