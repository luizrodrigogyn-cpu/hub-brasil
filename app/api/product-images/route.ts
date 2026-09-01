import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { products } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { isHubAdmin } from "../../admin-auth";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) return new Response("Imagem não encontrada", { status: 404 });
  const [product] = await getDb().select({ id: products.id, status: products.status }).from(products).where(eq(products.imageKey, key)).limit(1);
  if (!product) return new Response("Imagem não encontrada", { status: 404, headers: { "cache-control": "private, no-store" } });
  const adminPreview = product.status !== "approved" && isHubAdmin(await getChatGPTUser());
  if (product.status !== "approved" && !adminPreview) return new Response("Imagem não encontrada", { status: 404, headers: { "cache-control": "private, no-store" } });
  const object = await env.PRODUCT_IMAGES.get(key);
  if (!object) return new Response("Imagem não encontrada", { status: 404 });
  const headers = new Headers(); object.writeHttpMetadata(headers); headers.set("cache-control", adminPreview ? "private, no-store" : "public, max-age=86400"); headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}
