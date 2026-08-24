import { and, desc, eq, or, sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { highlightActivations, leads, products } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";

const arraySpecFields = new Set(["technology", "application", "features"]);
const textSpecFields = new Set(["ip", "battery", "warranty"]);

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

async function ensureProductSpecColumns() {
  const schema = await env.DB.prepare("PRAGMA table_info(products)").all<{ name: string }>();
  const columns = new Set((schema.results || []).map((column) => column.name));
  if (!columns.has("specs")) await env.DB.exec("ALTER TABLE products ADD COLUMN specs TEXT");
  if (!columns.has("manual_url")) await env.DB.exec("ALTER TABLE products ADD COLUMN manual_url TEXT");
}

export async function GET() {
  try {
    await ensureProductSpecColumns();
    const user = await getApiUser();
    const [viewer] = user ? await getDb().select({ id: leads.id }).from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.status, "approved"))) : [];
    const db = getDb();
    const rows = await db.select({ id: products.id, supplierName: products.supplierName, name: products.name, category: products.category, technicalDetails: products.technicalDetails, averagePrice: products.averagePrice, imageKey: products.imageKey, specs: products.specs, manualUrl: products.manualUrl }).from(products).where(eq(products.status, "approved")).orderBy(desc(products.createdAt));
    const highlights = await db.select({ productId: highlightActivations.productId }).from(highlightActivations).where(and(eq(highlightActivations.placement,"product"),eq(highlightActivations.status,"active"),sql`${highlightActivations.endsAt} > ${new Date().toISOString()}`));
    const highlighted = new Set(highlights.map((item)=>item.productId));
    const visibleProducts = await Promise.all(rows.map(async (item) => {
      const [supplier] = viewer ? await getDb().select({ id: leads.id, phone: leads.phone }).from(leads).where(and(or(eq(leads.company, item.supplierName), eq(leads.name, item.supplierName)), eq(leads.role, "supplier"), eq(leads.status, "approved"))) : [];
      let specs: unknown = null;
      if (item.specs) { try { specs = JSON.parse(item.specs); } catch { specs = null; } }
      return { id: item.id, supplierId: viewer ? supplier?.id || null : null, supplierName: viewer ? item.supplierName : "Fornecedor protegido", supplierPhone: viewer ? supplier?.phone || null : null, name: item.name, category: item.category, technicalDetails: viewer ? item.technicalDetails : "", highlighted: highlighted.has(item.id), imageUrl: item.imageKey ? `/api/product-images?key=${encodeURIComponent(item.imageKey)}` : null, specs, manualUrl: item.manualUrl || null };
    }));
    return Response.json({ products: visibleProducts });
  } catch { return Response.json({ products: [] }); }
}

export async function POST(request: Request) {
  try {
    await ensureProductSpecColumns();
    const user = await getApiUser();
    if (!user) return Response.json({ error: "Faça login para publicar.", signIn: "/sign-in?return_to=/" }, { status: 401 });
    const [supplier] = await getDb().select().from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.role, "supplier")));
    if (!supplier || supplier.status !== "approved" || !supplier.phoneVerifiedAt) return Response.json({ error: "Seu fornecedor precisa ter telefone validado e cadastro aprovado pelo gestor." }, { status: 403 });
    const form = await request.formData();
    const photo = form.get("photo");
    let imageKey: string | null = null;
    if (photo instanceof File && photo.size > 0) {
      if (!photo.type.startsWith("image/") || photo.size > 5_000_000) return Response.json({ error: "Envie uma imagem de até 5 MB." }, { status: 400 });
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
    const values = { supplierName: supplier.company || supplier.name, name: String(form.get("name") || "").trim(), category: String(form.get("category") || "").trim(), technicalDetails, averagePrice: null, imageKey, specs, manualUrl, ownerUserId: user.userId, status: "pending" };
    if (!values.name || !values.category || !specifications || !application || !differentials) return Response.json({ error: "Preencha especificações, aplicação e diferenciais." }, { status: 400 });
    const [product] = await getDb().insert(products).values(values).returning();
    return Response.json({ product, pending: true }, { status: 201 });
  } catch { return Response.json({ error: "Não foi possível cadastrar o produto." }, { status: 500 }); }
}
