import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { leads } from "../../../db/schema";
import { getTenantContext } from "../../tenant-context";
import { isAcceptedImageType, matchesImageSignature } from "../../image-security";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key || !key.startsWith("supplier-logos/")) return new Response("Logo não encontrada", { status: 404 });
  const object = await env.PRODUCT_IMAGES.get(key);
  if (!object) return new Response("Logo não encontrada", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "public, max-age=86400");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}

export async function POST(request: Request) {
  const tenant = await getTenantContext();
  if (!tenant) return Response.json({ error: "Faça login para enviar uma logo." }, { status: 401 });
  const form = await request.formData();
  const logo = form.get("logo");
  const authorized = form.get("logoConsent") === "true";
  if (!(logo instanceof File) || !logo.size) return Response.json({ error: "Selecione uma imagem para a logo." }, { status: 400 });
  if (!authorized) return Response.json({ error: "Confirme a autorização de uso da logo." }, { status: 400 });
  if (!isAcceptedImageType(logo.type) || logo.size > 3 * 1024 * 1024 || !(await matchesImageSignature(logo))) return Response.json({ error: "Envie uma imagem PNG, JPG ou WebP válida de até 3 MB." }, { status: 400 });
  const [supplier] = await getDb().select({ id: leads.id }).from(leads).where(and(eq(leads.authUserId, tenant.user.userId), eq(leads.organizationId, tenant.organizationId), eq(leads.role, "supplier")));
  if (!supplier) return Response.json({ error: "Cadastre a empresa antes de enviar a logo." }, { status: 400 });
  const extension = logo.type === "image/png" ? "png" : logo.type === "image/webp" ? "webp" : "jpg";
  const key = `supplier-logos/${supplier.id}/${crypto.randomUUID()}.${extension}`;
  await env.PRODUCT_IMAGES.put(key, await logo.arrayBuffer(), { httpMetadata: { contentType: logo.type } });
  await getDb().update(leads).set({ logoKey: key, logoConsentAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(leads.id, supplier.id));
  return Response.json({ key, url: `/api/supplier-logo?key=${encodeURIComponent(key)}` }, { status: 201 });
}
