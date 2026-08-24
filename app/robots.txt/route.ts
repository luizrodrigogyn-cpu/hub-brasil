export const dynamic = "force-dynamic";

export async function GET() {
  const body = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /area-testes\nDisallow: /api/\nDisallow: /sign-in\nDisallow: /sign-up\nSitemap: https://hub.niviontech.com.br/sitemap.xml\n`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
