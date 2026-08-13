import { desc } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { products } from "../../../db/schema";

export async function GET() {
  try {
    const rows = await getDb().select().from(products).orderBy(desc(products.createdAt));
    return Response.json({ products: rows.map((item) => ({ ...item, imageUrl: item.imageKey ? `/api/product-images?key=${encodeURIComponent(item.imageKey)}` : null })) });
  } catch { return Response.json({ products: [] }); }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const photo = form.get("photo");
    let imageKey: string | null = null;
    if (photo instanceof File && photo.size > 0) {
      if (!photo.type.startsWith("image/") || photo.size > 5_000_000) return Response.json({ error: "Envie uma imagem de até 5 MB." }, { status: 400 });
      imageKey = `${crypto.randomUUID()}-${photo.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      await env.PRODUCT_IMAGES.put(imageKey, await photo.arrayBuffer(), { httpMetadata: { contentType: photo.type } });
    }
    const values = { supplierName: String(form.get("supplierName") || "").trim(), name: String(form.get("name") || "").trim(), category: String(form.get("category") || "").trim(), technicalDetails: String(form.get("technicalDetails") || "").trim(), averagePrice: String(form.get("averagePrice") || "").trim() || null, imageKey };
    if (!values.supplierName || !values.name || !values.category || !values.technicalDetails) return Response.json({ error: "Preencha os campos obrigatórios." }, { status: 400 });
    const [product] = await getDb().insert(products).values(values).returning();
    return Response.json({ product: { ...product, imageUrl: imageKey ? `/api/product-images?key=${encodeURIComponent(imageKey)}` : null } }, { status: 201 });
  } catch { return Response.json({ error: "Não foi possível cadastrar o produto." }, { status: 500 }); }
}
