import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { highlightActivations, leads, products } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";
import { getTenantContext } from "../../tenant-context";
import { FEATURES, requireFeature } from "../../features";
import { decryptPii } from "../../pii-crypto";

const arraySpecFields = new Set(["technology", "application", "features"]);
const textSpecFields = new Set(["ip", "battery", "warranty"]);

// Mesma lista de app/api/supplier-logo/route.ts. SVG é deliberadamente excluído: é servido do
// mesmo domínio e pode carregar <script> — abriria XSS se alguém acessar a imagem diretamente
// (fora de uma tag <img>, que já neutraliza scripts, mas não protege navegação direta/objeto).
const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

// Confere a assinatura real dos bytes, não só o content-type declarado pelo navegador —
// um arquivo malicioso pode se anunciar como "image/png" mas conter outro conteúdo.
async function matchesImageSignature(file: File): Promise<boolean> {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const bytes = (...values: number[]) => values.every((value, index) => header[index] === value);
  if (file.type === "image/jpeg") return bytes(0xff, 0xd8, 0xff);
  if (file.type === "image/png") return bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (file.type === "image/webp") return bytes(0x52, 0x49, 0x46, 0x46) && header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
  return false;
}

function normalizeSpecs(raw: string) {
  if (!raw || raw.length > 5_000) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const source = parsed as Record<string, unknown>;
    const normalized: Record<string, string | string[] | boolean> = {};
    for (const field of arraySpecFields) {
      if (Array.isArray(source[field])) normalized[field] = source[field].filter((value): value is string => typeof value === "string").map((value) => value.trim().slice(0, 80)).filter(Boolean).slice(0, 12);
    }
    for (const field of textSpecFields) {
      if (typeof source[field] === "string" && source[field].trim()) normalized[field] = source[field].trim().slice(0, 120);
    }
    if (source.anatel === true) normalized.anatel = true;
    return Object.keys(normalized).length ? JSON.stringify(normalized) : null;
  } catch {
    return null;
  }
}

// Igual a /api/suppliers: resposta varia por sessão (nome do fornecedor, telefone,
// detalhes técnicos completos). Só cacheável na borda quando não há viewer autenticado.
function cacheHeaders(personalized: boolean) {
  return { "cache-control": personalized ? "private, no-store" : "public, max-age=30, stale-while-revalidate=120, s-maxage=30", vary: "Cookie" };
}

export async function GET() {
  try {
    const user = await getApiUser();
    const [viewer] = user ? await getDb().select({ id: leads.id }).from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.status, "approved"))) : [];
    const db = getDb();
    const rows = await db.select({ id: products.id, supplierId: products.supplierId, supplierName: products.supplierName, name: products.name, category: products.category, technicalDetails: products.technicalDetails, averagePrice: products.averagePrice, imageKey: products.imageKey, specs: products.specs, manualUrl: products.manualUrl }).from(products).where(eq(products.status, "approved")).orderBy(desc(products.createdAt));
    const highlights = await db.select({ productId: highlightActivations.productId }).from(highlightActivations).where(and(eq(highlightActivations.placement,"product"),eq(highlightActivations.status,"active"),sql`${highlightActivations.endsAt} > ${new Date().toISOString()}`));
    const highlighted = new Set(highlights.map((item)=>item.productId));
    // Antes: casamento por supplierName (texto) — quebrava quando a gestão renomeava a empresa
    // depois do produto cadastrado (o nome salvo no produto ficava desatualizado). Agora o
    // vínculo é pelo supplierId (estável), com o nome buscado sempre atualizado de `leads`.
    // Poucos produtos antigos sem supplierId (pré-migração, sem match encontrado) caem no
    // fallback por nome abaixo.
    const supplierIds = viewer ? [...new Set(rows.map((item) => item.supplierId).filter((id): id is number => id != null))] : [];
    const legacyNames = viewer ? [...new Set(rows.filter((item) => item.supplierId == null).map((item) => item.supplierName).filter(Boolean))] : [];
    const [supplierRowsById, supplierRowsByName] = await Promise.all([
      supplierIds.length ? db.select({ id: leads.id, phone: leads.phone, phoneEncrypted: leads.phoneEncrypted, company: leads.company, name: leads.name }).from(leads).where(and(inArray(leads.id, supplierIds), eq(leads.role, "supplier"), eq(leads.status, "approved"))) : [],
      legacyNames.length ? db.select({ id: leads.id, phone: leads.phone, phoneEncrypted: leads.phoneEncrypted, company: leads.company, name: leads.name }).from(leads).where(and(or(inArray(leads.company, legacyNames), inArray(leads.name, legacyNames)), eq(leads.role, "supplier"), eq(leads.status, "approved"))) : [],
    ]);
    const decryptedById = await Promise.all(supplierRowsById.map(async (supplier) => ({ ...supplier, phone: await decryptPii(supplier.phoneEncrypted || supplier.phone) })));
    const decryptedByName = await Promise.all(supplierRowsByName.map(async (supplier) => ({ ...supplier, phone: await decryptPii(supplier.phoneEncrypted || supplier.phone) })));
    const supplierById = new Map(decryptedById.map((supplier) => [supplier.id, supplier]));
    const supplierByName = new Map<string, { id: number; phone: string | null; company: string | null; name: string }>();
    for (const supplier of decryptedByName) {
      if (supplier.company) supplierByName.set(supplier.company, supplier);
      if (supplier.name) supplierByName.set(supplier.name, supplier);
    }
    const visibleProducts = rows.map((item) => {
      const supplier = viewer ? (item.supplierId != null ? supplierById.get(item.supplierId) : supplierByName.get(item.supplierName)) : null;
      let specs: unknown = null;
      if (item.specs) { try { specs = JSON.parse(item.specs); } catch { specs = null; } }
      const currentName = supplier ? supplier.company || supplier.name : item.supplierName;
      return { id: item.id, supplierId: viewer ? supplier?.id || null : null, supplierName: viewer ? currentName : "Fornecedor protegido", supplierPhone: viewer ? supplier?.phone || null : null, name: item.name, category: item.category, technicalDetails: viewer ? item.technicalDetails : "", highlighted: highlighted.has(item.id), imageUrl: item.imageKey ? `/api/product-images?key=${encodeURIComponent(item.imageKey)}` : null, specs, manualUrl: item.manualUrl || null, averagePrice: item.averagePrice || null };
    });
    return Response.json({ products: visibleProducts }, { headers: cacheHeaders(Boolean(viewer)) });
  } catch { return Response.json({ products: [] }); }
}

