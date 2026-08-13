import { getDb } from "../../../db";
import { leads } from "../../../db/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, string>;
    const name = body.name?.trim();
    const phone = body.phone?.trim();
    const company = body.company?.trim() || null;
    const instagram = body.instagram?.trim() || null;
    if (!name || !phone || (!company && !instagram)) {
      return Response.json({ error: "Preencha nome, telefone e empresa ou Instagram." }, { status: 400 });
    }
    const [lead] = await getDb().insert(leads).values({ name, phone, company, instagram }).returning();
    return Response.json({ lead }, { status: 201 });
  } catch {
    return Response.json({ error: "Não foi possível registrar o acesso." }, { status: 500 });
  }
}
