import { env } from "cloudflare:workers";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) return new Response("Imagem não encontrada", { status: 404 });
  const object = await env.PRODUCT_IMAGES.get(key);
  if (!object) return new Response("Imagem não encontrada", { status: 404 });
  const headers = new Headers(); object.writeHttpMetadata(headers); headers.set("cache-control", "public, max-age=86400");
  return new Response(object.body, { headers });
}
