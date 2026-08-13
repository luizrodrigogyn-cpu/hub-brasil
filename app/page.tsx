"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Supplier = {
  id: number;
  name: string;
  initials: string;
  category: string;
  city: string;
  state: string;
  description: string;
  accent: string;
};

type HubEvent = { id: number; name: string; supplier: string; venue: string; city: string; state: string; date: string; displayDate: string; link: string; x: number; y: number; demo?: boolean };
type Product = { id: number; supplierName: string; name: string; category: string; technicalDetails: string; averagePrice?: string | null; imageUrl?: string | null };

const suppliers: Supplier[] = [
  { id: 1, name: "TrackOne Tecnologia", initials: "T1", category: "Rastreadores", city: "São Paulo", state: "SP", description: "Rastreadores homologados e soluções para gestão de frotas.", accent: "blue" },
  { id: 2, name: "Nexo M2M", initials: "NX", category: "Conectividade M2M", city: "Campinas", state: "SP", description: "Conectividade multioperadora para rastreamento em todo o Brasil.", accent: "cyan" },
  { id: 3, name: "VisionCam Brasil", initials: "VC", category: "Câmeras veiculares", city: "Curitiba", state: "PR", description: "Videotelemetria e câmeras para operações críticas.", accent: "violet" },
  { id: 4, name: "TagGo Sistemas", initials: "TG", category: "Tags e identificação", city: "Belo Horizonte", state: "MG", description: "Identificação e controle seguro de condutores e veículos.", accent: "green" },
];

