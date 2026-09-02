import { isValidCnpj, normalizeCnpj } from "./cnpj.ts";

export type CompanyLookup = {
  cnpj: string;
  company: string;
  legalName: string;
  tradeName: string | null;
  city: string;
  state: string;
  registrationStatus: string;
  address: string | null;
};

type CacheEntry = { expiresAt: number; value: CompanyLookup };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function addressFrom(data: Record<string, unknown>) {
  const street = clean(data.logradouro);
  const number = clean(data.numero);
  const complement = clean(data.complemento);
  const district = clean(data.bairro);
  const cep = clean(data.cep);
  const parts = [street && [street, number].filter(Boolean).join(", "), complement, district, cep && `CEP ${cep}`].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export async function lookupCompanyByCnpj(
  input: string,
  options: { fetcher?: typeof fetch; timeoutMs?: number; now?: number } = {},
): Promise<{ company: CompanyLookup; cached: boolean }> {
  const cnpj = normalizeCnpj(input);
  if (!isValidCnpj(cnpj)) throw new Error("invalid_cnpj");

  const now = options.now ?? Date.now();
  const cached = cache.get(cnpj);
  if (cached && cached.expiresAt > now) return { company: cached.value, cached: true };
  if (cached) cache.delete(cnpj);

  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? 4500;
  let response: Response;
  try {
    response = await fetcher(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new Error("provider_unavailable");
  }
  if (!response.ok) throw new Error(response.status === 404 ? "company_not_found" : "provider_unavailable");

  const data = await response.json() as Record<string, unknown>;
  const legalName = clean(data.razao_social);
  const tradeName = clean(data.nome_fantasia) || null;
  const city = clean(data.municipio);
  const state = clean(data.uf).toUpperCase();
  if (!legalName || !city || !state) throw new Error("invalid_provider_response");
  const company: CompanyLookup = {
    cnpj,
    company: tradeName || legalName,
    legalName,
    tradeName,
    city,
    state,
    registrationStatus: clean(data.descricao_situacao_cadastral) || "Não informada",
    address: addressFrom(data),
  };

  if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(cnpj, { value: company, expiresAt: now + CACHE_TTL_MS });
  return { company, cached: false };
}

export function clearCompanyLookupCache() {
  cache.clear();
}
