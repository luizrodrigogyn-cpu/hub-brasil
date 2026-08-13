import { desc } from "drizzle-orm";
import { getDb } from "../../db";
import { leads } from "../../db/schema";
import { requireChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const user = await requireChatGPTUser("/admin");
  let records: Array<typeof leads.$inferSelect> = [];
  let unavailable = false;
  try { records = await getDb().select().from(leads).orderBy(desc(leads.createdAt)); } catch { unavailable = true; }
  return <main className="admin-page"><header className="admin-header"><a className="brand" href="/"><span className="brand-mark"><span></span><span></span><span></span></span><span>Hub <b>Brasil</b></span></a><div><span>Área administrativa</span><small>{user.email}</small></div></header><section className="admin-content"><div className="admin-title"><div><span className="eyebrow">ACESSO PROTEGIDO</span><h1>Cadastros recebidos</h1><p>Usuários e fornecedores que solicitaram acesso ao Hub Brasil.</p></div><a className="primary" href="/api/admin/leads.csv">Exportar planilha</a></div>{unavailable ? <div className="admin-empty"><strong>O banco ainda está sendo preparado</strong><p>Atualize esta página em alguns instantes.</p></div> : records.length === 0 ? <div className="admin-empty"><strong>Nenhum cadastro recebido ainda</strong><p>Os próximos cadastros aparecerão automaticamente aqui.</p></div> : <div className="table-wrap"><table><thead><tr><th>Perfil</th><th>Nome</th><th>Telefone</th><th>Empresa</th><th>Instagram</th><th>Data</th></tr></thead><tbody>{records.map((lead) => <tr key={lead.id}><td>{lead.role === "supplier" ? "Fornecedor" : "Usuário"}</td><td>{lead.name}</td><td>{lead.phone}</td><td>{lead.company || "—"}</td><td>{lead.instagram || "—"}</td><td>{new Date(lead.createdAt).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div>}</section></main>;
}