export default function Home() {
  const [view, setView] = useState<"map" | "directory" | "supplier" | "events" | "products" | "supplier-dashboard">("map");
  const [registered, setRegistered] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas as categorias");
  const [toast, setToast] = useState("");
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [events, setEvents] = useState<HubEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<HubEvent | null>(null);
  const [registrationRole, setRegistrationRole] = useState<"client" | "supplier">("client");
  const [userRole, setUserRole] = useState<"client" | "supplier" | null>(null);
  const [supplierCompany, setSupplierCompany] = useState("");
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [ratings, setRatings] = useState<Record<string, { average: number; total: number }>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => setWelcomeOpen(true), 900);
    fetch("/api/products").then((response) => response.json()).then((data) => setProducts(data.products || [])).catch(() => {});
    fetch("/api/ratings").then((response) => response.json()).then((data) => setRatings(data.ratings || {})).catch(() => {});
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (eventFormOpen && userRole !== "supplier") {
      setEventFormOpen(false);
      setRegistrationRole("supplier");
      setRegisterOpen(true);
    }
  }, [eventFormOpen, userRole]);

  useEffect(() => {
    if (selectedProduct && !registered) {
      setSelectedProduct(null);
      setRegistrationRole("client");
      setRegisterOpen(true);
    }
  }, [selectedProduct, registered]);

  const filtered = useMemo(() => suppliers.filter((supplier) => {
    const matchesQuery = `${supplier.name} ${supplier.city} ${supplier.state}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "Todas as categorias" || supplier.category === category;
    return matchesQuery && matchesCategory;
  }), [query, category]);

  function requestAccess(supplier?: Supplier) {
    if (supplier) setSelectedSupplier(supplier);
    if (!registered) {
      setRegisterOpen(true);
      return;
    }
    if (supplier) setView("supplier");
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    } catch { /* Local preview still demonstrates the complete gated flow. */ }
    setRegistered(true);
    setUserRole(registrationRole);
    if (registrationRole === "supplier") {
      const company = String(payload.company || "").trim();
      setSupplierCompany(company);
      setView("supplier-dashboard");
    }
    setRegisterOpen(false);
    setToast("Acesso liberado. Bem-vindo ao Hub Brasil!");
    if (selectedSupplier && registrationRole === "client") setView("supplier");
    window.setTimeout(() => setToast(""), 3500);
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("supplierName", supplierCompany || "Fornecedor cadastrado");
    const photo = form.get("photo");
    const preview = photo instanceof File && photo.size ? URL.createObjectURL(photo) : null;
    const local: Product = { id: Date.now(), supplierName: String(form.get("supplierName")), name: String(form.get("name")), category: String(form.get("category")), technicalDetails: String(form.get("technicalDetails")), averagePrice: String(form.get("averagePrice") || "") || null, imageUrl: preview };
    try { const response = await fetch("/api/products", { method: "POST", body: form }); const data = await response.json(); if (response.ok) Object.assign(local, data.product); } catch {}
    setProducts((current) => [local, ...current]); setProductFormOpen(false); setView("products"); setToast("Produto cadastrado com sucesso."); window.setTimeout(() => setToast(""), 3500);
  }

  async function rateSupplier(name: string, stars: number) {
    if (userRole !== "client") { setToast("Entre como usuário para avaliar fornecedores."); window.setTimeout(() => setToast(""), 3000); return; }
    const current = ratings[name] || { average: 0, total: 0 };
    const optimistic = { average: (current.average * current.total + stars) / (current.total + 1), total: current.total + 1 };
    setRatings((all) => ({ ...all, [name]: optimistic }));
    try { const response = await fetch("/api/ratings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ supplierName: name, stars }) }); const data = await response.json(); if (response.ok) setRatings((all) => ({ ...all, [name]: data })); } catch {}
  }

  function showSupplier(supplier: Supplier) {
    setSelectedSupplier(supplier);
    requestAccess(supplier);
  }

  function openEventForm() {
    if (userRole !== "supplier") {
      setRegistrationRole("supplier");
      setRegisterOpen(true);
      setToast("Cadastre-se como fornecedor para publicar eventos.");
      window.setTimeout(() => setToast(""), 3500);
      return;
    }
    setEventFormOpen(true);
  }

  function openProduct(product: Product) {
    if (!registered) {
      setRegistrationRole("client");
      setRegisterOpen(true);
      setToast("Identifique-se para ver as informações técnicas.");
      window.setTimeout(() => setToast(""), 3500);
      return;
    }
    setSelectedProduct(product);
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries()) as Record<string, string>;
    try { await fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); } catch {}
    const date = new Date(`${payload.date}T12:00:00`);
    const created: HubEvent = { id: Date.now(), name: payload.name, supplier: selectedSupplier?.name || "Seu fornecedor", venue: payload.venue, city: payload.city, state: payload.state, date: payload.date, displayDate: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase().replace(".", ""), link: payload.link, x: 68, y: 77 };
    setEvents((current) => [...current, created]);
    setSelectedEvent(created); setEventFormOpen(false); setView("events"); setToast("Evento enviado para publicação no mapa.");
    window.setTimeout(() => setToast(""), 3500);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView("map")} aria-label="Ir para o mapa do Hub Brasil">
          <span className="brand-mark"><span></span><span></span><span></span></span>
          <span>Hub <b>Brasil</b></span>
        </button>
        <nav className="desktop-nav" aria-label="Navegação principal">
          <button className={view === "map" ? "active" : ""} onClick={() => setView("map")}>Mapa</button>
          <button className={view === "directory" ? "active" : ""} onClick={() => setView("directory")}>Fornecedores</button>
          <button className={view === "products" ? "active" : ""} onClick={() => setView("products")}>Produtos</button>
          <button className={view === "events" ? "active" : ""} onClick={() => setView("events")}>Eventos</button>
        </nav>
        <div className="top-actions">
          <a className="admin-link" href="/admin">Ver cadastros</a>
          {registered ? <span className="access-chip"><i></i>Acesso liberado</span> : <button className="text-action" onClick={() => setRegisterOpen(true)}>Entrar</button>}
          {userRole === "supplier" && <button className="text-action" onClick={() => setView("supplier-dashboard")}>Minha empresa</button>}
          <button className="primary small" onClick={() => { setSelectedSupplier(null); setRegisterOpen(true); }}>Quero acessar</button>
        </div>
      </header>

      <main>
        {view === "map" && (
          <section className="map-layout">
            <div className="map-copy">
              <span className="eyebrow">Protótipo com dados demonstrativos</span>
              <h1>Encontre quem move<br/>a tecnologia veicular<br/><em>no Brasil.</em></h1>
              <p>Fornecedores validados, produtos especializados e conexões comerciais de confiança.</p>
              <div className="search-box">
                <span aria-hidden="true">⌕</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busque por empresa, produto ou cidade" aria-label="Buscar" />
                <button onClick={() => setView("directory")}>Buscar</button>
              </div>
              <p className="empty-note">Os indicadores serão exibidos quando fornecedores e eventos reais forem aprovados.</p>
            </div>
            <div className="map-panel" aria-label="Mapa ilustrativo de fornecedores no Brasil">
              <div className="map-grid"></div>
              <div className="brazil-map">
                <img src="/brazil-states-map.png" alt="Mapa geográfico do Brasil dividido por estados" />
                {events.map((item) => <button key={`event-${item.id}`} className={`event-pin ${selectedEvent?.id === item.id ? "selected" : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%` }} onClick={() => setSelectedEvent(item)} aria-label={`Evento ${item.name}, em ${item.city}`}><span>★</span></button>)}
              </div>
              <span className="map-caption">FORNECEDORES E EVENTOS APROVADOS</span>
              {!selectedEvent && <div className="map-empty"><strong>Mapa pronto para receber cadastros reais</strong><span>Fornecedores e eventos aparecerão aqui após aprovação.</span></div>}
              {selectedEvent && <div className="event-popover"><span className="event-date">{selectedEvent.displayDate}</span><div><small>PRÓXIMO EVENTO {selectedEvent.demo ? "· DEMONSTRAÇÃO" : ""}</small><strong>{selectedEvent.name}</strong><span>{selectedEvent.city}, {selectedEvent.state}</span></div><button onClick={() => setView("events")}>Ver →</button></div>}
              <a className="map-source" href="https://commons.wikimedia.org/wiki/File:Brazil_states_blank.png" target="_blank" rel="noreferrer">Mapa: Wikimedia Commons · CC BY-SA</a>
            </div>
          </section>
        )}

        {view === "directory" && (
          <section className="directory-page">
            <div className="page-heading"><div><span className="eyebrow">PRÉVIA DO CATÁLOGO</span><h1>Fornecedores</h1><p>Perfis ilustrativos sem métricas, preços ou contatos inventados.</p></div></div>
            <div className="filters">
              <label className="wide"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar fornecedor ou cidade" /></label>
              <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filtrar por categoria">
                <option>Todas as categorias</option><option>Rastreadores</option><option>Conectividade M2M</option><option>Câmeras veiculares</option><option>Tags e identificação</option>
              </select>
              <select aria-label="Filtrar por estado"><option>Todo o Brasil</option><option>São Paulo</option><option>Paraná</option><option>Minas Gerais</option></select>
            </div>
            <div className="supplier-grid">
              {filtered.map((supplier) => (
                <article className="supplier-card" key={supplier.id}>
                  <div className="supplier-top"><div className={`supplier-logo ${supplier.accent}`}>{supplier.initials}</div><span className="verified demo">Demonstração</span></div>
                  <span className="category">{supplier.category}</span>
                  <h2>{registered ? supplier.name : `${supplier.name.slice(0, 3)}••••••••`}</h2>
                  <p>{supplier.description}</p>
                  <div className="card-meta"><span>⌖ {supplier.city}, {supplier.state}</span></div>
                  <button className="card-action" onClick={() => showSupplier(supplier)}>{registered ? "Ver perfil completo" : "Identifique-se para acessar"}<span>→</span></button>
                </article>
              ))}
            </div>
          </section>
        )}

        {view === "supplier" && selectedSupplier && (
          <section className="profile-page">
            <button className="back" onClick={() => setView("directory")}>← Voltar aos fornecedores</button>
            <div className="profile-hero">
              <div className={`supplier-logo large ${selectedSupplier.accent}`}>{selectedSupplier.initials}</div>
              <div><span className="verified demo">Perfil demonstrativo</span><h1>{selectedSupplier.name}</h1><p>{selectedSupplier.category} · {selectedSupplier.city}, {selectedSupplier.state}</p></div>
              <div className="profile-actions"><button className="event-create" onClick={() => setEventFormOpen(true)}>＋ Cadastrar evento</button></div>
            </div>
            <div className="rating-panel"><div><strong>{ratings[selectedSupplier.name] ? ratings[selectedSupplier.name].average.toFixed(1) : "Sem avaliações"}</strong>{ratings[selectedSupplier.name] && <span>{"★".repeat(Math.round(ratings[selectedSupplier.name].average))}</span>}</div><p>Avalie este fornecedor</p><div className="star-picker">{[1,2,3,4,5].map((star) => <button key={star} onClick={() => rateSupplier(selectedSupplier.name, star)} aria-label={`${star} estrelas`}>★</button>)}</div></div>
            <div className="profile-columns">
              <div><h2>Produtos em destaque</h2><div className="product-grid">{["Rastreador veicular", "Rastreador compacto", "Chicote universal"].map((name, index) => <article className="product-card" key={name}><div className={`product-visual p${index + 1}`}><span>{index === 2 ? "ACESSÓRIO" : "RASTREAMENTO"}</span><div className="device"></div></div><span className="category">{index === 2 ? "Acessórios" : "Rastreadores"}</span><h3>{name}</h3><p>Informações disponíveis no cadastro real</p><button onClick={() => setToast("Este é um produto ilustrativo.")}>Ver informações →</button></article>)}</div></div>
              <aside className="contact-panel"><h3>Contato comercial</h3><p>Telefone, Instagram e canais comerciais serão exibidos somente quando o fornecedor real tiver seu cadastro aprovado.</p><dl><div><dt>Localização</dt><dd>{selectedSupplier.city}, {selectedSupplier.state}</dd></div></dl></aside>
            </div>
          </section>
        )}

        {view === "events" && <section className="events-page"><div className="page-heading"><div><span className="eyebrow">AGENDA DO SETOR</span><h1>Próximos eventos</h1><p>Encontros, feiras e treinamentos promovidos por fornecedores.</p></div><button className="primary" onClick={() => setEventFormOpen(true)}>＋ Cadastrar evento</button></div>{events.length === 0 ? <div className="events-empty"><strong>Nenhum evento real publicado ainda</strong><p>Quando um evento for cadastrado e aprovado, ele aparecerá nesta agenda e no mapa.</p><button className="event-create" onClick={() => setEventFormOpen(true)}>Cadastrar o primeiro evento</button></div> : <div className="events-grid">{events.sort((a,b) => a.date.localeCompare(b.date)).map((item) => <article className="event-card" key={item.id}><div className="calendar-block"><strong>{item.displayDate.split(" ")[0]}</strong><span>{item.displayDate.split(" ")[1]}</span><small>{item.displayDate.split(" ")[2]}</small></div><div className="event-card-copy"><span className="eyebrow">EVENTO CADASTRADO</span><h2>{item.name}</h2><p>⌖ {item.venue} · {item.city}, {item.state}</p><small>Promovido por {item.supplier}</small></div><a href={item.link} target="_blank" rel="noreferrer">Inscrever-se →</a></article>)}</div>}</section>}
        {view === "products" && <section className="products-page"><div className="page-heading"><div><span className="eyebrow">CATÁLOGO DO SETOR</span><h1>Produtos</h1><p>Fotos e informações publicadas pelos próprios fornecedores.</p></div>{userRole === "supplier" && <button className="primary" onClick={() => setProductFormOpen(true)}>＋ Cadastrar produto</button>}</div>{products.length === 0 ? <div className="events-empty"><strong>Nenhum produto cadastrado ainda</strong><p>Os cards aparecerão aqui conforme os fornecedores adicionarem seus produtos.</p>{userRole === "supplier" ? <button className="event-create" onClick={() => setProductFormOpen(true)}>Cadastrar o primeiro produto</button> : <button className="event-create" onClick={() => { setRegistrationRole("supplier"); setRegisterOpen(true); }}>Sou fornecedor</button>}</div> : <div className="catalog-grid">{products.map((product) => <article className="catalog-card" key={product.id} onClick={() => setSelectedProduct(product)}><div className="catalog-photo">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <span>Sem foto</span>}</div><div className="catalog-copy"><span className="category">{product.category}</span><h2>{product.name}</h2><p>{product.supplierName}</p>{product.averagePrice && <strong>Preço médio: {product.averagePrice}</strong>}<button>Ver informações técnicas →</button></div></article>)}</div>}</section>}

        {view === "supplier-dashboard" && <section className="supplier-dashboard"><div className="page-heading"><div><span className="eyebrow">PERFIL EMPRESA</span><h1>{supplierCompany || "Minha empresa"}</h1><p>Gerencie produtos, informações técnicas, fotos e eventos.</p></div></div><div className="management-grid"><button onClick={() => setProductFormOpen(true)}><span>▣</span><strong>Cadastrar produto</strong><small>Foto, categoria, especificações e preço médio</small></button><button onClick={() => setEventFormOpen(true)}><span>★</span><strong>Cadastrar evento</strong><small>Local, data e link de inscrição</small></button><button onClick={() => setView("products")}><span>⌕</span><strong>Ver meus produtos</strong><small>Acompanhe o catálogo publicado</small></button></div></section>}
      </main>

      <nav className="mobile-nav" aria-label="Navegação móvel">
        <button className={view === "map" ? "active" : ""} onClick={() => setView("map")}><span>⌖</span>Mapa</button>
        <button className={view === "directory" ? "active" : ""} onClick={() => setView("directory")}><span>▦</span>Fornecedores</button>
        <button onClick={() => setRegisterOpen(true)}><span>◎</span>Conta</button>
      </nav>

      {eventFormOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEventFormOpen(false); }}><section className="access-modal event-form" role="dialog" aria-modal="true" aria-labelledby="event-form-title"><button className="modal-close" onClick={() => setEventFormOpen(false)} aria-label="Fechar">×</button><span className="eyebrow">ÁREA DO FORNECEDOR</span><h2 id="event-form-title">Cadastrar novo evento</h2><p>Após a revisão, o evento aparecerá na agenda e como um ponto especial no mapa.</p><form onSubmit={createEvent}><label>Nome do evento<input name="name" required placeholder="Ex.: Encontro de Integradores" /></label><div className="field-row"><label>Data<input name="date" type="date" required /></label><label>Local<input name="venue" required placeholder="Centro de eventos" /></label></div><div className="field-row"><label>Cidade<input name="city" required placeholder="São Paulo" /></label><label>Estado<select name="state" required><option value="">Selecione</option><option>SP</option><option>PR</option><option>MG</option><option>RJ</option><option>GO</option><option>PE</option></select></label></div><label>Link para inscrição<input name="link" type="url" required placeholder="https://seusite.com/inscricao" /></label><label>Descrição<textarea name="description" rows={3} placeholder="Conte brevemente sobre o evento" /></label><button className="primary full" type="submit">Enviar evento para publicação <span>→</span></button></form></section></div>}

      {selectedProduct && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProduct(null); }}><section className="access-modal product-detail" role="dialog" aria-modal="true"><button className="modal-close" onClick={() => setSelectedProduct(null)} aria-label="Fechar">×</button><div className="detail-photo">{selectedProduct.imageUrl ? <img src={selectedProduct.imageUrl} alt={selectedProduct.name} /> : <span>Produto sem foto</span>}</div><span className="category">{selectedProduct.category}</span><h2>{selectedProduct.name}</h2><strong className="detail-supplier">{selectedProduct.supplierName}</strong><h3>Informações técnicas</h3><p>{selectedProduct.technicalDetails}</p>{selectedProduct.averagePrice && <div className="price-box"><small>PREÇO MÉDIO INFORMADO</small><strong>{selectedProduct.averagePrice}</strong></div>}<button className="primary full" onClick={() => setSelectedProduct(null)}>Fechar <span>×</span></button></section></div>}

      {productFormOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProductFormOpen(false); }}><section className="access-modal event-form" role="dialog" aria-modal="true"><button className="modal-close" onClick={() => setProductFormOpen(false)} aria-label="Fechar">×</button><span className="eyebrow">ÁREA DO FORNECEDOR</span><h2>Cadastrar produto</h2><p>O produto será exibido no catálogo com a sua empresa como fornecedora.</p><form onSubmit={createProduct}><label>Foto do produto<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required /></label><label>Nome do produto<input name="name" required placeholder="Ex.: Rastreador 4G LTE" /></label><label>Categoria<select name="category" required><option value="">Selecione</option><option>Rastreadores</option><option>Conectividade M2M</option><option>Câmeras veiculares</option><option>Tags e identificação</option><option>Acessórios</option></select></label><label>Informações técnicas<textarea name="technicalDetails" rows={5} required placeholder="Tecnologia, alimentação, conectividade, homologações e demais especificações" /></label><label>Preço médio aproximado<input name="averagePrice" placeholder="Ex.: R$ 250 a R$ 320" /></label><button className="primary full" type="submit">Publicar produto <span>→</span></button></form></section></div>}

      {welcomeOpen && !registered && !registerOpen && (
        <div className="welcome-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setWelcomeOpen(false); }}>
          <section className="welcome-modal" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
            <button className="modal-close" onClick={() => setWelcomeOpen(false)} aria-label="Fechar">×</button>
            <div className="welcome-glow"></div>
            <div className="welcome-content">
              <span className="welcome-symbol"><span></span><span></span><span></span></span>
              <span className="eyebrow">VOCÊ FAZ PARTE DESSA CONSTRUÇÃO</span>
              <h2 id="welcome-title">Vamos construir um mercado de rastreamento <em>mais forte.</em></h2>
              <p>O Hub Brasil nasceu para aproximar profissionais, revelar bons fornecedores e criar novas oportunidades em todo o país.</p>
              <ul>
                <li><i>✓</i> Encontre fornecedores especializados</li>
                <li><i>✓</i> Conheça produtos e novas tecnologias</li>
                <li><i>✓</i> Faça conexões comerciais de confiança</li>
              </ul>
              <button className="primary welcome-cta" onClick={() => { setWelcomeOpen(false); setSelectedSupplier(null); setRegisterOpen(true); }}>Quero acessar <span>→</span></button>
              <button className="welcome-later" onClick={() => setWelcomeOpen(false)}>Explorar primeiro</button>
              <small>Cadastro rápido. Informe apenas seu nome, telefone e empresa ou Instagram.</small>
            </div>
          </section>
        </div>
      )}

      {registerOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRegisterOpen(false); }}>
          <section className="access-modal" role="dialog" aria-modal="true" aria-labelledby="access-title">
            <button className="modal-close" onClick={() => setRegisterOpen(false)} aria-label="Fechar">×</button>
            <div className="modal-icon"><span></span><span></span><span></span></div>
            <span className="eyebrow">ACESSO PROFISSIONAL</span>
            <h2 id="access-title">Identifique-se para acessar</h2>
            <p>Precisamos conhecer quem está buscando fornecedores. É rápido e seus dados ficam protegidos.</p>
            <div className="role-selector"><button className={registrationRole === "client" ? "active" : ""} onClick={() => setRegistrationRole("client")}><strong>Sou usuário</strong><span>Quero encontrar e avaliar fornecedores</span></button><button className={registrationRole === "supplier" ? "active" : ""} onClick={() => setRegistrationRole("supplier")}><strong>Sou fornecedor</strong><span>Quero publicar produtos e eventos</span></button></div>
            <form onSubmit={register}>
              <input type="hidden" name="role" value={registrationRole} />
              <label>Seu nome<input name="name" required placeholder="Como podemos chamar você?" /></label>
              <label>Telefone / WhatsApp<input name="phone" required inputMode="tel" placeholder="(00) 00000-0000" /></label>
              <div className="or"><span></span>Informe um dos dois<span></span></div>
              <div className="field-row"><label>Empresa<input name="company" required={registrationRole === "supplier"} placeholder="Nome da empresa" /></label><label>Instagram<input name="instagram" placeholder="@suaempresa" /></label></div>
              <label className="consent"><input type="checkbox" required /> <span>Concordo com a Política de Privacidade e com o uso dos meus dados para liberar o acesso à plataforma.</span></label>
              <button className="primary full" type="submit">{registrationRole === "supplier" ? "Criar perfil da empresa" : "Liberar meu acesso"} <span>→</span></button>
            </form>
            <small>Seus dados só serão compartilhados com um fornecedor quando você solicitar contato.</small>
          </section>
        </div>
      )}
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </div>
  );
}
