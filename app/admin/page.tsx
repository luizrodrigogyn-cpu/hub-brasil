import { requireChatGPTUser } from "../chatgpt-auth";
import { isHubAdmin } from "../admin-auth";
import AdminDashboard from "./AdminDashboard";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  if (!isHubAdmin(user)) return <main className="admin-page"><section className="admin-content"><div className="admin-empty"><strong>Acesso restrito</strong><p>Esta área é exclusiva para gestores autorizados do Hub Brasil.</p><a className="primary" href="/">Voltar ao site</a></div></section></main>;
  return <main className="admin-page"><header className="admin-header"><a className="brand" href="/"><span className="brand-mark"><span></span><span></span><span></span></span><span>Hub <b>Brasil</b></span></a><div><span>Gestão e moderação</span><small>{user.email}</small></div><nav className="admin-preview-links" aria-label="Visualizações da plataforma"><a href="/?visao=usuario">Ver como usuário</a><a href="/?visao=fornecedor">Ver como fornecedor</a></nav></header><section className="admin-content"><div className="admin-title"><div><span className="eyebrow">PAINEL SEGURO</span><h1>Aprovações</h1><p>Valide telefones e modere fornecedores, produtos, eventos e notícias do Radar.</p></div><a className="primary" href="/api/admin/leads.csv">Exportar contatos</a></div><AdminDashboard /></section></main>;
}
