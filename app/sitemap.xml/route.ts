import { niches } from "../solucoes/niches";

export const dynamic = "force-dynamic";

const BASE_URL = "https://hub.niviontech.com.br";

function urlEntry(path: string, changefreq: string, priority: string) {
  return `<url><loc>${BASE_URL}${path}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

export async function GET() {
  const staticEntries = [
    urlEntry("/", "daily", "1.0"),
    urlEntry("/solucoes", "weekly", "0.9"),
    ...niches.map((niche) => urlEntry(`/solucoes/${niche.slug}`, "weekly", "0.8")),
    urlEntry("/privacidade", "yearly", "0.2"),
    urlEntry("/termos", "yearly", "0.2"),
  ];

  // Perfis de fornecedores continuam fora do sitemap enquanto o conteúdo público
  // estiver anonimizado. Isso evita indexar páginas protegidas ou duplicadas.
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticEntries.join("")}</urlset>`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
