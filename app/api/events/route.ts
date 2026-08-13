import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { leads, supplierEvents } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";

export async function GET() {
  try { return Response.json({ events: await getDb().select().from(supplierEvents).where(eq(supplierEvents.status, "approved")) }); }
  catch { return Response.json({ events: [] }); }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser();
    if (!user) return Response.json({ error: "Faça login para publicar.", signIn: "/signin-with-chatgpt?return_to=/" }, { status: 401 });
    const [supplier] = await getDb().select().from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.role, "supplier")));
    if (!supplier || supplier.status !== "approved" || !supplier.phoneVerifiedAt) return Response.json({ error: "Seu fornecedor precisa ter telefone validado e cadastro aprovado pelo gestor." }, { status: 403 });
    const body = await request.json() as Record<string, string>;
    const required = ["name", "venue", "city", "state", "date", "link"];
    if (required.some((key) => !body[key]?.trim())) return Response.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
    const [event] = await getDb().insert(supplierEvents).values({ name: body.name.trim(), venue: body.venue.trim(), city: body.city.trim(), state: body.state.trim(), eventDate: body.date, registrationUrl: body.link.trim(), description: body.description?.trim() || null, ownerUserId: user.userId, status: "pending" }).returning();
    return Response.json({ event, pending: true }, { status: 201 });
  } catch { return Response.json({ error: "Não foi possível cadastrar o evento." }, { status: 500 }); }
}
