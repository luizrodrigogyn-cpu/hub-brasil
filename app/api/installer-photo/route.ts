import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { installers } from "../../../db/schema";
import { adminAccessState, getApiUser } from "../../admin-auth";
import { getChatGPTUser } from "../../chatgpt-auth";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

async function matchesImageSignature(file: File): Promise<boolean> {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const bytes = (...values: number[]) => values.every((value, index) => header[index] === value);
  if (file.type === "image/jpeg") return bytes(0xff, 0xd8, 0xff);
  if (file.type === "image/png") return bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (file.type === "image/webp") return bytes(0x52, 0x49, 0x46, 0x46) && header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
  return false;
}

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key || !key.startsWith("installer-photos/")) return new Response("Foto não encontrada", { status: 404 });
  const [installer] = await getDb().select({ status: installers.status, contactConsent: installers.contactConsent }).from(installers).where(eq(installers.photoKey, key));
  const admin = installer?.status !== "approved" && adminAccessState(await getChatGPTUser()) === "granted";
  if (!installer || ((!installer.contactConsent || installer.status !== "approved") && !admin)) return new Response("Foto não encontrada", { status: 404 });
  const object = await env.PRODUCT_IMAGES.get(key);
  if (!object) return new Response("Foto não encontrada", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", installer.status === "approved" ? "public, max-age=86400" : "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return Response.json({ error: "Faça login para enviar sua foto." }, { status: 401 });
  const form = await request.formData();
  const photo = form.get("photo");
  const authorized = form.get("photoConsent") === "true";
  if (!(photo instanceof File) || !photo.size) return Response.json({ error: "Selecione uma foto." }, { status: 400 });
  if (!authorized) return Response.json({ error: "Confirme a autorização de uso da foto." }, { status: 400 });
  if (!acceptedTypes.has(photo.type) || photo.size > 3 * 1024 * 1024 || !(await matchesImageSignature(photo))) return Response.json({ error: "Envie uma foto JPG, PNG ou WebP válida de até 3 MB." }, { status: 400 });
  const [installer] = await getDb().select({ id: installers.id, photoKey: installers.photoKey }).from(installers).where(eq(installers.ownerUserId, user.userId));
  if (!installer) return Response.json({ error: "Cadastre o perfil de instalador antes de enviar a foto." }, { status: 400 });
  const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
  const key = `installer-photos/${installer.id}/${crypto.randomUUID()}.${extension}`;
  await env.PRODUCT_IMAGES.put(key, await photo.arrayBuffer(), { httpMetadata: { contentType: photo.type } });
  await getDb().update(installers).set({ photoKey: key, photoConsentAt: new Date().toISOString(), status: "pending", updatedAt: new Date().toISOString() }).where(eq(installers.id, installer.id));
  if (installer.photoKey) await env.PRODUCT_IMAGES.delete(installer.photoKey);
  return Response.json({ ok: true }, { status: 201 });
}
