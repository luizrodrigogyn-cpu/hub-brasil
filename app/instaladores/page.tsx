"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BRAZIL_STATES } from "../brazil-states";
import { WhatsAppField } from "../whatsapp-field";

type Installer = { id: number; name: string; city: string; state: string; specialties: string[]; serviceStates: string[]; description?: string | null; photoUrl?: string | null };
const SPECIALTIES = ["Rastreador veicular", "Bloqueador", "Telemetria", "Videotelemetria", "Sensores e acessórios", "CAN / OBD", "Identificação de motorista", "Manutenção técnica"];
async function readJson(response: Response): Promise<any> { return response.json() as Promise<any>; }

export default function InstallersPage() {
  const [rows, setRows] = useState<Installer[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/installers").then(readJson), fetch("/api/me", { cache: "no-store" }).then(readJson)])
      .then(([directory, me]) => {
        const signedIn = Boolean(me.authenticated);
        setRows(directory.installers || []);
        setAuthenticated(signedIn);
        setAccountEmail(signedIn ? String(me.user?.email || "") : "");
        if (signedIn && new URLSearchParams(window.location.search).get("cadastro") === "aberto") setFormOpen(true);
      })
      .catch(() => setMessage("Não foi possível carregar o diretório agora."));
  }, []);

  const filtered = useMemo(() => rows.filter((item) => {
    const text = [item.name, item.city, item.state, ...item.specialties].join(" ").toLocaleLowerCase("pt-BR");
    return (!query || text.includes(query.toLocaleLowerCase("pt-BR"))) && (!state || item.state === state || item.serviceStates.includes(state)) && (!specialty || item.specialties.includes(specialty));
  }), [rows, query, state, specialty]);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/installers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: form.get("name"), phone: form.get("phone"), city: form.get("city"), state: form.get("state"), description: form.get("description"), specialties: form.getAll("specialties"), serviceStates: form.getAll("serviceStates"), contactConsent: form.get("contactConsent") === "on", termsConsent: form.get("termsConsent") === "on", privacyConsent: form.get("privacyConsent") === "on", noTransactionsConsent: form.get("noTransactionsConsent") === "on" }) });
    const result = await readJson(response).catch(() => ({}));
    if (!response.ok) { setMessage(result.error || "Não foi possível enviar o cadastro."); setBusy(false); return; }
    const photo = form.get("photo");
    if (photo instanceof File && photo.size) {
      const photoForm = new FormData();
      photoForm.set("photo", photo); photoForm.set("photoConsent", form.get("photoConsent") === "on" ? "true" : "false");
      const photoResponse = await fetch("/api/installer-photo", { method: "POST", body: photoForm });
      if (!photoResponse.ok) { const photoResult = await readJson(photoResponse).catch(() => ({})); setMessage(photoResult.error || "Cadastro enviado, mas não foi possível salvar a foto."); setBusy(false); return; }
    }
    setMessage("Cadastro enviado. O perfil e a foto aparecerão após validação do WhatsApp e aprovação da gestão.");
    setFormOpen(false); formElement.reset(); setPhotoPreview(null); setBusy(false);
  }

  async function openWhatsApp(installer: Installer) {
    if (!authenticated) { window.location.href = "/sign-in?return_to=/instaladores"; return; }
    const response = await fetch(`/api/installers/${installer.id}/contact`, { method: "POST" });
    const result = await readJson(response).catch(() => ({}));
    if (!response.ok) { setMessage(result.error || "Não foi possível liberar o contato."); return; }
    const digits = String(result.phone || "").replace(/\D/g, "");
    if (digits) window.open(`https://wa.me/55${digits}`, "_blank", "noopener,noreferrer");
  }

  function closeForm() {
    setFormOpen(false); setPhotoPreview(null);
    if (new URLSearchParams(window.location.search).has("cadastro")) window.history.replaceState({}, "", "/instaladores");
  }

  return <main className="installers-page">
    <header className="installers-header"><a className="brand" href="/"><span className="brand-mark"><span></span><span></span><span></span></span><span className="brand-copy"><strong>Hub <b>Brasil</b></strong><small>CONECTANDO NEGÓCIOS</small></span></a><nav><a href="/">Início</a><a href="/sign-in?return_to=/instaladores">Entrar</a></nav></header>
    <section className="installers-hero"><div><span className="eyebrow">REDE DE SERVIÇOS TÉCNICOS</span><h1>Encontre instaladores por região e especialidade.</h1><p>Localize profissionais do ecossistema de rastreamento e converse diretamente pelo WhatsApp.</p><div className="hero-ctas"><button className="primary" onClick={() => setFormOpen(true)}>Cadastrar como instalador →</button><a className="secondary-action" href="#buscar">Buscar profissional</a></div></div><aside><strong>Conexão direta e simples</strong><span>Sem CPF no cadastro</span><span>Sem orçamento ou pagamento no Hub</span><span>Perfis publicados somente após aprovação</span></aside></section>
    <section className="installer-search" id="buscar"><div className="page-heading"><div><span className="eyebrow">DIRETÓRIO NACIONAL</span><h2>Instaladores disponíveis</h2><p>Pesquise por nome, cidade, UF ou tipo de serviço.</p></div></div><div className="installer-filters"><input aria-label="Buscar instalador" placeholder="Nome, cidade ou especialidade" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Filtrar por UF" value={state} onChange={(event) => setState(event.target.value)}><option value="">Todo o Brasil</option>{BRAZIL_STATES.map((uf) => <option key={uf}>{uf}</option>)}</select><select aria-label="Filtrar por especialidade" value={specialty} onChange={(event) => setSpecialty(event.target.value)}><option value="">Todas as especialidades</option>{SPECIALTIES.map((item) => <option key={item}>{item}</option>)}</select></div>
      {filtered.length === 0 ? <div className="installer-empty"><strong>Nenhum perfil aprovado para estes filtros.</strong><p>Novos profissionais aparecerão aqui após a conferência da gestão.</p></div> : <div className="installer-grid">{filtered.map((item) => <article key={item.id}>{item.photoUrl ? <img className="installer-photo" src={item.photoUrl} alt={`Foto de ${item.name}`} /> : <div className="installer-photo placeholder" aria-hidden="true">{item.name.slice(0, 1).toUpperCase()}</div>}<span className="installer-location">⌖ {item.city}/{item.state}</span><h3>{item.name}</h3><div className="installer-specialties">{item.specialties.map((value) => <span key={value}>{value}</span>)}</div><p>{item.description || "Profissional aprovado no diretório de instaladores do Hub Brasil."}</p>{item.serviceStates.length > 0 && <small>Atende também: {item.serviceStates.join(", ")}</small>}<button onClick={() => openWhatsApp(item)}>{authenticated ? "Conversar no WhatsApp" : "Entrar para ver WhatsApp"} →</button></article>)}</div>}
    </section>
    <section className="installer-disclaimer"><strong>Importante</strong><p>O Hub Brasil apenas facilita o contato. Orçamentos, pagamentos, condições, execução, garantias e responsabilidades pelo serviço são tratados diretamente entre usuário e instalador.</p></section>
    {message && <div className="toast" role="status">{message}</div>}
    {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
    {formOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}><section className="access-modal installer-form" role="dialog" aria-modal="true" aria-labelledby="installer-form-title"><button className="modal-close" onClick={closeForm} aria-label="Fechar">×</button><span className="eyebrow">CADASTRO PROFISSIONAL</span><h2 id="installer-form-title">Quero aparecer no diretório</h2><p>Não solicitamos CPF, endereço residencial ou valores de serviço.</p>
      {!authenticated ? <div className="installer-login"><p>Entre por código de e-mail antes de preencher o cadastro.</p><a className="primary full" href={`/sign-up?perfil=instalador&return_to=${encodeURIComponent("/instaladores?cadastro=aberto")}`}>Entrar com segurança →</a></div> : <form onSubmit={register}>
        <label>Nome profissional ou empresa<input name="name" required maxLength={120} /></label>
        <label>E-mail verificado<input value={accountEmail} readOnly aria-readonly="true" /><small>Este e-mail vem da sua conta segura e não será publicado no diretório.</small></label>
        <label>Foto profissional <small>opcional · JPG, PNG ou WebP de até 3 MB</small><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; setPhotoPreview(file ? URL.createObjectURL(file) : null); }} /></label>
        {photoPreview && <img className="installer-photo-preview" src={photoPreview} alt="Prévia da foto profissional" />}
        <label className="consent"><input type="checkbox" name="photoConsent" /><span>Autorizo o Hub Brasil a exibir esta foto no meu perfil profissional. Obrigatório apenas se uma foto for enviada.</span></label>
        <WhatsAppField label="WhatsApp com DDD" />
        <div className="field-row"><label>Cidade<input name="city" required maxLength={100} /></label><label>UF<select name="state" required><option value="">Selecione</option>{BRAZIL_STATES.map((uf) => <option key={uf}>{uf}</option>)}</select></label></div>
        <fieldset className="solution-selector"><legend>Especialidades <small>selecione uma ou mais</small></legend>{SPECIALTIES.map((item) => <label className="check" key={item}><input type="checkbox" name="specialties" value={item} /> {item}</label>)}</fieldset>
        <fieldset className="solution-selector"><legend>Outras UFs atendidas <small>opcional</small></legend>{BRAZIL_STATES.map((uf) => <label className="check" key={uf}><input type="checkbox" name="serviceStates" value={uf} /> {uf}</label>)}</fieldset>
        <label>Apresentação <small>opcional</small><textarea name="description" rows={4} maxLength={800} placeholder="Experiência, serviços e região atendida" /></label>
        <label className="consent"><input type="checkbox" name="contactConsent" required /><span>Autorizo a publicação do meu nome profissional, cidade, UF, especialidades e a liberação do WhatsApp somente para usuários autenticados que solicitarem contato.</span></label>
        <label className="consent"><input type="checkbox" name="privacyConsent" required /><span>Li e concordo com a <a href="/privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a> e com o tratamento dos dados informado, de acordo com a LGPD.</span></label>
        <label className="consent"><input type="checkbox" name="termsConsent" required /><span>Li e concordo com os <a href="/termos" target="_blank" rel="noreferrer">Termos de Uso</a> do Hub Brasil.</span></label>
        <label className="consent"><input type="checkbox" name="noTransactionsConsent" required /><span>Estou ciente de que o Hub Brasil não realiza orçamento, contratação, cobrança, pagamento ou qualquer transação financeira. Serviços, valores, garantias e responsabilidades são tratados diretamente entre as partes.</span></label>
        <button className="primary full" disabled={busy}>{busy ? "Enviando…" : "Enviar para aprovação →"}</button>
      </form>}
    </section></div>}
  </main>;
}
