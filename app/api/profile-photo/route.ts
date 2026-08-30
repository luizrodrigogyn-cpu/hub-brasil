import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { leads } from "../../../db/schema";
import { getTenantContext } from "../../tenant-context";
import { isAcceptedImageType, matchesImageSignature } from "../../image-security";

export async function POST(request: Request) {
  const tenant = await getTenantContext();
  if (!tenant) return Response.json({ error: "Faça login para enviar sua foto." }, { status: 401 });
  const form = await request.formData();
  const photo = form.get("photo");
  if (!(photo instanceof File) || !photo.size) return Response.json({ error: "Selecione uma foto." }, { status: 400 });
  if (!isAcceptedImageType(photo.type) || photo.size > 3 * 1024 * 1024 || !(await matchesImageSignature(photo))) return Response.json({ error: "Envie uma foto PNG, JPG ou WebP válida de até 3 MB." }, { status: 400 });
  const db = getDb();
  const [profile] = await db.select().from(leads).where(and(eq(leads.authUserId, tenant.user.userId), eq(leads.organizationId, tenant.organizationId)));
  if (!profile || profile.role !== "client") return Response.json({ error: "Cadastre o perfil de usuário antes de enviar a foto." }, { status: 400 });
  const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
  const key = `profile-photos/${profile.id}/${crypto.randomUUID()}.${extension}`;
  await env.PRODUCT_IMAGES.put(key, await photo.arrayBuffer(), { httpMetadata: { contentType: photo.type } });
  await db.update(leads).set({ profileImageKey: key, updatedAt: new Date().toISOString() }).where(eq(leads.id, profile.id));
  return Response.json({ ok: true }, { status: 201 });
}
