import { desc } from "drizzle-orm";
import { getDb } from "../../../../db";
import { leads } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { isAdminEmail } from "../../../admin-auth";

function csv(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export async function GET() {
  const user = await getChatGPTUser();
  if (!user || !isAdminEmail(user.email)) return new Response("Não autorizado", { status: 403 });
  const records = await getDb().select().from(leads).orderBy(desc(leads.createdAt));
  const rows = [["Perfil", "Status", "Telefone validado", "Nome", "Telefone", "Empresa", "Instagram", "Data"], ...records.map((lead) => [lead.role, lead.status, lead.phoneVerifiedAt ? "Sim" : "Não", lead.name, lead.phone, lead.company, lead.instagram, lead.createdAt])];
  return new Response(`\uFEFF${rows.map((row) => row.map(csv).join(";")).join("\n")}`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=hub-brasil-cadastros.csv" } });
}
