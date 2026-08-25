import { desc } from "drizzle-orm";
import { getDb } from "../../../../db";
import { leads, moderationAudit } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { adminAccessState, isHubAdmin } from "../../../admin-auth";

// Neutraliza CSV/formula injection: um cadastro com nome/empresa começando com =, +, -, @, tab ou CR
// vira uma fórmula "viva" quando o CSV é aberto no Excel/LibreOffice (ex.: =HYPERLINK(...) ou =cmd|...).
// Prefixar com apóstrofo faz o programa tratar o valor como texto puro.
function csv(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!isHubAdmin(user)) return new Response(adminAccessState(user) === "needs_2fa" ? "Acesso restrito ao gestor. Conclua a verificação em duas etapas (2FA) na sua conta e faça login novamente." : "Não autorizado", { status: 403 });
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
