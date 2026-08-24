import { requireChatGPTUser } from "../chatgpt-auth";
import { isHubAdmin } from "../admin-auth";
import AdminDashboard from "./AdminDashboard";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  if (!isHubAdmin(user)) return <main className="admin-page"><section className="admin-content"><div className="admin-empty"><strong>Acesso restrito</strong><p>Esta área é exclusiva para gestores autorizados do Hub Brasil.</p><a className="primary" href="/">Voltar ao site</a></div></section></main>;
  return <main className="admin-page"><header className="admin-header"><a className="brand" href="/"><span className="brand-mark"><span></span><span></span><span></span></span><span>Hub <b>Brasil</b></span></a><div><span>Gestor Master</span><small>{user.email}</small></div><nav className="admin-preview-links" aria-label="Alternar visão da plataforma"><a className="active" href="/admin" aria-current="page">Visão Gestor</a><a href="/?visao=usuario">Visão Usuário</a><a href="/?visao=fornecedor">Visão Fornecedor</a></nav><a className="sign-out-link" href="/sign-out">Sair</a></header><section className="admin-content"><div className="admin-title"><div><span className="eyebrow">PAINEL DO GESTOR MASTER</span><h1>Central de aprovações</h1><p>Aprove e modere empresas, produtos, eventos e todos os demais conteúdos enviados à plataforma.</p></div><a className="primary" href="/api/admin/leads.csv">Exportar contatos</a></div><AdminDashboard /></section></main>;
}
