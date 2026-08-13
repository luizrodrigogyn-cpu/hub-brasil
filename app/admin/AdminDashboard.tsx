"use client";
import { useEffect, useState } from "react";

type Item = Record<string, string | number | null>;
type Tab = "suppliers" | "products" | "events" | "audit";

export default function AdminDashboard() {
  const [data, setData] = useState<Record<Tab, Item[]>>({ suppliers: [], products: [], events: [], audit: [] });
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
  const pending = (key: Tab) => data[key].filter((item) => item.status === "pending").length;
  return <>
    <div className="admin-tabs">
      <button className={tab === "suppliers" ? "active" : ""} onClick={() => setTab("suppliers")}>Fornecedores {pending("suppliers") > 0 && <b>{pending("suppliers")}</b>}</button>
      <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>Produtos {pending("products") > 0 && <b>{pending("products")}</b>}</button>
      <button className={tab === "events" ? "active" : ""} onClick={() => setTab("events")}>Eventos {pending("events") > 0 && <b>{pending("events")}</b>}</button>
      <button className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}>Histórico</button>
    </div>
    {tab === "audit" ? <div className="table-wrap"><table><thead><tr><th>Gestor</th><th>Ação</th><th>Conteúdo</th><th>Data</th></tr></thead><tbody>{data.audit.map((item) => <tr key={item.id}><td>{item.adminEmail}</td><td>{item.action}</td><td>{item.entity} #{item.entityId}</td><td>{new Date(String(item.createdAt)).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div> : <div className="moderation-list">
      {data[tab].length === 0 ? <div className="admin-empty">Nenhum conteúdo nesta seção.</div> : data[tab].map((item) => {
        const entity = tab === "suppliers" ? "supplier" : tab === "products" ? "product" : "event";
        const title = String(item.company || item.name || "Sem nome");
        return <article key={`${entity}-${item.id}`}><div><span className={`status ${item.status}`}>{String(item.status)}</span><h2>{title}</h2><p>{tab === "suppliers" ? `${item.category || "Sem categoria"} · ${item.city || "—"}/${item.state || "—"}` : tab === "products" ? `${item.supplierName} · ${item.category}` : `${item.city}, ${item.state} · ${item.eventDate}`}</p>{tab === "suppliers" && <><small>{item.phoneVerifiedAt ? "✓ Telefone validado" : "Telefone aguardando validação"}</small><a className="verify-link" href={`https://wa.me/55${String(item.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">Conferir pelo WhatsApp</a></>}</div><div className="moderation-actions">{tab === "suppliers" && !item.phoneVerifiedAt && <button disabled={Boolean(busy)} onClick={() => act(entity, Number(item.id), "verify_phone")}>Validar telefone</button>}<button disabled={Boolean(busy)} onClick={() => act(entity, Number(item.id), "approve")}>Aprovar</button><button disabled={Boolean(busy)} onClick={() => act(entity, Number(item.id), "reject")}>Reprovar</button><button disabled={Boolean(busy)} onClick={() => { const value = window.prompt("Novo nome", title); if (value) act(entity, Number(item.id), tab === "suppliers" ? "edit_company" : "edit_name", value); }}>Editar</button><button disabled={Boolean(busy)} className="danger" onClick={() => { if (window.confirm("Remover definitivamente este conteúdo?")) act(entity, Number(item.id), "delete"); }}>Remover</button></div></article>;
      })}
    </div>}
  </>;
}
