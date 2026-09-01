"use client";
import { useEffect, useState } from "react";

// Os tipos oficiais da Cloudflare tipam Response.json() como `unknown` em vez de `any`;
// este helper concentra a conversão explícita usada em todas as leituras de JSON do fetch.
function readJson(response: Response): Promise<any> {
  return response.json() as Promise<any>;
}

function formatPhone(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return "Não informado";
}

function formatCnpj(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 14) return "Não informado";
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

type Item = Record<string, string | number | null>;
type Tab = "registrations" | "suppliers" | "installers" | "products" | "events" | "needs" | "updates" | "articles" | "news" | "reports" | "deletions" | "credits" | "audit" | "kpis";
type Kpis = {
  timeToFirstProposal: { sampleSize: number; totalQuotes: number; avgHours: number | null; medianHours: number | null; under24hPct: number | null; goalHours: number };
  leadToProposalConversion: { sampleSize: number; responded: number; ratePct: number | null };
  acceptedRateAvailable: boolean;
  churnAvailable: boolean;
  minSample: number;
};

export default function AdminDashboard() {
  const [data, setData] = useState<Record<Exclude<Tab, "kpis">, Item[]>>({ registrations: [], suppliers: [], installers: [], products: [], events: [], needs: [], updates: [], articles: [], news: [], reports: [], deletions: [], credits: [], audit: [] });
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [tab, setTab] = useState<Tab>("suppliers");
  const [busy, setBusy] = useState("");
  const load = () => fetch("/api/admin/content").then((r) => readJson(r)).then(setData);
  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === "kpis" && !kpis) fetch("/api/admin/kpis").then((r) => readJson(r)).then(setKpis).catch(() => {}); }, [tab, kpis]);
  async function act(entity: string, id: number, action: string, value?: string) {
    setBusy(`${entity}-${id}-${action}`);
    try {
      const response = await fetch("/api/admin/content", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity, id, action, value }) });
      if (!response.ok) { const result = await readJson(response).catch(() => ({})); window.alert(result.error || "Não foi possível concluir a ação."); }
      await load();
    } catch {
      // Falha de rede não pode travar o painel inteiro com o botão "carregando" para sempre.
      window.alert("Falha de conexão. Tente novamente.");
    } finally {
      setBusy("");
    }
  }
  async function createArticle(){const title=prompt("Título do artigo");if(!title)return;const summary=prompt("Resumo curto");if(!summary)return;const content=prompt("Conteúdo revisado");if(!content)return;const category=prompt("Categoria");if(!category)return;setBusy("article-new");try{const response=await fetch("/api/admin/content",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({entity:"article",action:"create_article",title,summary,content,category,author:"Equipe Hub Brasil"})});if(!response.ok){const result=await readJson(response).catch(()=>({}));alert(result.error||"Não foi possível concluir a ação.")}await load()}catch{alert("Falha de conexão. Tente novamente.")}finally{setBusy("")}}
  async function createNews(){const title=prompt("Título da notícia");if(!title)return;const summary=prompt("Resumo curto, escrito pelo Hub Brasil");if(!summary)return;const category=prompt("Categoria: Rastreamento, Telecom, Conectividade, Tecnologia ou Automotivo");if(!category)return;const sourceName=prompt("Nome da fonte original");if(!sourceName)return;const sourceUrl=prompt("Link HTTPS da notícia original");if(!sourceUrl)return;const publishedAt=prompt("Data da publicação (AAAA-MM-DD)",new Date().toISOString().slice(0,10));if(!publishedAt)return;setBusy("news-new");try{const response=await fetch("/api/admin/content",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({entity:"news",action:"create_news",title,summary,category,sourceName,sourceUrl,publishedAt})});if(!response.ok){const result=await readJson(response).catch(()=>({}));alert(result.error||"Não foi possível concluir a ação.")}await load()}catch{alert("Falha de conexão. Tente novamente.")}finally{setBusy("")}}
  const pending = (key: Exclude<Tab, "kpis">) => data[key].filter((item) => item.status === "pending").length;
  return <>
    <div className="admin-tabs">
      <button className={tab === "kpis" ? "active" : ""} onClick={() => setTab("kpis")}>KPIs</button>
      <button className={tab === "registrations" ? "active" : ""} onClick={() => setTab("registrations")}>Usuários cadastrados</button>
      <button className={tab === "suppliers" ? "active" : ""} onClick={() => setTab("suppliers")}>Fornecedores {pending("suppliers") > 0 && <b>{pending("suppliers")}</b>}</button>
      <button className={tab === "installers" ? "active" : ""} onClick={() => setTab("installers")}>Instaladores {pending("installers") > 0 && <b>{pending("installers")}</b>}</button>
      <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>Produtos {pending("products") > 0 && <b>{pending("products")}</b>}</button>
      <button className={tab === "events" ? "active" : ""} onClick={() => setTab("events")}>Eventos {pending("events") > 0 && <b>{pending("events")}</b>}</button>
      <button className={tab === "needs" ? "active" : ""} onClick={() => setTab("needs")}>Demandas {pending("needs") > 0 && <b>{pending("needs")}</b>}</button>
      <button className={tab === "updates" ? "active" : ""} onClick={() => setTab("updates")}>Novidades {pending("updates") > 0 && <b>{pending("updates")}</b>}</button>
      <button className={tab === "articles" ? "active" : ""} onClick={() => setTab("articles")}>Conteúdo</button>
      <button className={tab === "news" ? "active" : ""} onClick={() => setTab("news")}>Radar {pending("news") > 0 && <b>{pending("news")}</b>}</button>
      <button className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}>Denúncias {pending("reports") > 0 && <b>{pending("reports")}</b>}</button>
      <button className={tab === "deletions" ? "active" : ""} onClick={() => setTab("deletions")}>Privacidade {pending("deletions") > 0 && <b>{pending("deletions")}</b>}</button>
      <button className={tab === "credits" ? "active" : ""} onClick={() => setTab("credits")}>Hub Créditos</button>
      <button className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}>Histórico</button>
    </div>
    {tab === "kpis" ? <div className="kpi-panel">
      {!kpis ? <div className="admin-empty">Carregando…</div> : <>
        <article className="kpi-card">
          <h3>Tempo até a primeira proposta</h3>
          <small>Meta inicial: menos de {kpis.timeToFirstProposal.goalHours}h</small>
          {kpis.timeToFirstProposal.avgHours === null ? <p className="kpi-empty">Ainda não há amostra suficiente ({kpis.timeToFirstProposal.sampleSize} de {kpis.minSample} cotações respondidas necessárias).</p> : <>
            <div className="kpi-numbers"><div><strong>{kpis.timeToFirstProposal.avgHours}h</strong><span>média</span></div><div><strong>{kpis.timeToFirstProposal.medianHours}h</strong><span>mediana</span></div><div><strong>{kpis.timeToFirstProposal.under24hPct}%</strong><span>abaixo da meta</span></div></div>
            <small>{kpis.timeToFirstProposal.sampleSize} de {kpis.timeToFirstProposal.totalQuotes} cotações já respondidas pelo menos uma vez.</small>
          </>}
        </article>
        <article className="kpi-card">
          <h3>Conversão lead → proposta enviada</h3>
          <small>Cada envio de cotação a um fornecedor conta como lead; a resposta dele é a proposta.</small>
          {kpis.leadToProposalConversion.ratePct === null ? <p className="kpi-empty">Ainda não há amostra suficiente ({kpis.leadToProposalConversion.sampleSize} de {kpis.minSample} leads necessários).</p> : <div className="kpi-numbers"><div><strong>{kpis.leadToProposalConversion.ratePct}%</strong><span>{kpis.leadToProposalConversion.responded} de {kpis.leadToProposalConversion.sampleSize} leads</span></div></div>}
        </article>
        <article className="kpi-card kpi-card-missing">
          <h3>Taxa de proposta aceita</h3>
          <p className="kpi-empty">Não medível hoje: o sistema registra o pedido e a resposta do fornecedor, mas não captura se o cliente fechou negócio. Precisaria de um passo novo (ex.: cliente marcar &quot;fechei com este fornecedor&quot;).</p>
        </article>
        <article className="kpi-card kpi-card-missing">
          <h3>Churn de fornecedor (30 dias)</h3>
          <p className="kpi-empty">Não medível hoje: não existe um evento de cancelamento ou critério definido de inatividade para o fornecedor. Precisa ser definido antes de virar número.</p>
        </article>
        <article className="kpi-card kpi-card-missing">
          <h3>NPS (usuário e fornecedor)</h3>
          <p className="kpi-empty">Não coletado hoje: não existe pergunta de satisfação em nenhum ponto da jornada. Precisaria de uma nova coleta de resposta antes de virar KPI.</p>
        </article>
      </>}
    </div> : tab === "registrations" ? <div className="table-wrap"><table><thead><tr><th>Nome</th><th>Telefone</th><th>Categoria</th><th>Situação</th><th>Cadastro</th></tr></thead><tbody>{data.registrations.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.phone || "Não informado"}</td><td><span className={`registration-role ${item.role}`}>{item.role === "supplier" ? "Fornecedor" : "Usuário"}</span></td><td>{item.status === "approved" ? "Aprovado" : item.status === "rejected" ? "Reprovado" : "Pendente"}</td><td>{new Date(String(item.createdAt)).toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div> : tab === "audit" ? <div className="table-wrap"><table><thead><tr><th>Gestor</th><th>Ação</th><th>Conteúdo</th><th>Data</th></tr></thead><tbody>{data.audit.map((item) => <tr key={item.id}><td>{item.adminEmail}</td><td>{item.action}</td><td>{item.entity} #{item.entityId}</td><td>{new Date(String(item.createdAt)).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div> : <><div className="admin-create-actions">{tab==="articles"&&<button className="primary" disabled={Boolean(busy)} onClick={createArticle}>＋ Novo artigo editorial</button>}{tab==="news"&&<button className="primary" disabled={Boolean(busy)} onClick={createNews}>＋ Adicionar notícia ao Radar</button>}</div>{tab === "installers" && data.installers.some((item) => item.photoKey) && <div className="installer-photo-review"><strong>Fotos para revisão</strong><div>{data.installers.filter((item) => item.photoKey).map((item) => <a key={item.id} href={`/api/installer-photo?key=${encodeURIComponent(String(item.photoKey))}`} target="_blank" rel="noreferrer"><img src={`/api/installer-photo?key=${encodeURIComponent(String(item.photoKey))}`} alt={`Foto enviada por ${item.name}`} /><span>{item.name}</span></a>)}</div></div>}<div className="moderation-list">
      {data[tab].length === 0 ? <div className="admin-empty">Nenhum conteúdo nesta seção.</div> : data[tab].map((item) => {
        const entity = tab === "suppliers" ? "supplier" : tab === "installers" ? "installer" : tab === "products" ? "product" : tab === "events" ? "event" : tab === "needs" ? "need" : tab === "updates" ? "update" : tab === "articles" ? "article" : tab === "news" ? "news" : tab === "deletions" ? "deletion" : tab === "credits" ? "credit" : "report";
        const baseTitle = String(item.company || item.name || item.title || "Sem nome");
        const title = tab === "credits"
          ? `Fornecedor #${item.supplierId}`
          : tab === "suppliers"
            ? `${baseTitle} · WhatsApp ${formatPhone(item.phone)} · CNPJ ${formatCnpj(item.cnpj)}`
            : baseTitle;
        // eslint-disable-next-line no-useless-escape
        return <article key={`${entity}-${item.id}`}><div><span className={`status ${item.status}`}>{String(item.status)}</span><h2>{tab === "reports" ? `${item.entityType} #${item.entityId}` : title}</h2><p>{tab === "credits" ? `${Number(item.amount) > 0 ? "+" : ""}${item.amount} créditos · ${item.note || item.ruleKey}` : tab === "suppliers" ? `${item.category || "Sem categoria"} · ${item.city || "—"}/${item.state || "—"}` : tab === "installers" ? `${item.city || "—"}/${item.state || "—"} · ${String(item.specialties || "[]").replace(/[\[\]"]/g, "")}` : tab === "products" ? `${item.supplierName} · ${item.category}` : tab === "events" ? `${item.city}, ${item.state} · ${item.eventDate}` : tab === "needs" ? `${item.category} · ${item.city}/${item.state} · ${item.description}` : tab === "updates" ? String(item.content) : tab === "news" ? `${item.category} · ${item.sourceName} · ${item.summary}` : tab === "articles" ? `${item.category} · ${item.summary}` : `${item.reason} · ${item.details || "Sem detalhes"}`}</p>{tab === "news" && <a className="verify-link" href={String(item.sourceUrl)} target="_blank" rel="noreferrer">Conferir fonte original</a>}{tab === "installers" && <><small>{item.phoneVerifiedAt ? "✓ WhatsApp validado" : "WhatsApp aguardando validação"} · Sem CPF, orçamento ou pagamento no Hub</small><a className="verify-link" href={`https://wa.me/55${String(item.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">Conferir pelo WhatsApp</a></>}{tab === "suppliers" && <><small>{item.phoneVerifiedAt ? "✓ Telefone validado" : "Telefone aguardando validação"} · CNPJ: {item.cnpjValidationStatus === "manually_confirmed" ? "confirmado pela gestão" : item.cnpjValidationStatus === "checksum_valid" ? "dígitos válidos" : "não informado"} · {item.verificationStatus === "verified" ? "◆ Selo verificado ativo" : `Sem selo verificado (${Number(item.positiveRatings) || 0}/5 avaliações positivas)`}</small><a className="verify-link" href={`https://wa.me/55${String(item.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">Conferir pelo WhatsApp</a></>}</div><div className="moderation-actions">{tab === "credits" ? <button disabled={Boolean(busy)} onClick={() => { const value = window.prompt("Ajuste de créditos (+ ou -)", "0"); if (value && Number(value)) act(entity, Number(item.supplierId), "adjust", value); }}>Ajustar saldo</button> : tab === "reports" ? <><button disabled={Boolean(busy)} onClick={() => act(entity, Number(item.id), "resolve")}>Resolver</button><button disabled={Boolean(busy)} onClick={() => act(entity, Number(item.id), "dismiss")}>Arquivar</button></> : <>{(tab === "suppliers" || tab === "installers") && !item.phoneVerifiedAt && <button disabled={Boolean(busy)} onClick={() => act(entity, Number(item.id), "verify_phone")}>Validar WhatsApp</button>}{tab === "suppliers" && item.cnpjValidationStatus === "checksum_valid" && <button disabled={Boolean(busy)} onClick={() => act(entity, Number(item.id), "confirm_cnpj")}>Confirmar CNPJ</button>}<button disabled={Boolean(busy)} onClick={() => act(entity, Number(item.id), "approve")}>Aprovar</button>{tab === "suppliers" && item.status === "approved" && item.phoneVerifiedAt && item.verificationStatus !== "verified" && Number(item.positiveRatings) >= 5 && <button disabled={Boolean(busy)} onClick={() => act(entity, Number(item.id), "grant_verified")}>Conceder selo</button>}{tab === "suppliers" && item.verificationStatus === "verified" && <button disabled={Boolean(busy)} onClick={() => act(entity, Number(item.id), "suspend_verified")}>Suspender selo</button>}<button disabled={Boolean(busy)} onClick={() => act(entity, Number(item.id), "reject")}>Reprovar</button>{!["needs","updates"].includes(tab)&&<button disabled={Boolean(busy)} onClick={() => { const value = window.prompt("Novo nome", title); if (value) act(entity, Number(item.id), tab === "suppliers" ? "edit_company" : "edit_name", value); }}>Editar</button>}</>}<button disabled={Boolean(busy)} className="danger" onClick={() => { if (window.confirm("Remover definitivamente este conteúdo?")) act(entity, Number(item.id), "delete"); }}>Remover</button></div></article>;
      })}
    </div></>}
  </>;
}
