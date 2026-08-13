import { desc } from "drizzle-orm";
import { getDb } from "../../../../db";
import { leads } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

function csv(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return new Response("Não autorizado", { status: 401 });
  const records = await getDb().select().from(leads).orderBy(desc(leads.createdAt));
  const rows = [["Nome", "Telefone", "Empresa", "Instagram", "Data"], ...records.map((lead) => [lead.name, lead.phone, lead.company, lead.instagram, lead.createdAt])];
  return new Response(`\uFEFF${rows.map((row) => row.map(csv).join(";")).join("\n")}`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=hub-brasil-cadastros.csv" } });
}
