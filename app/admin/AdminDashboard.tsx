"use client";
import { useEffect, useState } from "react";

type Item = Record<string, string | number | null>;
type Tab = "suppliers" | "products" | "events" | "needs" | "updates" | "articles" | "news" | "reports" | "deletions" | "audit";

export default function AdminDashboard() {
  const [data, setData] = useState<Record<Tab, Item[]>>({ suppliers: [], products: [], events: [], needs: [], updates: [], articles: [], news: [], reports: [], deletions: [], audit: [] });
  const [tab, setTab] = useState<Tab>("suppliers");
  const [busy, setBusy] = useState("");
  const load = () => fetch("/api/admin/content").then((r) => r.json()).then(setData);
  useEffect(() => { load(); }, []);
  async function act(entity: string, id: number, action: string, value?: string) {
    setBusy(`${entity}-${id}-${action}`);
    const response = await fetch("/api/admin/content", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity, id, action, value }) });
    if (!response.ok) { const result = await response.json(); window.alert(result.error || "Não foi possível concluir a ação."); }
    await load(); setBusy("");
  }
  async function createArticle(){const title=prompt("Título do artigo");if(!title)return;const summary=prompt("Resumo curto");if(!summary)return;const content=prompt("Conteúdo revisado");if(!content)return;const category=prompt("Categoria");if(!category)return;setBusy("article-new");const response=await fetch("/api/admin/content",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({entity:"article",action:"create_article",title,summary,content,category,author:"Equipe Hub Brasil"})});if(!response.ok){const result=await response.json();alert(result.error)}await load();setBusy("")}
  async function createNews(){const title=prompt("Título da notícia");if(!title)return;const summary=prompt("Resumo curto, escrito pelo Hub Brasil");if(!summary)return;const category=prompt("Categoria: Rastreamento, Telecom, Conectividade, Tecnologia ou Automotivo");if(!category)return;const sourceName=prompt("Nome da fonte original");if(!sourceName)return;const sourceUrl=prompt("Link HTTPS da notícia original");if(!sourceUrl)return;const publishedAt=prompt("Data da publicação (AAAA-MM-DD)",new Date().toISOString().slice(0,10));if(!publishedAt)return;setBusy("news-new");const response=await fetch("/api/admin/content",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({entity:"news",action:"create_news",title,summary,category,sourceName,sourceUrl,publishedAt})});if(!response.ok){const result=await response.json();alert(result.error)}await load();setBusy("")}
  const pending = (key: Tab) => data[key].filter((item) => item.status === "pending").length;
  return <>
    <div className="admin-tabs">
      <button className={tab === "suppliers" ? "active" : ""} onClick={() => setTab("suppliers")}>Fornecedores {pending("suppliers") > 0 && <b>{pending("suppliers")}</b>}</button>
      <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>Produtos {pending("products") > 0 && <b>{pending("products")}</b>}</button>
      <button className={tab === "events" ? "active" : ""} onClick={() => setTab("events")}>Eventos {pending("events") > 0 && <b>{pending("events")}</b>}</button>
      <button className={tab === "needs" ? "active" : ""} onClick={() => setTab("needs")}>Demandas {pending("needs") > 0 && <b>{pending("needs")}</b>}</button>
      <button className={tab === "updates" ? "active" : ""} onClick={() => setTab("updates")}>Novidades {pending("updates") > 0 && <b>{pending("updates")}</b>}</button>
      <button className={tab === "articles" ? "active" : ""} onClick={() => setTab("articles")}>Conteúdo</button>
      <button className={tab === "news" ? "active" : ""} onClick={() => setTab("news")}>Radar {pending("news") > 0 && <b>{pending("news")}</b>}</button>
      <button className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}>Denúncias {pending("reports") > 0 && <b>{pending("reports")}</b>}</button>
      <button className={tab === "deletions" ? "active" : ""} onClick={() => setTab("deletions")}>Privacidade {pending("deletions") > 0 && <b>{pending("deletions")}</b>}</button>
      <button className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}>Histórico</button>
    </div>
    {tab === "audit" ? <div className="table-wrap"><table><thead><tr><th>Gestor</th><th>Ação</th><th>Conteúdo</th><th>Data</th></tr></thead><tbody>{data.audit.map((item) => <tr key={item.id}><td>{item.adminEmail}</td><td>{item.action}</td><td>{item.entity} #{item.entityId}</td><td>{new Date(String(item.createdAt)).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div> : <><div className="admin-create-actions">{tab==="articles"&&<button className="primary" disabled={Boolean(busy)} onClick={createArticle}>＋ Novo artigo editorial</button>}{tab==="news"&&<button className="primary" disabled={Boolean(busy)} onClick={createNews}>＋ Adicionar notícia ao Radar</button>}</div><div className="moderation-list">
      {data[tab].length === 0 ? <div className="admin-empty">Nenhum conteúdo nesta seção.</div> : data[tab].map((item) => {
        const entity = tab === "suppliers" ? "supplier" : tab === "products" ? "product" : tab === "events" ? "event" : tab === "needs" ? "need" : tab === "updates" ? "update" : tab === "articles" ? "article" : tab === "news" ? "news" : tab === "deletions" ? "deletion" : "report";
        const title = String(item.company || item.name || item.title || "Sem nome");
        return <article key={`${entity}-${item.id}`}><div><span className={`status ${item.status}`}>{String(item.status)}</span><h2>{tab === "reports" ? `${item.entityType} #${item.entityId}` : title}</h2><p>{tab === "suppliers" ? `${item.category || "Sem categoria"} · ${item.city || "—"}/${item.state || "—"}` : tab === "products" ? `${item.supplierName} · ${item.category}` : tab === "events" ? `${item.city}, ${item.state} · ${item.eventDate}` : tab === "needs" ? `${item.category} · ${item.city}/${item.state} · ${item.description}` : tab === "updates" ? String(item.content) : tab === "news" ? `${item.category} · ${item.sourceName} · ${item.summary}` : tab === "articles" ? `${item.category} · ${item.summary}` : `${item.reason} · ${item.details || "Sem detalhes"}`}</p>{tab === "news" && <a className="verify-link" href={String(item.sourceUrl)} target="_blank" rel="noreferrer">Conferir fonte original</a>}{tab === "suppliers" && <><small>{item.phoneVerifiedAt ? "✓ Telefone validado" : "Telefone aguardando validação"} · {item.verificationStatus === "verified" ? "◆ Selo verificado ativo" : "Sem selo verificado"}</small><a className="verify-link" href={`https://wa.me/55${String(item.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">Conferir pelo WhatsApp</a></>}</div><div className="moderation-actions">{tab === "reports" ? <><button disabled={Boolean(busy)} onClick={() => act(entity, Number(item.id), "resolve")}>Resolver</button><button disabled={Boolean(busy)} onClick={() => act(entity, Number(item.id), "dismiss")}>Arquivar</button></> : <>{tab === "suppliers" && !item.phoneVerifiedAt && <button disabled={Boolean(busy)} onClick={() => act(entity, Number(item.id), "verify_phone")}>Validar telefone</button>}<button disabled={Boolean(busy)} onClick={() => act(entity, Number(item.id), "approve")}>Aprovar</button>{tab === "suppliers" && item.status === "approved" && item.phoneVerifiedAt && item.verificationStatus !== "verified" && <button disabled={Boolean(busy)} onClick={() => act(entity, Number(item.id), "grant_verified")}>Conceder selo</button>}{tab === "suppliers" && item.verificationStatus === "verified" && <button disabled={Boolean(busy)} onClick={() => act(entity, Number(item.id), "suspend_verified")}>Suspender selo</button>}<button disabled={Boolean(busy)} onClick={() => act(entity, Number(item.id), "reject")}>Reprovar</button>{!["needs","updates"].includes(tab)&&<button disabled={Boolean(busy)} onClick={() => { const value = window.prompt("Novo nome", title); if (value) act(entity, Number(item.id), tab === "suppliers" ? "edit_company" : "edit_name", value); }}>Editar</button>}</>}<button disabled={Boolean(busy)} className="danger" onClick={() => { if (window.confirm("Remover definitivamente este conteúdo?")) act(entity, Number(item.id), "delete"); }}>Remover</button></div></article>;
      })}
    </div></>}
  </>;
}