export async function POST(request: Request) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return Response.json({ error: "Faça login para publicar.", signIn: "/sign-in?return_to=/" }, { status: 401 });
    const { user, organizationId } = tenant;
    const featureError = await requireFeature(organizationId, FEATURES.directory);
    if (featureError) return featureError;
    const [supplier] = await getDb().select().from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.organizationId, organizationId), eq(leads.role, "supplier")));
    // O fornecedor pode preparar o catálogo logo após concluir o cadastro.
    // O produto nasce como pendente e nunca aparece publicamente antes da revisão da gestão.
    if (!supplier || supplier.status === "rejected") return Response.json({ error: "Seu cadastro de fornecedor não está habilitado para enviar produtos." }, { status: 403 });
    const form = await request.formData();
    const photo = form.get("photo");
    let imageKey: string | null = null;
    if (photo instanceof File && photo.size > 0) {
      if (!acceptedImageTypes.has(photo.type) || photo.size > 5_000_000) return Response.json({ error: "Envie uma imagem JPG, PNG ou WebP de até 5 MB." }, { status: 400 });
      if (!(await matchesImageSignature(photo))) return Response.json({ error: "O arquivo enviado não é uma imagem válida." }, { status: 400 });
      imageKey = `${crypto.randomUUID()}-${photo.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      await env.PRODUCT_IMAGES.put(imageKey, await photo.arrayBuffer(), { httpMetadata: { contentType: photo.type } });
    }
    const specifications = String(form.get("technicalDetails") || "").trim();
    const application = String(form.get("application") || "").trim();
    const differentials = String(form.get("differentials") || "").trim();
    const technicalDetails = `ESPECIFICAÇÕES TÉCNICAS\n${specifications}\n\nAPLICAÇÃO\n${application}\n\nDIFERENCIAIS\n${differentials}`;
    const rawSpecs = String(form.get("specs") || "").trim();
    const specs = normalizeSpecs(rawSpecs);
    const rawManualUrl = String(form.get("manualUrl") || "").trim();
    let manualUrl: string | null = null;
    if (rawManualUrl) { try { const parsed = new URL(rawManualUrl); if ((parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.toString().length <= 2_048) manualUrl = parsed.toString(); } catch { manualUrl = null; } }
    const values = { organizationId, supplierId: supplier.id, supplierName: supplier.company || supplier.name, name: String(form.get("name") || "").trim(), category: String(form.get("category") || "").trim(), technicalDetails, averagePrice: null, imageKey, specs, manualUrl, ownerUserId: user.userId, status: "pending" };
    if (!values.name || !values.category || !specifications || !application || !differentials) return Response.json({ error: "Preencha especificações, aplicação e diferenciais." }, { status: 400 });
    const [product] = await getDb().insert(products).values(values).returning();
    return Response.json({ product, pending: true }, { status: 201 });
  } catch { return Response.json({ error: "Não foi possível cadastrar o produto." }, { status: 500 }); }
}
