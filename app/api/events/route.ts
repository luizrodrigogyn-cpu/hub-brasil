import { getDb } from "../../../db";
import { supplierEvents } from "../../../db/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, string>;
    const required = ["name", "venue", "city", "state", "date", "link"];
    if (required.some((key) => !body[key]?.trim())) return Response.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
    const [event] = await getDb().insert(supplierEvents).values({ name: body.name.trim(), venue: body.venue.trim(), city: body.city.trim(), state: body.state.trim(), eventDate: body.date, registrationUrl: body.link.trim(), description: body.description?.trim() || null }).returning();
    return Response.json({ event }, { status: 201 });
  } catch { return Response.json({ error: "Não foi possível cadastrar o evento." }, { status: 500 }); }
}
