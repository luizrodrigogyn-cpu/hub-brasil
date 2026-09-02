import { lookupCompanyByCnpj } from "../../../brasil-api";

export async function GET(_request: Request, context: { params: Promise<{ cnpj: string }> }) {
  const { cnpj } = await context.params;
  try {
    const result = await lookupCompanyByCnpj(cnpj);
    return Response.json(result, { headers: { "cache-control": "private, max-age=300" } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "provider_unavailable";
    if (reason === "invalid_cnpj") return Response.json({ error: "Informe um CNPJ válido." }, { status: 400 });
    if (reason === "company_not_found") return Response.json({ error: "CNPJ não encontrado. Você pode preencher os dados manualmente.", manualFallback: true }, { status: 404 });
    return Response.json({ error: "Consulta indisponível agora. Continue preenchendo os dados manualmente.", manualFallback: true }, { status: 503 });
  }
}
