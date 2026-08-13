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
  products: number;
  accent: string;
};

const suppliers: Supplier[] = [
  { id: 1, name: "TrackOne Tecnologia", initials: "T1", category: "Rastreadores", city: "São Paulo", state: "SP", description: "Rastreadores 4G homologados e soluções para gestão de frotas.", products: 12, accent: "blue" },
  { id: 2, name: "Nexo M2M", initials: "NX", category: "Conectividade M2M", city: "Campinas", state: "SP", description: "Conectividade multioperadora para rastreamento em todo o Brasil.", products: 8, accent: "cyan" },
  { id: 3, name: "VisionCam Brasil", initials: "VC", category: "Câmeras veiculares", city: "Curitiba", state: "PR", description: "Videotelemetria, câmeras DSM e ADAS para operações críticas.", products: 15, accent: "violet" },
  { id: 4, name: "TagGo Sistemas", initials: "TG", category: "Tags e identificação", city: "Belo Horizonte", state: "MG", description: "Identificação RFID e controle seguro de condutores e veículos.", products: 6, accent: "green" },
];

const cities = [
  { city: "Belo Horizonte", state: "MG", count: 1, x: 72, y: 70 },
  { city: "São Paulo", state: "SP", count: 2, x: 68, y: 77 },
  { city: "Curitiba", state: "PR", count: 1, x: 61, y: 84 },
];

export default function Home() {
  const [view, setView] = useState<"map" | "directory" | "supplier">("map");
  const [registered, setRegistered] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState(cities[1]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas as categorias");
  const [toast, setToast] = useState("");
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setWelcomeOpen(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

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
    setRegisterOpen(false);
    setToast("Acesso liberado. Bem-vindo ao Hub Brasil!");
    if (selectedSupplier) setView("supplier");
    window.setTimeout(() => setToast(""), 3500);
  }

  function showSupplier(supplier: Supplier) {
    setSelectedSupplier(supplier);
    requestAccess(supplier);
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
          <button onClick={() => { setView("directory"); setCategory("Rastreadores"); }}>Produtos</button>
        </nav>
        <div className="top-actions">
          {registered ? <span className="access-chip"><i></i>Acesso liberado</span> : <button className="text-action" onClick={() => setRegisterOpen(true)}>Entrar</button>}
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
              <div className="trust-row">
                <div><strong>0</strong><span>fornecedores reais</span></div>
                <div><strong>4</strong><span>perfis de demonstração</span></div>
                <div><strong>3</strong><span>estados simulados</span></div>
              </div>
            </div>
            <div className="map-panel" aria-label="Mapa ilustrativo de fornecedores no Brasil">
              <div className="map-grid"></div>
              <div className="brazil-map">
                <img src="/brazil-states-map.png" alt="Mapa geográfico do Brasil dividido por estados" />
                {cities.map((item) => (
                  <button key={item.city} className={`map-pin ${selectedCity.city === item.city ? "selected" : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%` }} onClick={() => setSelectedCity(item)} aria-label={`${item.city}, ${item.count} cadastro de demonstração`}>
                    <span>{item.count}</span>
                  </button>
                ))}
              </div>
              <span className="map-caption">LOCALIZAÇÕES DE DEMONSTRAÇÃO</span>
              <div className="city-popover">
                <span className="location-dot"></span>
                <div><strong>{selectedCity.city}, {selectedCity.state}</strong><small>{selectedCity.count} {selectedCity.count === 1 ? "perfil demonstrativo" : "perfis demonstrativos"}</small></div>
                <button onClick={() => setView("directory")} aria-label={`Ver fornecedores de ${selectedCity.city}`}>→</button>
              </div>
              <div className="map-legend"><i></i> Clique nos pontos para explorar</div>
              <a className="map-source" href="https://commons.wikimedia.org/wiki/File:Brazil_states_blank.png" target="_blank" rel="noreferrer">Mapa: Wikimedia Commons · CC BY-SA</a>
            </div>
          </section>
        )}

        {view === "directory" && (
          <section className="directory-page">
            <div className="page-heading"><div><span className="eyebrow">CATÁLOGO DE DEMONSTRAÇÃO</span><h1>Fornecedores</h1><p>Os nomes, contatos, produtos e números abaixo são fictícios.</p></div><span>{filtered.length} perfis demonstrativos</span></div>
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
                  <div className="card-meta"><span>⌖ {supplier.city}, {supplier.state}</span><span>{supplier.products} produtos</span></div>
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
              <a className="primary contact" href="https://wa.me/5511999999999?text=Olá!%20Encontrei%20sua%20empresa%20no%20Hub%20Brasil." target="_blank" rel="noreferrer">Conversar no WhatsApp</a>
            </div>
            <div className="profile-columns">
              <div><h2>Produtos em destaque</h2><div className="product-grid">{["Rastreador 4G HX-200", "Rastreador compacto MiniOne", "Chicote universal 12 vias"].map((name, index) => <article className="product-card" key={name}><div className={`product-visual p${index + 1}`}><span>{index === 2 ? "ACESSÓRIO" : "4G LTE"}</span><div className="device"></div></div><span className="category">{index === 2 ? "Acessórios" : "Rastreadores"}</span><h3>{name}</h3><p>{index === 0 ? "A partir de R$ 189" : index === 1 ? "A partir de R$ 159" : "A partir de R$ 32"}</p><button onClick={() => setToast("Interesse registrado. Abrindo canal de contato…")}>Solicitar informações →</button></article>)}</div></div>
              <aside className="contact-panel"><h3>Contato comercial</h3><p>Seus dados foram identificados. Você já pode falar diretamente com este fornecedor.</p><dl><div><dt>Telefone</dt><dd>(11) 99999-2020</dd></div><div><dt>Instagram</dt><dd>@{selectedSupplier.name.toLowerCase().replaceAll(" ", "")}</dd></div><div><dt>Localização</dt><dd>{selectedSupplier.city}, {selectedSupplier.state}</dd></div></dl><a href="tel:+5511999992020">Ligar agora</a></aside>
            </div>
          </section>
        )}
      </main>

      <nav className="mobile-nav" aria-label="Navegação móvel">
        <button className={view === "map" ? "active" : ""} onClick={() => setView("map")}><span>⌖</span>Mapa</button>
        <button className={view === "directory" ? "active" : ""} onClick={() => setView("directory")}><span>▦</span>Fornecedores</button>
        <button onClick={() => setRegisterOpen(true)}><span>◎</span>Conta</button>
      </nav>

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
            <form onSubmit={register}>
              <label>Seu nome<input name="name" required placeholder="Como podemos chamar você?" /></label>
              <label>Telefone / WhatsApp<input name="phone" required inputMode="tel" placeholder="(00) 00000-0000" /></label>
              <div className="or"><span></span>Informe um dos dois<span></span></div>
              <div className="field-row"><label>Empresa<input name="company" placeholder="Nome da empresa" /></label><label>Instagram<input name="instagram" placeholder="@suaempresa" /></label></div>
              <label className="consent"><input type="checkbox" required /> <span>Concordo com a Política de Privacidade e com o uso dos meus dados para liberar o acesso à plataforma.</span></label>
              <button className="primary full" type="submit">Liberar meu acesso <span>→</span></button>
            </form>
            <small>Seus dados só serão compartilhados com um fornecedor quando você solicitar contato.</small>
          </section>
        </div>
      )}
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </div>
  );
}
