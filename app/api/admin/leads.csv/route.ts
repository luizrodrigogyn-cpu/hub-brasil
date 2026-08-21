import { desc } from "drizzle-orm";
import { getDb } from "../../../../db";
import { leads, moderationAudit } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { isHubAdmin } from "../../../admin-auth";

function csv(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export async function GET() {
  const user = await getChatGPTUser();
  if (!isHubAdmin(user)) return new Response("Não autorizado", { status: 403 });
  const db = getDb();
  const records = await db.select().from(leads).orderBy(desc(leads.createdAt));
  const rows = [["Perfil", "Status", "Telefone validado", "Nome", "Telefone", "Empresa", "Instagram", "Data"], ...records.map((lead) => [lead.role, lead.status, lead.phoneVerifiedAt ? "Sim" : "Não", lead.name, lead.phone, lead.company, lead.instagram, lead.createdAt])];
  const metadata = JSON.stringify({ format: "csv", recordCount: records.length, columns: rows[0] });

  try {
    await db.insert(moderationAudit).values({ adminEmail: user.email, entity: "lead_export", entityId: 0, action: "export_csv", metadata });
  } catch {
    // Keeps the export available during the migration rollout. The fallback
    // still records the export, without the optional details field.
    await db.insert(moderationAudit).values({ adminEmail: user.email, entity: "lead_export", entityId: 0, action: "export_csv" });
  }

  return new Response(`\uFEFF${rows.map((row) => row.map(csv).join(";")).join("\n")}`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=hub-brasil-cadastros.csv" } });
}
