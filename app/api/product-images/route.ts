import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { products } from "../../../db/schema";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) return new Response("Imagem não encontrada", { status: 404 });
  const [visibleProduct] = await getDb().select({ id: products.id }).from(products).where(and(eq(products.imageKey, key), eq(products.status, "approved"))).limit(1);
  if (!visibleProduct) return new Response("Imagem não encontrada", { status: 404, headers: { "cache-control": "private, no-store" } });
  const object = await env.PRODUCT_IMAGES.get(key);
  if (!object) return new Response("Imagem não encontrada", { status: 404 });
  const headers = new Headers(); object.writeHttpMetadata(headers); headers.set("cache-control", "public, max-age=86400"); headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}
