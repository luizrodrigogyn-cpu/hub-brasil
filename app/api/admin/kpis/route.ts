import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { quoteRecipients, quoteRequests } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { adminAccessState } from "../../../admin-auth";

async function adminState() { return adminAccessState(await getChatGPTUser()); }

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Amostra mínima antes de exibir uma taxa/média — evita um KPI enganoso com 1 ou 2 cotações.
const MIN_SAMPLE = 5;

export async function GET() {
  const state = await adminState();
  if (state !== "granted") return Response.json({ error: state === "needs_2fa" ? "Acesso restrito ao gestor. Conclua a verificação em duas etapas (2FA) na sua conta e faça login novamente." : "Acesso restrito ao gestor." }, { status: 403 });
  const db = getDb();

  // 1) Tempo até a primeira proposta por cotação (meta: < 24h).
  const quoteRows = await db
    .select({ quoteId: quoteRequests.id, quoteCreatedAt: quoteRequests.createdAt, firstResponse: sql<string | null>`min(case when ${quoteRecipients.status} = 'responded' then ${quoteRecipients.respondedAt} end)` })
    .from(quoteRequests)
    .leftJoin(quoteRecipients, eq(quoteRecipients.quoteId, quoteRequests.id))
    .groupBy(quoteRequests.id);
  const totalQuotes = quoteRows.length;
  const respondedHours = quoteRows
    .filter((row) => row.firstResponse)
    .map((row) => (new Date(row.firstResponse as string).getTime() - new Date(row.quoteCreatedAt).getTime()) / 3600000)
    .filter((hours) => Number.isFinite(hours) && hours >= 0);
  const timeToFirstProposal = respondedHours.length >= MIN_SAMPLE ? {
    sampleSize: respondedHours.length,
    totalQuotes,
    avgHours: Math.round((respondedHours.reduce((sum, hours) => sum + hours, 0) / respondedHours.length) * 10) / 10,
    medianHours: Math.round(median(respondedHours) * 10) / 10,
    under24hPct: Math.round((respondedHours.filter((hours) => hours < 24).length / respondedHours.length) * 100),
    goalHours: 24,
  } : { sampleSize: respondedHours.length, totalQuotes, avgHours: null, medianHours: null, under24hPct: null, goalHours: 24 };

  // 2) Taxa de conversão lead → proposta enviada (cada linha de quote_recipients é um lead
  // recebido por um fornecedor; "responded" é a proposta enviada de volta ao cliente).
  const [leadStats] = await db
    .select({ total: sql<number>`count(*)`, responded: sql<number>`sum(case when ${quoteRecipients.status} = 'responded' then 1 else 0 end)` })
    .from(quoteRecipients);
  const leadsTotal = Number(leadStats?.total || 0);
  const leadsResponded = Number(leadStats?.responded || 0);
  const leadToProposalConversion = leadsTotal >= MIN_SAMPLE ? {
    sampleSize: leadsTotal,
    responded: leadsResponded,
    ratePct: Math.round((leadsResponded / leadsTotal) * 100),
  } : { sampleSize: leadsTotal, responded: leadsResponded, ratePct: null };

  return Response.json({
    timeToFirstProposal,
    leadToProposalConversion,
    // Taxa de proposta aceita e churn de fornecedor por 30 dias: não medíveis hoje. O sistema
    // registra o pedido e a resposta do fornecedor, mas não captura se o cliente fechou negócio
    // (não existe um passo de "aceitar proposta"), nem um evento de cancelamento/inatividade do
    // fornecedor que caracterize churn. Ficam fora do payload de propósito, em vez de inventar
    // um número — o admin explica o motivo.
    acceptedRateAvailable: false,
    churnAvailable: false,
    minSample: MIN_SAMPLE,
  });
}
