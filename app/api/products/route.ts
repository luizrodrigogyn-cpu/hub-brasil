import { and, desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { leads, products } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";

export async function GET() {
  try {
    const user = await getApiUser();
    const [viewer] = user ? await getDb().select({ id: leads.id }).from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.status, "approved"))) : [];
    const rows = await getDb().select({ id: products.id, supplierName: products.supplierName, name: products.name, category: products.category, technicalDetails: products.technicalDetails, averagePrice: products.averagePrice, imageKey: products.imageKey }).from(products).where(eq(products.status, "approved")).orderBy(desc(products.createdAt));
    return Response.json({ products: rows.map((item) => ({ id: item.id, supplierName: viewer ? item.supplierName : "Fornecedor protegido", name: item.name, category: item.category, technicalDetails: viewer ? item.technicalDetails : "", averagePrice: viewer ? item.averagePrice : null, imageUrl: item.imageKey ? `/api/product-images?key=${encodeURIComponent(item.imageKey)}` : null })) });
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
    const values = { supplierName: supplier.company || supplier.name, name: String(form.get("name") || "").trim(), category: String(form.get("category") || "").trim(), technicalDetails: String(form.get("technicalDetails") || "").trim(), averagePrice: String(form.get("averagePrice") || "").trim() || null, imageKey, ownerUserId: user.userId, status: "pending" };
    if (!values.name || !values.category || !values.technicalDetails) return Response.json({ error: "Preencha os campos obrigatórios." }, { status: 400 });
    const [product] = await getDb().insert(products).values(values).returning();
    return Response.json({ product, pending: true }, { status: 201 });
  } catch { return Response.json({ error: "Não foi possível cadastrar o produto." }, { status: 500 }); }
}
