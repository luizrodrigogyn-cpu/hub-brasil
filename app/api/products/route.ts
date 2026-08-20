import { and, desc, eq, or, sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { highlightActivations, leads, products } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";

export async function GET() {
  try {
    const user = await getApiUser();
    const [viewer] = user ? await getDb().select({ id: leads.id }).from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.status, "approved"))) : [];
    const db = getDb();
    const rows = await db.select({ id: products.id, supplierName: products.supplierName, name: products.name, category: products.category, technicalDetails: products.technicalDetails, averagePrice: products.averagePrice, imageKey: products.imageKey }).from(products).where(eq(products.status, "approved")).orderBy(desc(products.createdAt));
    const highlights = await db.select({ productId: highlightActivations.productId }).from(highlightActivations).where(and(eq(highlightActivations.placement,"product"),eq(highlightActivations.status,"active"),sql`${highlightActivations.endsAt} > ${new Date().toISOString()}`));
    const highlighted = new Set(highlights.map((item)=>item.productId));
    const visibleProducts = await Promise.all(rows.map(async (item) => {
      const [supplier] = viewer ? await getDb().select({ id: leads.id, phone: leads.phone }).from(leads).where(and(or(eq(leads.company, item.supplierName), eq(leads.name, item.supplierName)), eq(leads.role, "supplier"), eq(leads.status, "approved"))) : [];
      return { id: item.id, supplierId: viewer ? supplier?.id || null : null, supplierName: viewer ? item.supplierName : "Fornecedor protegido", supplierPhone: viewer ? supplier?.phone || null : null, name: item.name, category: item.category, technicalDetails: viewer ? item.technicalDetails : "", highlighted: highlighted.has(item.id), imageUrl: item.imageKey ? `/api/product-images?key=${encodeURIComponent(item.imageKey)}` : null };
    }));
    return Response.json({ products: visibleProducts });
  } catch { return Response.json({ products: [] }); }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser();
    if (!user) return Response.json({ error: "Faça login para publicar.", signIn: "/signin-with-chatgpt?return_to=/" }, { status: 401 });
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
    const values = { supplierName: supplier.company || supplier.name, name: String(form.get("name") || "").trim(), category: String(form.get("category") || "").trim(), technicalDetails, averagePrice: null, imageKey, ownerUserId: user.userId, status: "pending" };
    if (!values.name || !values.category || !specifications || !application || !differentials) return Response.json({ error: "Preencha especificações, aplicação e diferenciais." }, { status: 400 });
    const [product] = await getDb().insert(products).values(values).returning();
    return Response.json({ product, pending: true }, { status: 201 });
  } catch { return Response.json({ error: "Não foi possível cadastrar o produto." }, { status: 500 }); }
}
