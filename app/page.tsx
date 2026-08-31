"use client";

import { type ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { BRAZIL_STATES } from "./brazil-states";
import { WhatsAppField } from "./whatsapp-field";

// Os tipos oficiais da Cloudflare tipam Response.json() como `unknown` em vez de `any`;
// este helper concentra a conversão explícita usada em todas as leituras de JSON do fetch.
function readJson(response: Response): Promise<any> {
  return response.json() as Promise<any>;
}

type Supplier = {
  id: number;
  name: string;
  initials: string;
  category: string;
  categories?: string[];
  city: string;
  state: string;
  description: string;
  accent: string;
  phone?: string | null;
  instagram?: string | null;
  website?: string | null;
  phonePreview?: string | null;
  contactRevealed?: boolean;
  verificationStatus?: string | null;
  verifiedAt?: string | null;
  qualityScore?: number;
  qualityReasons?: string[];
  logoKey?: string | null;
  highlightedOnMap?: boolean;
  highlightedInSearch?: boolean;
  founderMember?: boolean;
  quoteRequests?: number;
  quoteResponses?: number;
  serviceStates?: string[];
  slaLabel?: string | null;
  priceRangeLabel?: string | null;
  productCount?: number;
  serviceAreaLabel?: string | null;
  newSupplier?: boolean;
  fastResponder?: boolean;
};

type HubEvent = { id: number; name: string; supplier: string; venue: string; city: string; state: string; date: string; displayDate: string; link: string; x: number; y: number; demo?: boolean };
type ProductSpecs = { technology?: string[]; ip?: string; battery?: string; warranty?: string; anatel?: boolean; application?: string[]; features?: string[] };
type Product = { id: number; supplierId?: number | null; supplierName: string; supplierPhone?: string | null; name: string; category: string; technicalDetails: string; highlighted?: boolean; imageUrl?: string | null; specs?: ProductSpecs | null; manualUrl?: string | null; averagePrice?: string | null };
type SectorNews = { id: number; title: string; summary: string; category: string; sourceName: string; sourceUrl: string; imageUrl?: string | null; publishedAt: string };

const solutionCategories = [
  { name: "Rastreadores", title: "Rastreadores veiculares", icon: "◎", description: "GPS, 2G, 4G e LTE para veículos, frotas e cargas." },
  { name: "Plataformas de rastreamento veicular", title: "Plataformas de rastreamento", icon: "▤", description: "Software e monitoramento para operações conectadas." },
  { name: "Conectividade M2M", title: "Chips M2M", icon: "⌁", description: "Conectividade para rastreadores e dispositivos." },
  { name: "Videotelemetria", title: "Videotelemetria", icon: "◉", description: "Câmeras veiculares, ADAS e DSM em uma única solução." },
  { name: "Tags e identificação", title: "Tags e identificação", icon: "◇", description: "RFID e identificação aplicada à operação veicular." },
  { name: "Telemetria", title: "Telemetria", icon: "⌁", description: "Dados veiculares e de frota para decisões em tempo real." },
  { name: "Sensores", title: "Sensores", icon: "◌", description: "Temperatura, combustível, porta, ignição e mais." },
  { name: "Identificação de motorista", title: "Identificação de motorista", icon: "◍", description: "Biometria, tags, 1-Wire e iButton." },
  { name: "CAN / OBD", title: "CAN / OBD", icon: "⌘", description: "Leitura de dados do veículo e do barramento CAN." },
  { name: "LoRaWAN", title: "LoRaWAN", icon: "⌇", description: "Conectividade de baixa potência para aplicações específicas." },
  { name: "Acessórios", title: "Acessórios", icon: "◇", description: "Complementos para instalação e operação de rastreamento." },
] as const;

// Campos técnicos estruturados (opcionais) por categoria — pensado para comparação rápida
// entre produtos sem transformar o cadastro numa ficha técnica obrigatória e cansativa.
// Dados mais profundos (protocolos, pinagem, consumo detalhado etc.) ficam reservados
// ao manual técnico em PDF/link, não ao formulário.
const productSpecFields: Record<string, Array<"technology" | "ip" | "battery" | "warranty" | "anatel" | "application" | "features">> = {
  "Rastreadores": ["technology", "ip", "battery", "warranty", "anatel", "application", "features"],
  "Plataformas de rastreamento veicular": ["technology", "application"],
  "Conectividade M2M": ["technology", "battery", "ip", "anatel"],
  "Videotelemetria": ["technology", "ip", "anatel", "application", "features"],
  "Tags e identificação": ["ip", "application"],
  "Telemetria": ["technology", "application"],
  "Sensores": ["ip", "battery", "application"],
  "Identificação de motorista": ["technology", "features", "application"],
  "CAN / OBD": ["technology", "application"],
  "LoRaWAN": ["technology", "battery", "ip", "anatel"],
  "Acessórios": ["application"],
};

const productTechnologyOptions = ["2G", "4G Cat 1", "GPS", "LoRaWAN", "BLE", "Satelital"] as const;
const productIpOptions = ["IP54", "IP65", "IP66", "IP67", "IP68"] as const;
const productWarrantyOptions = ["3 meses", "6 meses", "1 ano", "2 anos", "3 anos ou mais"] as const;
const productApplicationOptions = ["Frota leve", "Frota pesada", "Moto", "Carga", "Ativos e equipamentos", "Uso pessoal"] as const;
const productFeatureOptions = ["Detecção de jammer", "Análise do motorista (DBH)", "Cercas embarcadas"] as const;

const audienceGroups = [
  "Empresas de rastreamento veicular",
  "Associações de proteção veicular",
  "Gestoras de frota e transportadoras",
  "Fabricantes de rastreadores e câmeras",
  "Empresas de IoT, M2M e LoRaWAN",
  "Plataformas de rastreamento e telemetria",
  "Fornecedores de conectividade e chips",
  "Integradores e desenvolvedores",
  "Empresas de instalação e serviços",
] as const;

type QuoteDraft = {
  category: string;
  application: string;
  quantity: string;
  city: string;
  state: string;
  deadline: string;
  notes: string;
  budget: string;
  urgency: string;
  integration: string[];
  supplierIds: string[];
  contactConsent: boolean;
};

const quoteBudgetOptions = ["Econômico", "Intermediário", "Avançado"] as const;
const quoteUrgencyOptions = ["Imediata", "Até 15 dias", "Sem pressa"] as const;
const quoteIntegrationOptions = ["API", "Planilha / exportação", "Nenhuma integração necessária"] as const;

function matchScore(supplier: Supplier, draft: QuoteDraft): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const wantedCategory = draft.category.replace(/\s+/g, " ").trim().toLowerCase();
  const supplierCategories = (supplier.categories?.length ? supplier.categories : [supplier.category]).map((item) => displayCategory(item).toLowerCase());
  if (wantedCategory && supplierCategories.some((item) => item.includes(wantedCategory) || wantedCategory.includes(item))) { score += 45; reasons.push("mesma especialidade"); }
  const wantedState = draft.state.trim().toUpperCase();
  if (wantedState) {
    if (supplier.state === wantedState) {
      score += 25; reasons.push(`atende ${wantedState}`);
      if (draft.city && supplier.city && supplier.city.toLowerCase() === draft.city.trim().toLowerCase()) { score += 10; reasons.push("mesma cidade"); }
    } else if (supplier.serviceStates?.includes(wantedState)) { score += 20; reasons.push(`cobertura em ${wantedState}`); }
  }
  const responseRate = typeof supplier.quoteResponses === "number" && typeof supplier.quoteRequests === "number" && supplier.quoteRequests > 0 ? supplier.quoteResponses / supplier.quoteRequests : null;
  if (responseRate !== null) { score += Math.round(responseRate * 20); if (responseRate >= 0.6) reasons.push("alta taxa de resposta"); }
  if (typeof supplier.qualityScore === "number") score += Math.round((supplier.qualityScore / 100) * 10);
  return { score: Math.max(0, Math.min(100, score)), reasons };
}

function displayCategory(category: string) {
  return category === "Câmeras veiculares" || category === "ADAS e DSM" ? "Videotelemetria" : category;
}

// Fornecedores "broker" atendem várias categorias (marcadas em "Soluções oferecidas"), mas o
// card só mostrava a categoria principal — dava a impressão de que a empresa atendia só uma
// frente. Mostra até 2 categorias e resume o resto em "+N categorias".
function supplierCategoryBadges(supplier: { category: string; categories?: string[] }) {
  // Normaliza pelo nome de exibição ANTES de filtrar/deduplicar: "Câmeras veiculares" e "ADAS e
  // DSM" viram "Videotelemetria" via displayCategory, então precisam colapsar num badge só —
  // senão o mesmo rótulo aparecia repetido.
  const raw = supplier.categories?.length ? supplier.categories : [supplier.category];
  const categories = [...new Set(raw.map(displayCategory).filter(Boolean))];
  const shown = categories.slice(0, 2);
  const extra = categories.length - shown.length;
  return <div className="category-badges">{shown.map((item) => <span className="category-badge" key={item}>{item}</span>)}{extra > 0 && <span className="category-badge more">+{extra} categoria{extra > 1 ? "s" : ""}</span>}</div>;
}

function supplierLogoUrl(key?: string | null) {
  return key ? `/api/supplier-logo?key=${encodeURIComponent(key)}` : null;
}

function mapPoint(state: string) {
  const points: Record<string, [number, number]> = { AC:[26,45],AM:[35,30],RR:[45,15],RO:[38,50],PA:[55,32],AP:[62,18],TO:[58,48],MA:[67,38],PI:[70,46],CE:[78,42],RN:[86,43],PB:[84,48],PE:[81,51],AL:[80,55],SE:[78,59],BA:[70,60],MT:[49,53],GO:[58,62],DF:[61,59],MS:[48,68],MG:[65,69],ES:[74,69],RJ:[70,76],SP:[59,76],PR:[55,83],SC:[56,89],RS:[51,95] };
  return points[state] || [55, 55];
}

export default function Home() {
  const [view, setView] = useState<"map" | "solutions" | "directory" | "supplier" | "events" | "products" | "news" | "about" | "supplier-dashboard" | "client-dashboard" | "how-it-works" | "messages">("map");
  const [registered, setRegistered] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas as categorias");
  const [stateFilter, setStateFilter] = useState("Todo o Brasil");
  const [toast, setToast] = useState("");
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [events, setEvents] = useState<HubEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<HubEvent | null>(null);
  const [registrationRole, setRegistrationRole] = useState<"client" | "supplier">("client");
  const [userRole, setUserRole] = useState<"client" | "supplier" | null>(null);
  const [supplierCompany, setSupplierCompany] = useState("");
  const [supplierApproved, setSupplierApproved] = useState(false);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [productFormCategory, setProductFormCategory] = useState("");
  const [productFormSpecs, setProductFormSpecs] = useState<{ technology: string[]; ip: string; battery: string; warranty: string; anatel: boolean; application: string[]; features: string[] }>({ technology: [], ip: "", battery: "", warranty: "", anatel: false, application: [], features: [] });
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [ratings, setRatings] = useState<Record<string, { average: number; total: number }>>({});
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [news, setNews] = useState<SectorNews[]>([]);
  const [newsCategory, setNewsCategory] = useState("Todos");
  const [referralCode, setReferralCode] = useState("");
  const [previewMode, setPreviewMode] = useState<"client" | "supplier" | null>(null);
  const [dashboard, setDashboard] = useState<{ supplierMetrics?: Record<string, number>; supplierQuotes?: Array<{ id:number; protocol:string; category:string; application:string; status:string; createdAt:string; isNewLead?:boolean }>; supplierStats?: { totalReceived:number; totalResponded:number; acceptanceRate:number; newLeads:number; quoteRequests7d:number; quoteResponses7d:number; responseRate7d:number; avgResponseMinutes7d:number|null; quoteRequests30d:number } | null; clientQuotes?: Array<{ id:number; protocol:string; category:string; application:string; city:string; state:string; status:string; createdAt:string; recipientsTotal:number; recipientsResponded:number; recipientsDeclined:number; recipientsCompleted:number }>; profile?: { address?:string|null; city?:string|null; state?:string|null; phone?:string|null; instagram?:string|null; website?:string|null; description?:string|null; categories?:string[] } }>({});
  const [platformSlaLabel, setPlatformSlaLabel] = useState<string | null>(null);
  const [quoteActionBusy, setQuoteActionBusy] = useState("");
  // Guarda contra duplo-clique/duplo-submit e contra falha de rede silenciosa nos 3 formularios
  // principais (cotacao, mensagem, editar empresa) — antes, um erro de rede travava sem feedback
  // e o botao continuava clicavel, permitindo enviar a mesma cotacao/mensagem duas vezes.
  const [formBusy, setFormBusy] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [messageData, setMessageData] = useState<{ conversations: Array<{id:number;subject:string;updatedAt:string;supplierName?:string;clientName?:string;clientCompany?:string;unreadCount?:number}>; messages?: Array<{id:number;senderUserId:string;body:string;createdAt:string;readAt?:string|null}>; currentUserId?:string }>({ conversations: [] });
  const messageTemplates = ["Olá, gostaria de saber mais sobre os produtos e prazos de entrega.", "Preciso de um orçamento — pode me passar faixa de preço e disponibilidade?", "Qual o prazo médio de instalação/implantação para a minha região?"];
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [quoteFlowOpen, setQuoteFlowOpen] = useState(false);
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft>({ category: "", application: "", quantity: "1", city: "", state: "", deadline: "", notes: "", budget: "", urgency: "", integration: [], supplierIds: [], contactConsent: false });
  const [pendingContactSupplier, setPendingContactSupplier] = useState<Supplier | null>(null);
  const navigationMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!navigationOpen) return;
    function closeNavigation(event: PointerEvent) {
      if (!navigationMenuRef.current?.contains(event.target as Node)) setNavigationOpen(false);
    }
    document.addEventListener("pointerdown", closeNavigation);
    return () => document.removeEventListener("pointerdown", closeNavigation);
  }, [navigationOpen]);

  function navigateTo(nextView: typeof view) {
    setView(nextView);
    setNavigationOpen(false);
  }

  async function refreshSuppliers() {
    try { const response = await fetch("/api/suppliers"); const data = await readJson(response); const mapped = (data.suppliers || []).map((item: Supplier) => ({ ...item, initials: item.name.split(/\s+/).slice(0,2).map((part) => part[0]).join("").toUpperCase(), description: item.description || "Fornecedor aprovado no Hub Brasil.", accent: "blue" })); setSuppliers(mapped); if (data.platformSlaLabel) setPlatformSlaLabel(data.platformSlaLabel); return mapped as Supplier[]; } catch { return null; }
  }

  async function refreshProducts() {
    try { const response = await fetch("/api/products"); const data = await readJson(response); setProducts(data.products || []); } catch {}
  }

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const requestedRole = search.get("cadastro");
    const referredBy = search.get("indicado");
    const requestedPreview = search.get("visao");
    const requestedView = search.get("ir");
    const requestedCategory = search.get("categoria");
    if (requestedView === "directory" || requestedView === "solutions" || requestedView === "news" || requestedView === "events" || requestedView === "products") setView(requestedView);
    if (requestedCategory) setCategory(requestedCategory);
    if (requestedView) window.history.replaceState({}, "", window.location.pathname);
    if (requestedPreview === "usuario" || requestedPreview === "fornecedor") {
      const role = requestedPreview === "fornecedor" ? "supplier" : "client";
      setPreviewMode(role);
      setRegistered(true);
      setUserRole(role);
      setWelcomeOpen(false);
      if (role === "supplier") {
        setSupplierCompany("Visualização do fornecedor");
        setView("supplier-dashboard");
      }
    }
    if (referredBy) setReferralCode(referredBy.toUpperCase().slice(0, 80));
    if (requestedRole === "fornecedor" || requestedRole === "cliente" || requestedRole === "acessar") {
      if (requestedRole === "fornecedor" || requestedRole === "cliente") setRegistrationRole(requestedRole === "fornecedor" ? "supplier" : "client");
      setRegisterOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
    refreshProducts();
    fetch("/api/ratings").then((response) => readJson(response)).then((data) => setRatings(data.ratings || {})).catch(() => {});
    refreshSuppliers();
    fetch("/api/news").then((response) => readJson(response)).then((data) => setNews(data.news || [])).catch(() => {});
    fetch("/api/events").then((response) => readJson(response)).then((data) => setEvents((data.events || []).map((item: Record<string, string | number>) => { const [x,y] = mapPoint(String(item.state)); const date = new Date(`${item.eventDate}T12:00:00`); return { id: Number(item.id), name: String(item.name), supplier: String(item.supplierName || "Fornecedor aprovado"), venue: String(item.venue), city: String(item.city), state: String(item.state), date: String(item.eventDate), displayDate: date.toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" }).toUpperCase().replace(".", ""), link: String(item.registrationUrl), x, y }; }))).catch(() => {});
    fetch("/api/me").then((response) => readJson(response)).then((data) => {
      if (data.isAdmin && !requestedPreview) {
        window.location.replace("/admin");
        return;
      }
      if (data.profile) {
        setRegistered(true);
        setUserRole(data.profile.role);
        setSupplierCompany(data.profile.company || "");
        setSupplierApproved(data.profile.status === "approved" && Boolean(data.profile.phoneVerifiedAt));
        setWelcomeOpen(false);
        refreshSuppliers();
        refreshProducts();
        fetch("/api/roadmap").then((response) => response.ok ? readJson(response) : null).then((result) => result && setDashboard(result)).catch(() => {});
      }
    }).catch(() => {});
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
    const matchesCategory = category === "Todas as categorias" || (supplier.categories || [supplier.category]).some((item) => displayCategory(item) === category);
    const matchesState = stateFilter === "Todo o Brasil" || supplier.state === stateFilter;
    return matchesQuery && matchesCategory && matchesState;
  }), [suppliers, query, category, stateFilter]);

  const plottedEvents = useMemo(() => {
    const eventsByState = new Map<string, HubEvent[]>();
    events.forEach((item) => eventsByState.set(item.state, [...(eventsByState.get(item.state) || []), item]));

    return events.flatMap((item) => {
      const stateEvents = eventsByState.get(item.state) || [item];
      const index = stateEvents.findIndex((eventItem) => eventItem.id === item.id);
      if (stateEvents.length === 1) return item;

      const angle = (index / stateEvents.length) * Math.PI * 2 - Math.PI / 2;
      const radius = Math.min(5, 2.8 + stateEvents.length * 0.35);
      return { ...item, x: item.x + Math.cos(angle) * radius, y: item.y + Math.sin(angle) * radius };
    });
  }, [events]);

  const newsCategories = useMemo(() => ["Todos", ...Array.from(new Set(news.map((item) => item.category)))], [news]);
  const filteredNews = useMemo(() => newsCategory === "Todos" ? news : news.filter((item) => item.category === newsCategory), [news, newsCategory]);
  const isContactUnlocked = (supplier: Supplier) => Boolean(supplier.contactRevealed);

  function requestAccess(supplier?: Supplier) {
    if (supplier) setSelectedSupplier(supplier);
    if (!registered) {
      setRegisterOpen(true);
      return;
    }
    if (supplier) setView("supplier");
  }

  function openQuoteRequest(preselectedSupplier?: Supplier, presetCategory?: string) {
    if (!registered) {
      openRegistration("client");
      setToast("Identifique-se para solicitar uma cotação aos fornecedores compatíveis.");
      window.setTimeout(() => setToast(""), 3500);
      return;
    }
    if (userRole !== "client") {
      setToast("Somente perfis de usuário podem solicitar cotação.");
      window.setTimeout(() => setToast(""), 3000);
      return;
    }
    setQuoteDraft((draft) => ({
      ...draft,
      supplierIds: preselectedSupplier ? [String(preselectedSupplier.id)] : [],
      category: presetCategory ?? (preselectedSupplier ? "" : draft.category),
      city: preselectedSupplier ? draft.city || preselectedSupplier.city || "" : draft.city,
      state: preselectedSupplier ? draft.state || preselectedSupplier.state || "" : draft.state,
    }));
    setQuoteFlowOpen(true);
  }

  function openContactForSupplier(supplier: Supplier) {
    if (!registered) {
      openRegistration("client");
      setToast("Identifique-se para solicitar contato com fornecedores.");
      window.setTimeout(() => setToast(""), 3000);
      return;
    }
    if (userRole !== "client") {
      setToast("A liberação de contato está disponível para perfis de usuário.");
      window.setTimeout(() => setToast(""), 3000);
      return;
    }
    if (isContactUnlocked(supplier)) {
      setToast("Contato já liberado nesta sessão.");
      window.setTimeout(() => setToast(""), 2000);
      return;
    }
    setPendingContactSupplier(supplier);
  }

  async function confirmContactForSupplier() {
    if (!pendingContactSupplier) return;
    const supplier = pendingContactSupplier;
    setPendingContactSupplier(null);
    try {
      const response = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "track", kind: "contact_revealed", supplierId: supplier.id }),
      });
      const data = await readJson(response).catch(() => ({}));
      if (!response.ok) { setToast(data.error || "Não foi possível liberar o contato."); return; }
      const refreshedList = await refreshSuppliers();
      const refreshed = refreshedList?.find((item) => item.id === supplier.id);
      if (!refreshed?.contactRevealed) { setToast("Não foi possível confirmar a liberação. Tente novamente."); return; }
      setSelectedSupplier(refreshed);
      setToast("Contato liberado. Agora o WhatsApp e telefone aparecem no perfil.");
    } catch { setToast("Não foi possível liberar o contato."); }
    window.setTimeout(() => setToast(""), 3000);
  }

  function closeContactForSupplier() {
    setPendingContactSupplier(null);
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const logo = form.get("logo");
    const profilePhoto = form.get("profilePhoto");
    const payload = Object.fromEntries([...form.entries()].filter(([key]) => key !== "logo" && key !== "profilePhoto")) as Record<string, FormDataEntryValue>;
    payload.categories = JSON.stringify(form.getAll("categories"));
    if (referralCode) payload.referralCode = referralCode;
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await readJson(response);
      if (response.status === 401) { window.location.href = result.signIn; return; }
      if (!response.ok) { setToast(result.error || "Não foi possível cadastrar."); return; }
    } catch { setToast("Não foi possível concluir o cadastro. Tente novamente."); return; }
    if (registrationRole === "supplier" && logo instanceof File && logo.size) {
      const logoForm = new FormData();
      logoForm.set("logo", logo);
      logoForm.set("logoConsent", String(payload.logoConsent === "on"));
      const logoResponse = await fetch("/api/supplier-logo", { method: "POST", body: logoForm });
      if (!logoResponse.ok) { const result = await readJson(logoResponse).catch(() => ({})); setToast(result.error || "Cadastro criado, mas não foi possível enviar a logo."); }
    }
    if (registrationRole === "client" && profilePhoto instanceof File && profilePhoto.size) {
      const photoForm = new FormData();
      photoForm.set("photo", profilePhoto);
      const photoResponse = await fetch("/api/profile-photo", { method: "POST", body: photoForm });
      if (!photoResponse.ok) { const result = await readJson(photoResponse).catch(() => ({})); setToast(result.error || "Cadastro criado, mas não foi possível enviar a foto."); }
    }
    setRegistered(true);
    await refreshSuppliers();
    await refreshProducts();
    setUserRole(registrationRole);
    if (registrationRole === "supplier") {
      const company = String(payload.company || "").trim();
      setSupplierCompany(company);
      setSupplierApproved(false);
      setView("supplier-dashboard");
    }
    setRegisterOpen(false);
    setToast(registrationRole === "supplier" ? "Cadastro enviado. O gestor validará seu telefone e sua empresa." : "Acesso liberado. Bem-vindo ao Hub Brasil!");
    if (selectedSupplier && registrationRole === "client") setView("supplier");
    window.setTimeout(() => setToast(""), 3500);
  }

  function toggleProductSpecValue(field: "technology" | "application" | "features", value: string) {
    setProductFormSpecs((current) => {
      const list = current[field];
      const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
      return { ...current, [field]: next };
    });
  }

  function resetProductForm() {
    setProductFormCategory("");
    setProductFormSpecs({ technology: [], ip: "", battery: "", warranty: "", anatel: false, application: [], features: [] });
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("supplierName", supplierCompany || "Fornecedor cadastrado");
    const photo = form.get("photo");
    const preview = photo instanceof File && photo.size ? URL.createObjectURL(photo) : null;
    const allowedFields = productSpecFields[productFormCategory] || [];
    const specs: Record<string, unknown> = {};
    if (allowedFields.includes("technology") && productFormSpecs.technology.length) specs.technology = productFormSpecs.technology;
    if (allowedFields.includes("ip") && productFormSpecs.ip) specs.ip = productFormSpecs.ip;
    if (allowedFields.includes("battery") && productFormSpecs.battery.trim()) specs.battery = productFormSpecs.battery.trim();
    if (allowedFields.includes("warranty") && productFormSpecs.warranty) specs.warranty = productFormSpecs.warranty;
    if (allowedFields.includes("anatel") && productFormSpecs.anatel) specs.anatel = true;
    if (allowedFields.includes("application") && productFormSpecs.application.length) specs.application = productFormSpecs.application;
    if (allowedFields.includes("features") && productFormSpecs.features.length) specs.features = productFormSpecs.features;
    if (Object.keys(specs).length) form.set("specs", JSON.stringify(specs));
    try { const response = await fetch("/api/products", { method: "POST", body: form }); const data = await readJson(response); if (response.status === 401) { window.location.href = data.signIn; return; } if (!response.ok) { setToast(data.error); return; } } catch { setToast("Não foi possível enviar o produto."); return; }
    if (preview) URL.revokeObjectURL(preview); setProductFormOpen(false); resetProductForm(); setView("supplier-dashboard"); setToast("Produto enviado para aprovação do gestor."); window.setTimeout(() => setToast(""), 3500);
  }

  async function rateSupplier(supplierId: number, name: string, stars: number) {
    if (userRole !== "client") { setToast("Entre como usuário para avaliar fornecedores."); window.setTimeout(() => setToast(""), 3000); return; }
    const current = ratings[name] || { average: 0, total: 0 };
    const optimistic = { average: (current.average * current.total + stars) / (current.total + 1), total: current.total + 1 };
    setRatings((all) => ({ ...all, [name]: optimistic }));
    // Manda o supplierId (não mais o nome) — a API valida o ID direto, sem risco de casar com o
    // fornecedor errado quando dois têm o mesmo nome.
    try { const response = await fetch("/api/ratings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ supplierId, stars }) }); const data = await readJson(response); if (response.status === 401) { window.location.href = data.signIn; return; } if (response.ok) setRatings((all) => ({ ...all, [name]: data })); } catch {}
  }

  async function respondQuote(quoteId: number, responseStatus: "responded" | "declined") {
    setQuoteActionBusy(`respond-${quoteId}`);
    try {
      const response = await fetch("/api/roadmap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "quote_response", quoteId, responseStatus }) });
      const data = await readJson(response).catch(() => ({}));
      if (response.status === 401) { window.location.href = data.signIn; return; }
      if (!response.ok) { setToast(data.error || "Não foi possível atualizar esta cotação."); window.setTimeout(() => setToast(""), 3500); return; }
      const refreshed = await fetch("/api/roadmap").then((result) => result.ok ? readJson(result) : null).catch(() => null);
      if (refreshed) setDashboard(refreshed);
      setToast(responseStatus === "responded" ? "Cotação marcada como respondida." : "Cotação recusada.");
      window.setTimeout(() => setToast(""), 3000);
    } finally {
      setQuoteActionBusy("");
    }
  }

  async function closeQuoteRequest(quoteId: number) {
    setQuoteActionBusy(`close-${quoteId}`);
    try {
      const response = await fetch("/api/roadmap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "close_quote", quoteId }) });
      const data = await readJson(response).catch(() => ({}));
      if (response.status === 401) { window.location.href = data.signIn; return; }
      if (!response.ok) { setToast(data.error || "Não foi possível encerrar esta cotação."); window.setTimeout(() => setToast(""), 3500); return; }
      const refreshed = await fetch("/api/roadmap").then((result) => result.ok ? readJson(result) : null).catch(() => null);
      if (refreshed) setDashboard(refreshed);
      setToast("Cotação encerrada.");
      window.setTimeout(() => setToast(""), 3000);
    } finally {
      setQuoteActionBusy("");
    }
  }

  function showSupplier(supplier: Supplier) {
    setSelectedSupplier(supplier);
    requestAccess(supplier);
    if (registered) fetch("/api/roadmap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "track", kind: "profile_view", supplierId: supplier.id }) }).catch(() => {});
  }

  function openRegistration(role: "client" | "supplier") {
    setRegistrationRole(role);
    setRegisterOpen(true);
  }

  async function loadMessages(conversationId?: number) {
    try { const response = await fetch(`/api/messages${conversationId ? `?conversationId=${conversationId}` : ""}`); const data = await readJson(response); if (!response.ok) { setToast(data.error || "Não foi possível abrir mensagens."); return; } setMessageData(data); if (conversationId) setActiveConversationId(conversationId); } catch { setToast("Não foi possível abrir mensagens."); }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formBusy) return;
    const form = new FormData(event.currentTarget); const message = String(form.get("message") || "");
    const payload = activeConversationId ? { conversationId: activeConversationId, message } : selectedSupplier ? { supplierId: selectedSupplier.id, subject: `Contato com ${selectedSupplier.name}`, message } : null;
    if (!payload) return;
    setFormBusy(true);
    try {
      const response = await fetch("/api/messages", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(payload) });
      const data = await readJson(response).catch(() => ({}));
      if (!response.ok) { setToast(data.error || "Não foi possível enviar a mensagem."); return; }
      event.currentTarget.reset(); await loadMessages(data.conversationId); setToast("Mensagem enviada."); window.setTimeout(()=>setToast(""),3000);
    } catch {
      setToast("Falha de conexão. A mensagem não foi enviada.");
    } finally {
      setFormBusy(false);
    }
  }

  async function saveCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formBusy) return;
    const form = new FormData(event.currentTarget);
    const payload = { company: form.get("company"), phone: form.get("phone"), instagram: form.get("instagram"), website: form.get("website"), address: form.get("address"), city: form.get("city"), state: form.get("state"), description: form.get("description"), categories: form.getAll("categories") };
    setFormBusy(true);
    try {
      const response = await fetch("/api/leads", { method:"PATCH", headers:{"content-type":"application/json"}, body:JSON.stringify(payload) });
      const data = await readJson(response).catch(() => ({}));
      if (!response.ok) { setToast(data.error || "Não foi possível atualizar a empresa."); return; }
      setSupplierCompany(String(payload.company || "")); setEditingCompany(false); await refreshSuppliers(); fetch("/api/roadmap").then(r=>readJson(r)).then(setDashboard).catch(()=>{}); setToast("Informações da empresa atualizadas."); window.setTimeout(()=>setToast(""),3000);
    } catch {
      setToast("Falha de conexão. As alterações não foram salvas.");
    } finally {
      setFormBusy(false);
    }
  }

  async function copyRegistrationLink() {
    const url = `${window.location.origin}/?cadastro=acessar`;
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link do Hub copiado. A pessoa poderá escolher como deseja se cadastrar.");
    } catch {
      setToast("Não foi possível copiar o link automaticamente.");
    }
    window.setTimeout(() => setToast(""), 3500);
  }

  function openQuoteRequestFromProduct(product: Product) {
    const supplier = suppliers.find((item) => item.id === product.supplierId || item.name === product.supplierName);
    if (supplier) {
      openQuoteRequest(supplier, normalizeTextField(product.category));
      return;
    }
    setQuoteDraft((draft) => ({
      ...draft,
      category: normalizeTextField(product.category),
      supplierIds: [],
    }));
    setQuoteFlowOpen(true);
  }

  function updateQuoteInput(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setQuoteDraft((draft) => ({ ...draft, [name]: value }));
  }

  function toggleQuoteIntegration(value: string) {
    setQuoteDraft((draft) => {
      if (value === "Nenhuma integração necessária") return { ...draft, integration: draft.integration.includes(value) ? [] : [value] };
      const withoutNone = draft.integration.filter((item) => item !== "Nenhuma integração necessária");
      return { ...draft, integration: withoutNone.includes(value) ? withoutNone.filter((item) => item !== value) : [...withoutNone, value] };
    });
  }

  function toggleQuoteSupplier(supplierId: number) {
    setQuoteDraft((draft) => {
      const current = new Set(draft.supplierIds);
      if (current.has(String(supplierId))) {
        current.delete(String(supplierId));
      } else {
        current.add(String(supplierId));
      }
      return { ...draft, supplierIds: Array.from(current) };
    });
  }

  async function submitQuoteRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formBusy) return;
    const payload = {
      action: "quote",
      supplierIds: quoteDraft.supplierIds,
      category: normalizeTextField(quoteDraft.category),
      application: normalizeTextField(quoteDraft.application),
      quantity: Number(quoteDraft.quantity || 1),
      city: normalizeTextField(quoteDraft.city),
      state: normalizeTextField(quoteDraft.state).toUpperCase(),
      deadline: normalizeTextField(quoteDraft.deadline),
      notes: normalizeTextField(quoteDraft.notes),
      budget: quoteDraft.budget,
      urgency: quoteDraft.urgency,
      integration: quoteDraft.integration,
      contactConsent: quoteDraft.contactConsent,
    };
    if (!payload.contactConsent || !payload.category || !payload.application || !payload.city || !payload.state || !payload.supplierIds.length) {
      setToast("Confirme o consentimento e preencha categoria, aplicação, cidade, estado e pelo menos um fornecedor.");
      window.setTimeout(() => setToast(""), 3500);
      return;
    }
    setFormBusy(true);
    try {
      const response = await fetch("/api/roadmap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await readJson(response).catch(() => ({}));
      if (!response.ok) { setToast(data.error || "Não foi possível abrir a cotação."); return; }
      setQuoteFlowOpen(false);
      setToast(`Cotação enviada. Protocolo: ${data.protocol}`);
      window.setTimeout(() => setToast(""), 4500);
      setQuoteDraft({ category: "", application: "", quantity: "1", city: "", state: "", deadline: "", notes: "", budget: "", urgency: "", integration: [], supplierIds: [], contactConsent: false });
      // Sem isso, "Meus pedidos" so mostrava a cotacao recem-enviada depois de um reload —
      // o dashboard so era buscado uma vez no mount.
      fetch("/api/roadmap").then((result) => result.ok ? readJson(result) : null).then((result) => result && setDashboard(result)).catch(() => {});
    } catch {
      setToast("Falha de conexão. A cotação não foi enviada.");
    } finally {
      setFormBusy(false);
    }
  }

  function normalizeTextField(value: string) {
    return value.replace(/\s+/g, " ").trim();
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
    fetch("/api/roadmap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "track", kind: "product_view", supplierId: product.supplierId, productId: product.id }) }).catch(() => {});
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries()) as Record<string, string>;
    try { const response = await fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); const data = await readJson(response); if (response.status === 401) { window.location.href = data.signIn; return; } if (!response.ok) { setToast(data.error); return; } } catch { setToast("Não foi possível enviar o evento."); return; }
    setEventFormOpen(false); setView("supplier-dashboard"); setToast("Evento enviado para aprovação do gestor.");
    window.setTimeout(() => setToast(""), 3500);
  }

  async function markEventInterest(eventId:number){
    if(!registered){setRegistrationRole("client");setRegisterOpen(true);return}
    try {
      const response=await fetch("/api/community",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"event_interest",eventId,reminderEnabled:true})});
      const result=await readJson(response).catch(()=>({}));
      setToast(response.ok?"Interesse salvo. Você poderá receber um lembrete.":result.error||"Não foi possível salvar.");
    } catch {
      setToast("Falha de conexão. Tente novamente.");
    }
    window.setTimeout(()=>setToast(""),3500);
  }

  return (
    <div className="app-shell">
      <header className={`topbar${previewMode ? " preview-topbar" : ""}`}>
        <button className="brand" onClick={() => navigateTo("map")} aria-label="Ir para o mapa do Hub Brasil">
          <span className="brand-mark"><span></span><span></span><span></span></span>
          <span className="brand-copy"><strong>Hub <b>Brasil</b></strong><small>CONECTANDO NEGÓCIOS</small></span>
        </button>
        <nav className="desktop-nav" aria-label="Navegação principal">
          <button className={view === "map" ? "active" : ""} onClick={() => setView("map")}>Início</button>
          <button className={view === "directory" ? "active" : ""} onClick={() => setView("directory")}>Fornecedores</button>
          <button onClick={() => { window.location.href = "/instaladores"; }}>Instaladores</button>
          <button className={view === "solutions" ? "active" : ""} onClick={() => setView("solutions")}>Soluções</button>
          <button className={view === "products" ? "active" : ""} onClick={() => setView("products")}>Produtos</button>
          <button className={view === "events" ? "active" : ""} onClick={() => setView("events")}>Eventos</button>
          <button className={view === "news" ? "active" : ""} onClick={() => setView("news")}>Radar do Setor</button>
          <button className={view === "about" ? "active" : ""} onClick={() => setView("about")}>Sobre o Hub</button>
          <button className={view === "how-it-works" ? "active" : ""} onClick={() => setView("how-it-works")}>Como funciona</button>
          <button onClick={() => openQuoteRequest()}>Solicitar cotação</button>
        </nav>
        <div className="navigation-menu" ref={navigationMenuRef}>
          <button className="mobile-menu-toggle" type="button" aria-expanded={navigationOpen} aria-controls="mobile-navigation" onClick={() => setNavigationOpen((open) => !open)}>Menu <span>☰</span></button>
          {navigationOpen && <nav id="mobile-navigation" className="mobile-navigation" aria-label="Navegação principal móvel">
            {previewMode && <a className="preview-exit" href="/admin">↩ Voltar à Visão Gestor</a>}
            <button onClick={() => navigateTo("map")}>Início</button>
            <button onClick={() => navigateTo("directory")}>Fornecedores</button>
            <a href="/instaladores">Instaladores</a>
            <button onClick={() => navigateTo("solutions")}>Soluções</button>
            <button onClick={() => navigateTo("products")}>Produtos</button>
            <button onClick={() => navigateTo("events")}>Eventos</button>
            <button onClick={() => navigateTo("news")}>Radar do Setor</button>
            <button onClick={() => navigateTo("about")}>Sobre o Hub</button>
            <button onClick={() => navigateTo("how-it-works")}>Como funciona</button>
            <button onClick={() => { openQuoteRequest(); setNavigationOpen(false); }}>Solicitar cotação</button>
            {userRole === "supplier" && <button onClick={() => navigateTo("supplier-dashboard")}>Minha empresa</button>}
            {userRole === "client" && <button onClick={() => navigateTo("client-dashboard")}>Meus pedidos</button>}
            {!registered && <a href="/sign-in?return_to=/">Entrar</a>}
            {registered && !previewMode && <a href="/sign-out">Sair</a>}
          </nav>}
        </div>
        <div className="top-actions">
          {previewMode && <a className="preview-exit" href="/admin">↩ Voltar à Visão Gestor</a>}
          {registered && !previewMode && <button className="admin-link" onClick={() => setView(userRole === "supplier" ? "supplier-dashboard" : "client-dashboard")}>{userRole === "supplier" ? "Painel da operação" : "Meus pedidos"}</button>}
          {registered ? <><span className="access-chip"><i></i>Acesso liberado</span>{!previewMode && <a className="text-action" href="/sign-out">Sair</a>}</> : <a className="text-action" href="/sign-in?return_to=/">Entrar</a>}
          {userRole === "supplier" && !previewMode && <button className="text-action" onClick={() => setView("supplier-dashboard")}>Minha empresa</button>}
          {userRole === "client" && !previewMode && <button className="text-action" onClick={() => setView("client-dashboard")}>Meus pedidos</button>}
          <button className="primary small" onClick={() => openRegistration("supplier")}>Para fornecedores</button>
        </div>
      </header>

      <main>
        {view === "map" && (
          <>
          <section className="map-layout premium-home-hero">
            <div className="map-copy">
              <span className="hero-kicker"><i></i> Curadoria ativa · todo o Brasil</span>
              <h1>Encontre os melhores fornecedores de <em>rastreamento, telemetria e conectividade</em> em um só lugar.</h1>
              <p>Conecte-se a fabricantes, integradores e fornecedores qualificados de todo o Brasil.</p>
              <div className="hero-ctas"><button className="primary" onClick={() => setView("directory")}>⌕ Buscar fornecedor <span>→</span></button><button className="secondary-action" onClick={() => openRegistration("supplier")}>Sou fornecedor <span>→</span></button><a className="secondary-action" href="/instaladores">Encontrar instalador <span>→</span></a></div>
              <p className="quality-promise"><span>✓</span> Aqui, o destaque do fornecedor é por qualidade!</p>
              <p className="quality-promise">{platformSlaLabel ? <><span>⏱</span> Receba propostas — fornecedores respondem em média em {platformSlaLabel}</> : <><span>⏱</span> Solicite cotação e fale com o fornecedor em 1 clique</>}</p>
              <p className="empty-note">Somente fornecedores e eventos aprovados pela gestão aparecem no mapa.</p>
            </div>
            <aside className="hero-intelligence" aria-label="Busca inteligente do Hub Brasil">
              <span className="intelligence-icon">⌕</span>
              <h2>O que sua operação precisa hoje?</h2>
              <p>Descreva a necessidade, o produto ou a empresa. A busca entende as duas coisas.</p>
              <div className="hero-search-stage"><div className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setView("directory"); }} placeholder="Ex.: telemetria CAN para 300 caminhões" aria-label="Buscar" /><button onClick={() => setView("directory")}>Buscar</button></div><div className="suggestion-pills" aria-label="Sugestões de busca"><span>Buscas populares:</span><button onClick={() => { setCategory("Rastreadores"); setView("directory"); }}>Rastreador 4G</button><button onClick={() => { setCategory("Plataformas de rastreamento veicular"); setView("directory"); }}>Plataformas</button><button onClick={() => { setCategory("Videotelemetria"); setView("directory"); }}>Videotelemetria</button><button onClick={() => { setCategory("Conectividade M2M"); setView("directory"); }}>Chip M2M</button></div></div>
              <div className="intelligence-stats"><article><strong>{suppliers.length}+</strong><span>fornecedores</span></article><article><strong>{products.length}+</strong><span>produtos</span></article><article><strong>{solutionCategories.length}</strong><span>soluções</span></article></div>
            </aside>
          </section>
          <section className="value-strip" aria-label="Por que usar o Hub Brasil">
            <div className="value-card"><span className="value-icon">⌕</span><span className="eyebrow">PARA QUEM BUSCA</span><h2>Encontre fornecedores qualificados com mais segurança.</h2><ul><li>Busca por necessidade, produto, empresa ou categoria</li><li>Compare confiança, região e portfólio</li><li>Conexão direta com fornecedores aprovados</li></ul><button className="primary" onClick={() => setView("directory")}>Começar a buscar →</button></div>
            <div className="value-card"><span className="value-icon">↗</span><span className="eyebrow">PARA QUEM FORNECE</span><h2>Transforme visibilidade em oportunidades reais.</h2><ul><li>Perfil público com produtos, eventos e selos</li><li>Demandas com contexto do cliente</li><li>Indicadores de visualização e resposta</li></ul><button className="secondary-action" onClick={() => openRegistration("supplier")}>Cadastrar empresa →</button></div>
          </section>
          <section className="national-map-section">
            <div className="national-map-heading"><span className="eyebrow">MAPA DO BRASIL</span><h2>Uma rede nacional de negócios em funcionamento</h2><p>Explore fornecedores, soluções e eventos por estado. Só entra no mapa o que passou pela curadoria.</p></div>
            <div className="map-panel" aria-label="Mapa ilustrativo de fornecedores no Brasil">
              <div className="map-grid"></div>
              <div className="brazil-map">
                <img src="/brazil-states-map.png" alt="Mapa geográfico do Brasil dividido por estados" />
                {suppliers.map((item) => { const [x,y] = mapPoint(item.state); const logoUrl = supplierLogoUrl(item.logoKey); return <button key={`supplier-${item.id}`} className={`map-pin ${logoUrl ? "logo" : ""} ${item.highlightedOnMap ? "hub-highlight" : ""}`} style={{ left: `${x}%`, top: `${y}%` }} onClick={() => showSupplier(item)} aria-label={`${item.highlightedOnMap ? "Destaque Hub, " : ""}Fornecedor ${item.name}, em ${item.city}`}>{logoUrl ? <img src={logoUrl} alt="" /> : <span>{item.initials}</span>}{item.highlightedOnMap && <i>★</i>}</button>; })}
                {plottedEvents.map((item) => <button key={`event-${item.id}`} className={`event-pin ${selectedEvent?.id === item.id ? "selected" : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%` }} onClick={() => setSelectedEvent(item)} aria-label={`Evento ${item.name}, em ${item.city}`} title={`${item.name} · ${item.city}/${item.state}`}><span>★</span></button>)}
              </div>
              <div className="map-side-copy"><strong>Presença nacional</strong><p>Toque em um estado ou marcador para explorar o que está aprovado por lá.</p><ul><li>27 estados mapeados</li><li>Curadoria antes da publicação</li><li>Proximidade regional para instalação e suporte</li></ul></div>
              <span className="map-caption">FORNECEDORES E EVENTOS APROVADOS</span>
              {!selectedEvent && suppliers.length === 0 && events.length === 0 && <div className="map-empty"><strong>Mapa pronto para receber cadastros reais</strong><span>Fornecedores e eventos aparecerão aqui após aprovação.</span></div>}
              {selectedEvent && <div className="event-popover"><span className="event-date">{selectedEvent.displayDate}</span><div><small>PRÓXIMO EVENTO {selectedEvent.demo ? "· DEMONSTRAÇÃO" : ""}</small><strong>{selectedEvent.name}</strong><span>{selectedEvent.city}, {selectedEvent.state}</span></div><button onClick={() => setView("events")}>Ver →</button></div>}
              <a className="map-source" href="https://commons.wikimedia.org/wiki/File:Brazil_states_blank.png" target="_blank" rel="noreferrer">Mapa: Wikimedia Commons · CC BY-SA</a>
            </div>
          </section>
          <section className="trust-journey"><div className="national-map-heading"><span className="eyebrow">CONFIANÇA</span><h2>Negócios começam com confiança</h2><p>Do primeiro clique ao contato, cada etapa é clara para as duas partes.</p></div><div className="trust-journey-grid">{[["01","Descoberta","Encontre a solução certa"],["02","Curadoria","Confira empresas aprovadas"],["03","Conexão","Libere o contato com segurança"],["04","Conversa","Fale diretamente com o fornecedor"],["05","Avaliação","Compartilhe uma experiência real"]].map(([step,title,copy]) => <article key={step}><span>{step}</span><strong>{title}</strong><p>{copy}</p></article>)}</div></section>
          <section className="home-overview">
            <div className="home-section-heading"><div><span className="eyebrow">DESCUBRA A TECNOLOGIA CERTA</span><h2>Principais soluções</h2><p>Uma base organizada para encontrar tecnologia veicular com clareza.</p></div><button className="section-link" onClick={() => setView("solutions")}>Ver todas →</button></div>
            <div className="solution-preview">{solutionCategories.slice(0, 4).map((item) => <button key={item.name} onClick={() => { setCategory(item.name); setView("directory"); }}><span>{item.icon}</span><strong>{item.title}</strong><small>{item.description}</small></button>)}</div>
            <section className="audience-section" aria-labelledby="audience-heading"><span className="eyebrow">CONEXÃO PARA O SETOR</span><h2 id="audience-heading">Para quem é o Hub Brasil</h2><p className="audience-subhead">Dos dois lados do balcão: quem procura tecnologia encontra fornecedor validado; quem fornece encontra demanda real.</p><div className="audience-grid">{audienceGroups.map((item) => <span key={item}>ϟ {item}</span>)}</div></section>
            <div className="referral-card"><div><span className="eyebrow">FORTALEÇA O ECOSSISTEMA</span><h2>Indique o Hub aos seus parceiros do setor.</h2><p>Compartilhe o Hub com quem fornece soluções ou procura produtos e fornecedores. Ao entrar, cada pessoa escolhe se deseja se cadastrar como fornecedor ou usuário.</p></div><div className="referral-actions"><button className="primary" onClick={copyRegistrationLink}>Copiar link do Hub</button></div></div>
          </section>
          </>
        )}

        {view === "solutions" && (
          <section className="solutions-page">
            <div className="solutions-heading"><span className="eyebrow">CATEGORIAS DO HUB</span><h1>Soluções</h1><p>O ecossistema de rastreamento e telemetria organizado de forma simples para sua pesquisa.</p></div>
            <div className="solutions-grid">{solutionCategories.map((item) => <button key={item.name} className="solution-card" onClick={() => { setCategory(item.name); setView("directory"); }}><span>{item.icon}</span><h2>{item.title}</h2><p>{item.description}</p><small>Ver fornecedores →</small></button>)}</div>
            <div className="ecosystem-cta"><h2>Faça parte do ecossistema</h2><p>Cadastre sua empresa ou encontre o fornecedor ideal hoje mesmo.</p><div><button className="primary" onClick={() => openRegistration("supplier")}>Sou fornecedor →</button><button className="secondary-action" onClick={() => setView("directory")}>Buscar fornecedores</button></div></div>
          </section>
        )}

        {view === "about" && (
          <section className="about-page">
            <div className="about-hero"><span className="eyebrow">SOBRE O HUB BRASIL</span><h1>O ecossistema que aproxima quem procura tecnologia de quem oferece soluções.</h1><p>O Hub Brasil nasceu para organizar o mercado de rastreamento veicular, telemetria e conectividade. Reunimos empresas, produtos e eventos em um ambiente gratuito, seguro e orientado por qualidade.</p></div>
            <div className="about-values"><article><span>◎</span><h2>Nossa missão</h2><p>Facilitar o encontro entre empresas que precisam de tecnologia veicular e fornecedores preparados para atendê-las.</p></article><article><span>✓</span><h2>Qualidade e confiança</h2><p>Cadastros e publicações passam por aprovação. O destaque é conquistado por qualidade, atualização e boas interações — nunca por pagamento.</p></article><article><span>↗</span><h2>Conexões transparentes</h2><p>O Hub aproxima as partes, mas não participa de negociações, valores, ofertas ou pagamentos entre clientes e fornecedores.</p></article></div>
            <section className="about-audience"><span className="eyebrow">PARA QUEM É O HUB BRASIL</span><h2>Feito para fortalecer todo o ecossistema.</h2><div className="audience-grid">{audienceGroups.map((item) => <span key={item}>ϟ {item}</span>)}</div></section>
            <div className="ecosystem-cta"><h2>Faça parte do ecossistema</h2><p>Cadastre sua empresa ou encontre o fornecedor ideal hoje mesmo.</p><div><button className="primary" onClick={() => openRegistration("supplier")}>Sou fornecedor →</button><button className="secondary-action" onClick={() => setView("directory")}>Buscar fornecedores</button></div></div>
          </section>
        )}

        {view === "directory" && (
          <section className="directory-page">
            <div className="page-heading"><div><span className="eyebrow">EMPRESAS APROVADAS</span><h1>Fornecedores</h1><p>Perfis validados pela gestão do Hub Brasil.</p><small>A ordem considera verificação, completude, atualização, avaliações elegíveis e resposta. Pagamentos não alteram a posição.</small></div></div>
            <div className="filters">
              <label className="wide"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar fornecedor ou cidade" /></label>
              <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filtrar por categoria">
                <option>Todas as categorias</option>{solutionCategories.map((item) => <option key={item.name}>{item.name}</option>)}
              </select>
              <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)} aria-label="Filtrar por estado"><option>Todo o Brasil</option>{Array.from(new Set(suppliers.map((item) => item.state))).sort().map((state) => <option key={state}>{state}</option>)}</select>
            </div>
            <div className="supplier-grid">
              {filtered.length === 0 && <div className="events-empty"><strong>Nenhum fornecedor aprovado ainda</strong><p>Novos fornecedores aparecerão aqui após validação do telefone e aprovação da gestão.</p></div>}
              {filtered.map((supplier) => (
                <article className="supplier-card" key={supplier.id}>
                  <div className="supplier-top"><div className={`supplier-logo ${supplier.accent}`}>{supplierLogoUrl(supplier.logoKey) ? <img src={supplierLogoUrl(supplier.logoKey) || ""} alt="" /> : supplier.initials}</div><span className="verified">{supplier.verificationStatus === "verified" ? "◆ Fornecedor verificado" : "Fornecedor aprovado"}</span></div>
                  <div className="supplier-badges">{supplier.highlightedInSearch && <span>⭐ Destaque Hub</span>}{supplier.founderMember && <span>🏅 Membro Fundador</span>}{supplier.fastResponder && <span className="badge-fast">⚡ Resposta rápida</span>}{supplier.newSupplier && <span className="badge-new">🆕 Novo no Hub</span>}</div>
                  {supplierCategoryBadges(supplier)}
                  <h2>{supplier.name}</h2>
                  <p>{supplier.description}</p>
                  {supplier.qualityScore !== undefined && <div className="quality-score"><strong>{supplier.qualityScore}</strong><span>Qualidade no Hub</span><small>{supplier.qualityReasons?.join(" · ")}</small></div>}
                  {ratings[supplier.name] && <div className="rating-badge">★ {ratings[supplier.name].average.toFixed(1)} <small>({ratings[supplier.name].total} avaliações verificadas)</small></div>}
                  <div className="trust-strip">
                    <span>⏱ {supplier.slaLabel || "SLA sem dado suficiente"}</span>
                    <span>💰 {supplier.priceRangeLabel || "Preço sob consulta"}</span>
                    <span>▣ {supplier.productCount ? `${supplier.productCount} produto${supplier.productCount > 1 ? "s" : ""}` : "Sem produtos publicados"}</span>
                    <span>🗺 {supplier.serviceAreaLabel}</span>
                  </div>
                  <div className="card-meta"><span>⌖ {supplier.city}, {supplier.state}</span><span>☎ {isContactUnlocked(supplier) ? supplier.phone || "Contato protegido" : supplier.phonePreview}</span><span>↻ {supplier.quoteRequests ? `${supplier.quoteResponses || 0}/${supplier.quoteRequests} respostas` : "Sem resposta registrada"}</span></div>
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
              <div className={`supplier-logo large ${selectedSupplier.accent}`}>{supplierLogoUrl(selectedSupplier.logoKey) ? <img src={supplierLogoUrl(selectedSupplier.logoKey) || ""} alt="" /> : selectedSupplier.initials}</div>
              <div><span className="verified">{selectedSupplier.verificationStatus === "verified" ? "◆ Fornecedor verificado" : "Fornecedor aprovado"}</span>{selectedSupplier.founderMember && <span className="verified">🏅 Membro Fundador</span>}{selectedSupplier.fastResponder && <span className="verified badge-fast">⚡ Resposta rápida</span>}{selectedSupplier.newSupplier && <span className="verified badge-new">🆕 Novo no Hub</span>}<h1>{selectedSupplier.name}</h1><p>{displayCategory(selectedSupplier.category)} · {selectedSupplier.city}, {selectedSupplier.state}</p>{selectedSupplier.verifiedAt && <small>Verificado em {new Date(selectedSupplier.verifiedAt).toLocaleDateString("pt-BR")}</small>}</div>
              <div className="profile-actions"><button className="event-create" onClick={() => { const url=`${window.location.origin}/fornecedor/${selectedSupplier.id}`; if(navigator.share) navigator.share({title:selectedSupplier.name,url}).catch(()=>{}); else navigator.clipboard.writeText(url).then(()=>{setToast("Link do perfil copiado.");window.setTimeout(()=>setToast(""),3000)}); }}>Compartilhar perfil</button>{userRole === "supplier" && <button className="event-create" onClick={() => setEventFormOpen(true)}>＋ Cadastrar evento</button>}</div>
            </div>
            <ol className="discovery-trail">
              <li className="done"><span>1</span>Conheça o fornecedor</li>
              <li className="done"><span>2</span>Confira a confiança <em>SLA, avaliações, área de atendimento</em></li>
              <li className={isContactUnlocked(selectedSupplier) ? "done" : "current"}><span>3</span>Entre em contato</li>
            </ol>
            <div className="rating-panel"><div><strong>{ratings[selectedSupplier.name] ? ratings[selectedSupplier.name].average.toFixed(1) : "Sem avaliações"}</strong>{ratings[selectedSupplier.name] && <span>{"★".repeat(Math.round(ratings[selectedSupplier.name].average))}</span>}</div>{ratings[selectedSupplier.name] && <small className="verified-note">✓ {ratings[selectedSupplier.name].total} avaliações verificadas de clientes que contataram este fornecedor</small>}<p>Avalie este fornecedor</p><div className="star-picker">{[1,2,3,4,5].map((star) => <button key={star} onClick={() => rateSupplier(selectedSupplier.id, selectedSupplier.name, star)} aria-label={`${star} estrelas`}>★</button>)}</div></div>
            <div className="transparency-panel">
              <article><span>⏱</span><strong>{selectedSupplier.slaLabel || "Sem dado suficiente"}</strong><small>SLA médio de resposta</small></article>
              <article><span>💰</span><strong>{selectedSupplier.priceRangeLabel || "Sob consulta"}</strong><small>Faixa de preço dos produtos publicados</small></article>
              <article><span>▣</span><strong>{selectedSupplier.productCount || 0}</strong><small>Produtos no portfólio</small></article>
              <article><span>🗺</span><strong>{selectedSupplier.serviceAreaLabel}</strong><small>Área de atendimento</small></article>
            </div>
            <div className="profile-columns">
              <div><h2>Produtos publicados</h2>{products.filter((item) => (item.supplierId != null ? item.supplierId === selectedSupplier.id : item.supplierName === selectedSupplier.name)).length === 0 ? <div className="events-empty"><strong>Nenhum produto publicado</strong><p>Os produtos aprovados deste fornecedor aparecerão aqui.</p></div> : <div className="product-grid">{products.filter((item) => (item.supplierId != null ? item.supplierId === selectedSupplier.id : item.supplierName === selectedSupplier.name)).map((item) => <article className="product-card" key={item.id}><div className="product-visual">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <div className="device"></div>}</div><span className="category">{displayCategory(item.category)}</span><h3>{item.name}</h3><p>Especificações, aplicação e diferenciais</p><button onClick={() => openProduct(item)}>Ver informações →</button></article>)}</div>}</div>
              <aside className="contact-panel"><h3>Contato comercial</h3><p>Conecte-se com segurança e só compartilhe contato quando você decidir. Depois de liberado, fale com o fornecedor em 1 clique pelo WhatsApp.</p><dl><div><dt>Localização</dt><dd>{selectedSupplier.city}, {selectedSupplier.state}</dd></div><div><dt>Telefone / WhatsApp</dt><dd>{selectedSupplier.phone || selectedSupplier.phonePreview || "Contato protegido"}</dd></div>{selectedSupplier.instagram && <div><dt>Instagram</dt><dd>{selectedSupplier.instagram}</dd></div>}{selectedSupplier.website && <div><dt>Site</dt><dd>{selectedSupplier.website}</dd></div>}</dl><div className="contact-actions"><button onClick={() => openContactForSupplier(selectedSupplier)}>{isContactUnlocked(selectedSupplier) ? "Contato liberado" : "Liberar contato para conexão"}</button><button onClick={() => { if (!registered) { openRegistration("client"); return; } if (userRole !== "client") { setToast("Mensagens diretas são iniciadas por perfis de usuário."); return; } setActiveConversationId(null); loadMessages(); setView("messages"); }}>Enviar mensagem pelo Hub</button>{isContactUnlocked(selectedSupplier) && selectedSupplier.phone && <a href={`https://wa.me/55${selectedSupplier.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" onClick={() => fetch("/api/roadmap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "track", kind: "whatsapp_click", supplierId: selectedSupplier.id }) }).catch(() => {})}>Conversar no WhatsApp</a>}{selectedSupplier.website && <a href={selectedSupplier.website} target="_blank" rel="noreferrer" onClick={() => fetch("/api/roadmap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "track", kind: "website_click", supplierId: selectedSupplier.id }) }).catch(() => {})}>Visitar site</a>}</div><button className="event-create" onClick={() => openQuoteRequest(selectedSupplier)}>Solicitar cotação estruturada</button></aside>
            </div>
          </section>
        )}

        {view === "events" && <section className="events-page"><div className="page-heading"><div><span className="eyebrow">AGENDA DO SETOR</span><h1>Próximos eventos</h1><p>Encontros, feiras e treinamentos promovidos por fornecedores.</p></div><button className="primary" onClick={() => setEventFormOpen(true)}>＋ Cadastrar evento</button></div>{events.length === 0 ? <div className="events-empty"><strong>Nenhum evento real publicado ainda</strong><p>Quando um evento for cadastrado e aprovado, ele aparecerá nesta agenda e no mapa.</p><button className="event-create" onClick={() => setEventFormOpen(true)}>Cadastrar o primeiro evento</button></div> : <div className="events-grid">{events.sort((a,b) => a.date.localeCompare(b.date)).map((item) => <article className="event-card" key={item.id}><div className="calendar-block"><strong>{item.displayDate.split(" ")[0]}</strong><span>{item.displayDate.split(" ")[1]}</span><small>{item.displayDate.split(" ")[2]}</small></div><div className="event-card-copy"><span className="eyebrow">EVENTO CADASTRADO</span><h2>{item.name}</h2><p>⌖ {item.venue} · {item.city}, {item.state}</p><small>Promovido por {item.supplier}</small><button className="event-interest" onClick={()=>markEventInterest(item.id)}>☆ Tenho interesse</button></div><a href={item.link} target="_blank" rel="noreferrer">Inscrever-se →</a></article>)}</div>}</section>}
        {view === "products" && <section className="products-page"><div className="page-heading"><div><span className="eyebrow">CATÁLOGO DO SETOR</span><h1>Produtos</h1><p>Fotos, especificações, aplicações e diferenciais publicados pelos fornecedores.</p></div>{userRole === "supplier" && <button className="primary" onClick={() => setProductFormOpen(true)}>＋ Cadastrar produto</button>}</div><p className="commercial-notice">Preços, disponibilidade, frete e condições comerciais devem ser confirmados diretamente com o fornecedor.</p>{products.length === 0 ? <div className="events-empty"><strong>Nenhum produto cadastrado ainda</strong><p>Os cards aparecerão aqui conforme os fornecedores adicionarem seus produtos.</p>{userRole === "supplier" ? <button className="event-create" onClick={() => setProductFormOpen(true)}>Cadastrar o primeiro produto</button> : <button className="event-create" onClick={() => openRegistration("supplier")}>Sou fornecedor</button>}</div> : <div className="catalog-grid">{products.map((product) => <article className="catalog-card" key={product.id} onClick={() => openProduct(product)}><div className="catalog-photo">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <span>Sem foto</span>}</div><div className="catalog-copy">{product.highlighted && <span className="verified">⭐ Destaque Hub</span>}<span className="category">{displayCategory(product.category)}</span><h2>{product.name}</h2><p>{product.supplierName}</p>{product.specs && (product.specs.anatel || product.specs.technology?.length) && <div className="spec-badges">{product.specs.anatel && <span className="spec-badge">✓ ANATEL</span>}{product.specs.technology?.slice(0, 2).map((tech) => <span className="spec-badge" key={tech}>{tech}</span>)}</div>}<button>Ver especificações e aplicações →</button></div></article>)}</div>}</section>}

        {view === "news" && <section className="news-page"><div className="news-hero"><div><span className="eyebrow">INFORMAÇÃO PARA QUEM MOVE O MERCADO</span><h1>Radar do Setor</h1><p>Notícias selecionadas sobre rastreamento veicular, telecomunicações, conectividade, tecnologia e mercado automotivo.</p></div><div className="news-radar-mark" aria-hidden="true"><span></span><i></i></div></div><div className="news-trust"><strong>Curadoria com fonte identificada</strong><span>O Hub publica somente resumos e direciona você para a matéria original. Todo conteúdo passa por aprovação.</span></div><div className="news-filters" aria-label="Filtrar notícias por categoria">{newsCategories.map((item) => <button key={item} className={newsCategory === item ? "active" : ""} onClick={() => setNewsCategory(item)}>{item}</button>)}</div>{filteredNews.length === 0 ? <div className="events-empty news-empty"><strong>O Radar está pronto para receber notícias reais</strong><p>As primeiras publicações aparecerão aqui após a conferência da fonte e aprovação da gestão.</p><a className="event-create" href="/admin">Acessar gestão do Radar</a></div> : <div className="news-grid">{filteredNews.map((item, index) => <article className={`news-card ${index === 0 ? "featured" : ""}`} key={item.id}>{item.imageUrl ? <div className="news-image"><img src={item.imageUrl} alt="" /></div> : <div className="news-image news-image-placeholder"><span>RADAR</span><i></i></div>}<div className="news-card-copy"><div className="news-meta"><span>{item.category}</span><time dateTime={item.publishedAt}>{new Date(`${item.publishedAt}T12:00:00`).toLocaleDateString("pt-BR")}</time></div><h2>{item.title}</h2><p>{item.summary}</p><div className="news-source"><small>Fonte: {item.sourceName}</small><a href={item.sourceUrl} target="_blank" rel="noreferrer">Ler notícia completa →</a></div></div></article>)}</div>}</section>}

        {view === "supplier-dashboard" && <section className="supplier-dashboard"><div className="page-heading"><div><span className="eyebrow">PAINEL DA EMPRESA</span><h1>{supplierCompany || "Minha empresa"}</h1><p>Publique soluções, acompanhe oportunidades e mantenha seu perfil atualizado.</p></div><div className="dashboard-actions"><button className="event-create" onClick={() => setEditingCompany(true)}>Editar empresa</button><button className="event-create" onClick={() => { setView("messages"); loadMessages(); }}>Mensagens</button></div></div>{previewMode === "supplier" ? <div className="approval-banner"><strong>Modo de visualização</strong><span>Você está vendo a experiência do fornecedor. Cadastros estão desativados nesta visualização.</span></div> : !supplierApproved && <div className="approval-banner"><strong>Cadastro em análise</strong><span>O gestor precisa validar seu telefone e aprovar sua empresa antes da primeira publicação.</span></div>}{Boolean(dashboard.supplierStats?.newLeads) && <div className="lead-alert"><strong>🔔 {dashboard.supplierStats?.newLeads} lead{(dashboard.supplierStats?.newLeads || 0) > 1 ? "s" : ""} novo{(dashboard.supplierStats?.newLeads || 0) > 1 ? "s" : ""} nas últimas 48h</strong><span>Responda rápido — fornecedores com resposta ágil aparecem melhor posicionados no diretório.</span></div>}<div className="metric-grid"><article><span>◉</span><strong>{dashboard.supplierMetrics?.profile_view || 0}</strong><small>Visualizações do perfil</small></article><article><span>◌</span><strong>{dashboard.supplierMetrics?.whatsapp_click || 0}</strong><small>Cliques no WhatsApp</small></article><article><span>↗</span><strong>{dashboard.supplierMetrics?.website_click || 0}</strong><small>Cliques no seu perfil</small></article><article><span>✦</span><strong>{dashboard.supplierMetrics?.quote_request || 0}</strong><small>Solicitações recebidas</small></article><article><span>☆</span><strong>{dashboard.supplierMetrics?.favorite || 0}</strong><small>Favoritos recebidos</small></article>{dashboard.supplierStats && dashboard.supplierStats.totalReceived > 0 && <article><span>%</span><strong>{dashboard.supplierStats.acceptanceRate}%</strong><small>Taxa de aceite ({dashboard.supplierStats.totalResponded}/{dashboard.supplierStats.totalReceived} cotações)</small></article>}{dashboard.supplierStats && <article><span>◆</span><strong>{dashboard.supplierStats.quoteRequests7d}</strong><small>Solicitações recebidas (7d)</small></article>}{dashboard.supplierStats && <article><span>✓</span><strong>{dashboard.supplierStats.quoteResponses7d}</strong><small>Respostas em 7d{dashboard.supplierStats.quoteRequests7d > 0 ? ` (${dashboard.supplierStats.responseRate7d}%)` : ""}</small></article>}{dashboard.supplierStats?.avgResponseMinutes7d != null && <article><span>⏱</span><strong>{dashboard.supplierStats.avgResponseMinutes7d < 60 ? `${dashboard.supplierStats.avgResponseMinutes7d}min` : `${(dashboard.supplierStats.avgResponseMinutes7d / 60).toFixed(1)}h`}</strong><small>Tempo médio de resposta (7d)</small></article>}</div><div className="management-grid"><button disabled={!supplierApproved || Boolean(previewMode)} onClick={() => setProductFormOpen(true)}><span>▣</span><strong>Cadastrar produto</strong><small>{previewMode ? "Disponível para fornecedores aprovados" : supplierApproved ? "Foto, categoria, especificações, aplicação e diferenciais" : "Disponível após aprovação"}</small></button><button disabled={!supplierApproved || Boolean(previewMode)} onClick={() => setEventFormOpen(true)}><span>★</span><strong>Cadastrar evento</strong><small>{previewMode ? "Disponível para fornecedores aprovados" : supplierApproved ? "Local, data e link de inscrição" : "Disponível após aprovação"}</small></button><button onClick={() => setView("products")}><span>⌕</span><strong>Ver produtos publicados</strong><small>Acompanhe seus cards e especificações no catálogo.</small></button></div>{(dashboard.supplierQuotes || []).length > 0 && <section className="dashboard-requests"><h2>Oportunidades recentes</h2>{dashboard.supplierQuotes?.map((quote) => { const pendingHours = Math.max(0, Math.round((Date.now() - new Date(quote.createdAt).getTime()) / 3600000)); const isPending = quote.status !== "responded" && quote.status !== "declined"; return (<article key={quote.id} className={quote.isNewLead ? "is-new" : ""}><strong>{quote.protocol}{quote.isNewLead && <span className="new-tag">NOVO</span>}</strong><span>{quote.category} · {quote.application}{isPending && <em className={`elapsed-time ${pendingHours >= 24 ? "overdue" : "ontime"}`}>{pendingHours >= 24 ? ` · ⏳ aguardando há ${pendingHours >= 48 ? `${Math.round(pendingHours / 24)} dias` : `${pendingHours}h`} — responda para não perder o lead` : ` · dentro do prazo de 24h`}</em>}</span>{quote.status === "responded" ? <small className="quote-outcome responded">✓ Respondida</small> : quote.status === "declined" ? <small className="quote-outcome declined">Recusada</small> : <div className="quote-actions-inline"><button disabled={Boolean(quoteActionBusy)} onClick={() => respondQuote(quote.id, "responded")}>{quoteActionBusy === `respond-${quote.id}` ? "…" : "Marcar como respondida"}</button><button disabled={Boolean(quoteActionBusy)} className="ghost" onClick={() => { if (window.confirm("Recusar esta cotação?")) respondQuote(quote.id, "declined"); }}>Recusar</button></div>}</article>); })}</section>}</section>}

        {view === "client-dashboard" && <section className="client-dashboard"><div className="page-heading"><div><span className="eyebrow">MEUS PEDIDOS</span><h1>Minhas cotações</h1><p>Acompanhe o status de cada solicitação enviada e quantos fornecedores já responderam.</p></div><div className="dashboard-actions"><button className="event-create" onClick={() => { setSelectedSupplier(null); setActiveConversationId(null); loadMessages(); setView("messages"); }}>Mensagens</button><button className="event-create" onClick={() => openQuoteRequest()}>＋ Nova cotação</button></div></div>{(dashboard.clientQuotes || []).length === 0 ? <div className="events-empty"><strong>Nenhuma cotação enviada ainda</strong><p>Quando você solicitar uma cotação a fornecedores aprovados, o status de cada pedido aparecerá aqui.</p><button className="event-create" onClick={() => setView("directory")}>Buscar fornecedores</button></div> : <div className="quote-status-grid">{dashboard.clientQuotes?.map((quote) => { const statusLabel = quote.recipientsResponded > 0 && quote.recipientsCompleted === quote.recipientsTotal ? "Todas as respostas recebidas" : quote.recipientsResponded > 0 ? `Propostas recebidas (${quote.recipientsResponded} de ${quote.recipientsTotal})` : quote.recipientsTotal > 0 && quote.recipientsCompleted === quote.recipientsTotal ? "Encerrada sem proposta" : "Aguardando propostas"; const statusClass = quote.recipientsResponded > 0 || (quote.recipientsTotal > 0 && quote.recipientsCompleted === quote.recipientsTotal) ? "responded" : "waiting"; const hours = Math.max(0, Math.round((Date.now() - new Date(quote.createdAt).getTime()) / 3600000)); const sentLabel = hours < 1 ? "enviado agora" : hours < 24 ? `enviado há ${hours}h` : `enviado há ${Math.round(hours / 24)} dia${Math.round(hours / 24) > 1 ? "s" : ""}`; const stillWaiting = statusClass === "waiting" && quote.status !== "closed"; const deadlineNote = stillWaiting ? (hours < 24 ? { text: "Meta do Hub: primeira proposta em até 24h", tone: "ontime" } : hours < 48 ? { text: "Passou de 24h sem resposta — fique atento", tone: "warn" } : { text: "Mais de 48h sem resposta — considere reforçar contato ou buscar outro fornecedor", tone: "overdue" }) : null; return (<article className="quote-status-card" key={quote.id}><div className="quote-status-head"><strong>{quote.protocol}</strong><span className={`status-pill ${statusClass}`}>{statusLabel}</span></div><p>{quote.category} · {quote.application}</p><small>⌖ {quote.city}, {quote.state} · {sentLabel}</small>{deadlineNote && <small className={`deadline-note ${deadlineNote.tone}`}>⏱ {deadlineNote.text}</small>}{quote.status === "closed" ? <small className="quote-outcome">Cotação encerrada</small> : <button className="ghost close-quote-btn" disabled={Boolean(quoteActionBusy)} onClick={() => { if (window.confirm("Encerrar esta cotação? Os fornecedores não poderão mais responder.")) closeQuoteRequest(quote.id); }}>{quoteActionBusy === `close-${quote.id}` ? "…" : "Encerrar cotação"}</button>}</article>); })}</div>}</section>}

        {view === "how-it-works" && <section className="how-it-works-page"><div className="solutions-heading"><span className="eyebrow">PASSO A PASSO</span><h1>Como funciona o Hub Brasil</h1><p>Simples para quem procura tecnologia de rastreamento e para quem fornece — três passos de cada lado.</p></div><div className="how-tracks"><div className="how-track"><h2>Quero contratar</h2><ol className="how-steps"><li><strong>1. Descreva sua necessidade</strong><p>Categoria, aplicação, cidade/UF, orçamento e urgência — leva menos de 2 minutos.</p></li><li><strong>2. Fornecedores compatíveis recebem o pedido</strong><p>A cotação vai só para quem atende sua região e especialidade, ordenado por compatibilidade.</p></li><li><strong>3. Compare propostas e fale direto</strong><p>{platformSlaLabel ? `Fornecedores do Hub respondem em média em ${platformSlaLabel}.` : "Acompanhe as respostas no seu painel."} Fale com o fornecedor em 1 clique pelo WhatsApp.</p></li></ol></div><div className="how-track"><h2>Sou fornecedor</h2><ol className="how-steps"><li><strong>1. Cadastre sua empresa</strong><p>Telefone validado e aprovação da gestão antes de qualquer publicação.</p></li><li><strong>2. Leads chegam no seu painel</strong><p>Alertas de pedidos novos, com dados reais do que o cliente precisa.</p></li><li><strong>3. Responda e acompanhe sua taxa de aceite</strong><p>Resposta rápida melhora seu posicionamento no diretório — sem pagamento envolvido.</p></li></ol></div></div><div className="ecosystem-cta"><h2>Pronto para começar?</h2><p>Cadastre sua empresa ou encontre o parceiro certo hoje mesmo.</p><div><button className="primary" onClick={() => openRegistration("supplier")}>Sou fornecedor →</button><button className="secondary-action" onClick={() => openQuoteRequest()}>Solicitar cotação →</button></div></div></section>}

        {view === "messages" && <section className="messages-page"><div className="page-heading"><div><span className="eyebrow">MENSAGENS PRIVADAS</span><h1>Conversas no Hub</h1><p>O contato é compartilhado apenas quando você decide conversar.</p></div><button className="event-create" onClick={() => { setView(userRole === "supplier" ? "supplier-dashboard" : userRole === "client" ? "client-dashboard" : "directory"); }}>Voltar</button></div><div className="messages-layout"><aside><h2>Conversas</h2>{messageData.conversations.length === 0 ? <p>Nenhuma conversa iniciada ainda.</p> : messageData.conversations.map((conversation) => <button key={conversation.id} className={activeConversationId === conversation.id ? "active" : ""} onClick={() => loadMessages(conversation.id)}><strong>{conversation.supplierName || conversation.clientCompany || conversation.clientName || "Contato"}{Boolean(conversation.unreadCount) && <span className="unread-dot">{conversation.unreadCount}</span>}</strong><span>{conversation.subject}</span></button>)}</aside><section className="message-thread">{selectedSupplier && !activeConversationId && userRole === "client" ? <><h2>Nova mensagem para {selectedSupplier.name}</h2><p>Apresente sua necessidade. A empresa receberá a conversa em seu painel.</p><div className="message-templates">{messageTemplates.map((template) => <button type="button" key={template} onClick={() => { const field = document.querySelector<HTMLTextAreaElement>('.message-thread textarea[name="message"]'); if (field) field.value = template; }}>{template.slice(0, 28)}…</button>)}</div><form onSubmit={sendMessage}><textarea name="message" required rows={6} placeholder="Olá, gostaria de saber mais sobre..." /><small className="response-hint">Fornecedores respondem melhor mensagens objetivas — inclua sua necessidade e prazo. Recomendamos aguardar até 24h por um retorno.</small><button className="primary" disabled={formBusy}>{formBusy ? "Enviando…" : "Enviar mensagem →"}</button></form></> : activeConversationId ? <><h2>{messageData.conversations.find((item) => item.id === activeConversationId)?.subject || "Conversa"}</h2><div className="thread-list">{messageData.messages?.map((message) => <article key={message.id} className={message.senderUserId === messageData.currentUserId ? "mine" : ""}><p>{message.body}</p><small>{new Date(message.createdAt).toLocaleString("pt-BR")}{message.senderUserId === messageData.currentUserId && <span className="seen-status">{message.readAt ? " · ✓✓ Visto" : " · ✓ Enviado"}</span>}</small></article>)}</div><form onSubmit={sendMessage}><textarea name="message" required rows={3} placeholder="Escreva sua resposta" /><small className="response-hint">Recomendamos responder em até 24h para manter uma boa taxa de resposta.</small><button className="primary" disabled={formBusy}>{formBusy ? "Enviando…" : "Enviar →"}</button></form></> : <div className="events-empty"><strong>Selecione uma conversa</strong><p>Quando um cliente entrar em contato, ela aparecerá aqui.</p></div>}</section></div></section>}
      </main>

      <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><button className="brand" onClick={() => setView("map")}><span className="brand-mark"><span></span><span></span><span></span></span><span className="brand-copy"><strong>Hub <b>Brasil</b></strong><small>CONECTANDO NEGÓCIOS</small></span></button><p>O ecossistema de negócios do mercado de rastreamento, telemetria e IoT no Brasil.</p></div><div><strong>Plataforma</strong><button onClick={() => setView("directory")}>Fornecedores</button><a href="/instaladores">Instaladores</a><button onClick={() => setView("solutions")}>Soluções</button><button onClick={() => setView("events")}>Eventos</button><button onClick={() => setView("how-it-works")}>Como funciona</button><button onClick={() => openQuoteRequest()}>Solicitar cotação</button></div><div><strong>Soluções por aplicação</strong><a href="/solucoes">Todas as soluções</a><a href="/solucoes/rastreamento-de-frotas">Rastreamento de frotas</a><a href="/solucoes/rastreamento-de-ativos-para-logistica">Rastreamento para logística</a><a href="/solucoes/rastreamento-de-equipamentos-de-obra">Rastreamento de equipamentos de obra</a></div><div><strong>Para empresas</strong><button onClick={() => openRegistration("supplier")}>Cadastrar empresa</button><a href="/instaladores">Cadastrar instalador</a><button onClick={() => setView("about")}>Sobre o Hub</button><button onClick={() => setRegisterOpen(true)}>Entrar</button></div><div><strong>Contato</strong><a href="mailto:suporte@niviontech.com.br">suporte@niviontech.com.br</a><span>Brasil</span></div></div><div className="footer-bottom"><span>© 2026 Hub Brasil. Todos os direitos reservados.</span><div><a href="/termos">Termos de uso</a><a href="/privacidade">Privacidade</a><a href="/admin">Gestão</a></div></div></footer>

      <nav className="mobile-nav" aria-label="Navegação móvel">
        <button className={view === "map" ? "active" : ""} onClick={() => setView("map")}><span>⌖</span>Mapa</button>
        <button className={view === "directory" ? "active" : ""} onClick={() => setView("directory")}><span>▦</span>Fornecedores</button>
        <button className={view === "products" ? "active" : ""} onClick={() => setView("products")}><span>▣</span>Produtos</button>
        <button className={view === "events" ? "active" : ""} onClick={() => setView("events")}><span>★</span>Eventos</button>
        <button className={view === "news" ? "active" : ""} onClick={() => setView("news")}><span>◉</span>Radar</button>
        <button onClick={() => setRegisterOpen(true)}><span>◎</span>Conta</button>
      </nav>

      {quoteFlowOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setQuoteFlowOpen(false); }}>
          <section className="access-modal event-form" role="dialog" aria-modal="true" aria-labelledby="quote-flow-title">
            <button className="modal-close" onClick={() => setQuoteFlowOpen(false)} aria-label="Fechar">×</button>
            <span className="eyebrow">SOLICITAÇÃO ESTRUTURADA</span>
            <h2 id="quote-flow-title">Cotação de forma segura</h2>
            <p className="commercial-notice">{platformSlaLabel ? `Fornecedores do Hub respondem em média em ${platformSlaLabel}. Acompanhe o status em "Meus pedidos".` : 'Acompanhe o status de cada proposta em "Meus pedidos".'}</p>
            <form onSubmit={submitQuoteRequest}>
              <label>Categoria de necessidade<input name="category" value={quoteDraft.category} onChange={updateQuoteInput} required list="category-suggestions" placeholder="Ex.: Rastreadores para frota" /></label>
              <datalist id="category-suggestions">{solutionCategories.map((item) => <option key={item.name} value={item.name} />)}</datalist>
              <label>Uso da solução<textarea name="application" value={quoteDraft.application} onChange={updateQuoteInput} rows={3} required placeholder="Para quais operações e quantidade de veículos?" /></label>
              <div className="field-row">
                <label>Quantidade de ativos<input name="quantity" type="number" min="1" max="120" value={quoteDraft.quantity} onChange={updateQuoteInput} required /></label>
                <label>Prazo limite (opcional)<input name="deadline" type="date" value={quoteDraft.deadline} onChange={updateQuoteInput} /></label>
              </div>
              <label>Cidade da operação<input name="city" value={quoteDraft.city} onChange={updateQuoteInput} required placeholder="Ex.: São Paulo" /></label>
              <label>Estado (UF)<select name="state" value={quoteDraft.state} onChange={updateQuoteInput} required><option value="">UF</option>{BRAZIL_STATES.map((state) => <option key={state}>{state}</option>)}</select></label>
              <div className="field-row">
                <label>Orçamento (opcional)<select name="budget" value={quoteDraft.budget} onChange={updateQuoteInput}><option value="">Não informar</option>{quoteBudgetOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
                <label>Urgência<select name="urgency" value={quoteDraft.urgency} onChange={updateQuoteInput}><option value="">Não informar</option>{quoteUrgencyOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
              </div>
              <div className="field-block"><span>Integração desejada (opcional)</span><div className="chip-select">{quoteIntegrationOptions.map((option) => <button type="button" key={option} className={quoteDraft.integration.includes(option) ? "active" : ""} onClick={() => toggleQuoteIntegration(option)}>{option}</button>)}</div></div>
              <label>Notas de contexto<textarea name="notes" value={quoteDraft.notes} onChange={updateQuoteInput} rows={3} placeholder="Tipo de operação, horários de monitoramento, cobertura necessária..." /></label>
              <fieldset className="solution-selector matched">
                <legend>Fornecedores candidatos <small>Selecione 1 a 8 — ordenados por compatibilidade com o briefing</small></legend>
                {suppliers.map((supplier) => ({ supplier, match: matchScore(supplier, quoteDraft) })).sort((a, b) => b.match.score - a.match.score).map(({ supplier, match }) => (
                  <div className="check match-check" key={supplier.id}>
                    <input type="checkbox" aria-label={`Selecionar ${supplier.name}`} checked={quoteDraft.supplierIds.includes(String(supplier.id))} onChange={() => toggleQuoteSupplier(supplier.id)} />
                    <span className="match-check-body">
                      <span className="match-check-head"><strong>{supplier.name}</strong><span className="match-pill">🎯 {match.score}% compatível</span></span>
                      <small>{supplier.city}/{supplier.state}{match.reasons.length ? ` · ${match.reasons.join(", ")}` : ""}</small>
                    </span>
                  </div>
                ))}
              </fieldset>
              <label className="consent"><input type="checkbox" name="contactConsent" checked={quoteDraft.contactConsent} onChange={(event) => setQuoteDraft((draft) => ({ ...draft, contactConsent: event.target.checked }))} required /> <span>Autorizo o Hub a repassar meu contato aos fornecedores escolhidos para retorno da cotação.</span></label>
              <button className="primary full" type="submit" disabled={formBusy}>{formBusy ? "Enviando…" : <>Enviar solicitação <span>→</span></>}</button>
            </form>
          </section>
        </div>
      )}

      {pendingContactSupplier && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeContactForSupplier(); }}>
          <section className="access-modal event-form" role="dialog" aria-modal="true" aria-labelledby="contact-consent-title">
            <button className="modal-close" onClick={closeContactForSupplier} aria-label="Fechar">×</button>
            <span className="eyebrow">CONTATO COM SEGURANÇA</span>
            <h2 id="contact-consent-title">Revelar dados de contato</h2>
            <p>Você está prestes a revelar os dados de contato de <strong>{pendingContactSupplier.name}</strong>. Veja exatamente o que vai ficar visível:</p>
            <ul className="reveal-preview">
              <li>☎ Telefone / WhatsApp completo{pendingContactSupplier.phonePreview && <small> (hoje mostrado como {pendingContactSupplier.phonePreview})</small>}</li>
              {pendingContactSupplier.instagram && <li>◎ Instagram completo</li>}
              {pendingContactSupplier.website && <li>↗ Site — já visível publicamente, sem alteração</li>}
            </ul>
            <p className="reveal-note">Essa ação é registrada no seu histórico de atividade e o fornecedor pode ver quantos contatos liberou (sem saber quem é você especificamente).</p>
            <button className="primary full" onClick={confirmContactForSupplier}>Entendo e quero liberar contato</button>
            <button className="event-create" onClick={closeContactForSupplier}>Agora não</button>
          </section>
        </div>
      )}

      {editingCompany && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingCompany(false); }}><section className="access-modal event-form company-editor" role="dialog" aria-modal="true"><button className="modal-close" onClick={() => setEditingCompany(false)} aria-label="Fechar">×</button><span className="eyebrow">MINHA EMPRESA</span><h2>Editar informações da empresa</h2><p>Esses dados compõem seu perfil público após a aprovação da gestão.</p><form onSubmit={saveCompany}><label>Nome da empresa<input name="company" defaultValue={supplierCompany} required /></label><div className="field-row"><label>Telefone / WhatsApp<input name="phone" defaultValue={dashboard.profile?.phone || ""} required /></label><label>Instagram<input name="instagram" defaultValue={dashboard.profile?.instagram || ""} /></label></div><label>Site da empresa <small>Opcional</small><input name="website" type="url" defaultValue={dashboard.profile?.website || ""} placeholder="https://www.suaempresa.com.br" /></label><label>Endereço<input name="address" defaultValue={dashboard.profile?.address || ""} required placeholder="Rua, número, bairro e complemento" /></label><div className="field-row"><label>Cidade<input name="city" defaultValue={dashboard.profile?.city || ""} required /></label><label>Estado<select name="state" required defaultValue={dashboard.profile?.state || ""}><option value="">UF</option>{BRAZIL_STATES.map((state) => <option key={state}>{state}</option>)}</select></label></div><fieldset className="solution-selector"><legend>Soluções oferecidas <small>Escolha uma ou mais.</small></legend>{solutionCategories.map((item) => <label className="check" key={item.name}><input name="categories" type="checkbox" value={item.name} defaultChecked={(dashboard.profile?.categories || []).includes(item.name)} />{item.title}</label>)}</fieldset><label>Sobre a empresa<textarea name="description" rows={4} defaultValue={dashboard.profile?.description || ""} placeholder="Especialidades, diferenciais e informações relevantes" /></label><button className="primary full" type="submit" disabled={formBusy}>{formBusy ? "Salvando…" : "Salvar informações →"}</button></form></section></div>}

      {eventFormOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEventFormOpen(false); }}><section className="access-modal event-form" role="dialog" aria-modal="true" aria-labelledby="event-form-title"><button className="modal-close" onClick={() => setEventFormOpen(false)} aria-label="Fechar">×</button><span className="eyebrow">ÁREA DO FORNECEDOR</span><h2 id="event-form-title">Cadastrar novo evento</h2><p>Após a revisão, o evento aparecerá na agenda e como um ponto especial no mapa.</p><form onSubmit={createEvent}><label>Nome do evento<input name="name" required placeholder="Ex.: Encontro de Integradores" /></label><div className="field-row"><label>Data<input name="date" type="date" required /></label><label>Local<input name="venue" required placeholder="Centro de eventos" /></label></div><div className="field-row"><label>Cidade<input name="city" required placeholder="São Paulo" /></label><label>Estado<select name="state" required><option value="">Selecione</option>{BRAZIL_STATES.map((state) => <option key={state}>{state}</option>)}</select></label></div><label>Link para inscrição<input name="link" type="url" required placeholder="https://seusite.com/inscricao" /></label><label>Descrição<textarea name="description" rows={3} placeholder="Conte brevemente sobre o evento" /></label><button className="primary full" type="submit">Enviar evento para publicação <span>→</span></button></form></section></div>}

      {selectedProduct && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProduct(null); }}>
          <section className="access-modal product-detail" role="dialog" aria-modal="true">
            <button className="modal-close" onClick={() => setSelectedProduct(null)} aria-label="Fechar">×</button>
            <div className="detail-photo">{selectedProduct.imageUrl ? <img src={selectedProduct.imageUrl} alt={selectedProduct.name} /> : <span>Produto sem foto</span>}</div>
            <span className="category">{displayCategory(selectedProduct.category)}</span>
            <h2>{selectedProduct.name}</h2>
            <strong className="detail-supplier">{selectedProduct.supplierName}</strong>
            {selectedProduct.specs && Object.keys(selectedProduct.specs).length > 0 && (
              <div className="spec-sheet">
                <span className="spec-sheet-title">Ficha técnica</span>
                <dl>
                  {selectedProduct.specs.technology?.length ? <div><dt>Tecnologia</dt><dd>{selectedProduct.specs.technology.join(", ")}</dd></div> : null}
                  {selectedProduct.specs.ip ? <div><dt>Grau de proteção</dt><dd>{selectedProduct.specs.ip}</dd></div> : null}
                  {selectedProduct.specs.battery ? <div><dt>Bateria backup</dt><dd>{selectedProduct.specs.battery}</dd></div> : null}
                  {selectedProduct.specs.warranty ? <div><dt>Garantia</dt><dd>{selectedProduct.specs.warranty}</dd></div> : null}
                  {selectedProduct.specs.application?.length ? <div><dt>Aplicação recomendada</dt><dd>{selectedProduct.specs.application.join(", ")}</dd></div> : null}
                </dl>
                <div className="spec-badges">
                  {selectedProduct.specs.anatel && <span className="spec-badge">✓ Homologado ANATEL</span>}
                  {selectedProduct.specs.features?.map((feature) => <span className="spec-badge" key={feature}>✓ {feature}</span>)}
                </div>
              </div>
            )}
            {selectedProduct.averagePrice && <div className="price-box"><small>Referência de preço informada pelo fornecedor</small><strong>{selectedProduct.averagePrice}</strong></div>}
            <h3>Informações do produto</h3>
            <p>{selectedProduct.technicalDetails}</p>
            {selectedProduct.manualUrl && <a className="manual-link" href={selectedProduct.manualUrl} target="_blank" rel="noreferrer">📄 Baixar manual técnico</a>}
            <p className="commercial-notice">Preços, disponibilidade, frete e condições comerciais devem ser confirmados diretamente com o fornecedor.</p>
            <button className="primary full quote-button" onClick={() => { setSelectedProduct(null); openQuoteRequestFromProduct(selectedProduct); }}>Solicitar cotação estruturada <span>→</span></button>
          </section>
        </div>
      )}

      {productFormOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setProductFormOpen(false); resetProductForm(); } }}>
          <section className="access-modal event-form" role="dialog" aria-modal="true">
            <button className="modal-close" onClick={() => { setProductFormOpen(false); resetProductForm(); }} aria-label="Fechar">×</button>
            <span className="eyebrow">ÁREA DO FORNECEDOR</span>
            <h2>Cadastrar produto</h2>
            <p>Destaque as informações que ajudam o cliente a identificar a solução adequada.</p>
            <form onSubmit={createProduct}>
              <label>Foto do produto<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
              <label>Nome do produto<input name="name" required placeholder="Ex.: Rastreador 4G LTE" /></label>
              <label>Categoria<select name="category" required value={productFormCategory} onChange={(event) => setProductFormCategory(event.target.value)}><option value="">Selecione</option>{solutionCategories.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
              <label>Especificações técnicas<textarea name="technicalDetails" rows={4} required placeholder="Tecnologia, alimentação, conectividade, homologações e demais especificações" /></label>
              <label>Aplicação<textarea name="application" rows={3} required placeholder="Para quais veículos, operações ou necessidades este produto é indicado?" /></label>
              <label>Diferenciais<textarea name="differentials" rows={3} required placeholder="Recursos, benefícios e diferenciais da solução" /></label>
              {Boolean(productFormCategory && (productSpecFields[productFormCategory] || []).length) && (
                <div className="spec-fields">
                  <div className="spec-fields-head"><strong>Ficha técnica (opcional)</strong><span>Ajuda o cliente a comparar com outros produtos — preencha só o que fizer sentido. Nada aqui é obrigatório.</span></div>
                  {productSpecFields[productFormCategory].includes("technology") && (
                    <div className="spec-field"><span>Tecnologia / Conectividade</span><div className="chip-select">{productTechnologyOptions.map((option) => <button type="button" key={option} className={productFormSpecs.technology.includes(option) ? "active" : ""} onClick={() => toggleProductSpecValue("technology", option)}>{option}</button>)}</div></div>
                  )}
                  {productSpecFields[productFormCategory].includes("ip") && (
                    <div className="spec-field"><span>Grau de proteção (IP)</span><select value={productFormSpecs.ip} onChange={(event) => setProductFormSpecs((current) => ({ ...current, ip: event.target.value }))}><option value="">Não informado</option>{productIpOptions.map((option) => <option key={option}>{option}</option>)}</select></div>
                  )}
                  {productSpecFields[productFormCategory].includes("battery") && (
                    <div className="spec-field"><span>Bateria backup</span><input placeholder="Ex.: 250 mAh" value={productFormSpecs.battery} onChange={(event) => setProductFormSpecs((current) => ({ ...current, battery: event.target.value }))} /></div>
                  )}
                  {productSpecFields[productFormCategory].includes("warranty") && (
                    <div className="spec-field"><span>Garantia</span><select value={productFormSpecs.warranty} onChange={(event) => setProductFormSpecs((current) => ({ ...current, warranty: event.target.value }))}><option value="">Não informado</option>{productWarrantyOptions.map((option) => <option key={option}>{option}</option>)}</select></div>
                  )}
                  {productSpecFields[productFormCategory].includes("anatel") && (
                    <label className="spec-toggle"><input type="checkbox" checked={productFormSpecs.anatel} onChange={(event) => setProductFormSpecs((current) => ({ ...current, anatel: event.target.checked }))} /> Produto homologado pela ANATEL</label>
                  )}
                  {productSpecFields[productFormCategory].includes("application") && (
                    <div className="spec-field"><span>Aplicação recomendada</span><div className="chip-select">{productApplicationOptions.map((option) => <button type="button" key={option} className={productFormSpecs.application.includes(option) ? "active" : ""} onClick={() => toggleProductSpecValue("application", option)}>{option}</button>)}</div></div>
                  )}
                  {productSpecFields[productFormCategory].includes("features") && (
                    <div className="spec-field"><span>Recursos-chave</span><div className="chip-select">{productFeatureOptions.map((option) => <button type="button" key={option} className={productFormSpecs.features.includes(option) ? "active" : ""} onClick={() => toggleProductSpecValue("features", option)}>{option}</button>)}</div></div>
                  )}
                </div>
              )}
              <label>Manual técnico — link para download (opcional)<input name="manualUrl" type="url" placeholder="https://... (PDF, Google Drive etc.)" /></label>
              <p className="commercial-notice">Preços, disponibilidade, frete e condições comerciais serão tratados diretamente com o cliente.</p>
              <button className="primary full" type="submit">Enviar produto para aprovação <span>→</span></button>
            </form>
          </section>
        </div>
      )}

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
              <a className="primary welcome-cta" href="/sign-in?return_to=/">Quero acessar <span>→</span></a>
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
              <WhatsAppField />
              <label>Endereço<input name="address" required placeholder="Rua, número, bairro e complemento" /></label>
              <div className="field-row"><label>Nome fantasia {registrationRole === "client" && <small>Opcional</small>}<input name="company" required={registrationRole === "supplier"} placeholder="Nome da empresa" /></label><label>Instagram <small>Opcional</small><input name="instagram" placeholder="@suaempresa" /></label></div>
              {registrationRole === "client" && <><label>CNPJ <small>Opcional</small><input name="cnpj" inputMode="numeric" placeholder="00.000.000/0000-00" /></label><label>Foto de perfil <small>Opcional · PNG, JPG ou WebP, até 3 MB</small><input name="profilePhoto" type="file" accept="image/png,image/jpeg,image/webp" /></label></>}
              {registrationRole === "supplier" && <><label>CNPJ<input name="cnpj" required inputMode="numeric" placeholder="00.000.000/0000-00" /><small>Validamos apenas os dígitos; a confirmação empresarial é feita pela gestão.</small></label>{referralCode && <p className="commercial-notice">Você foi indicado por uma empresa parceira do Hub Brasil.</p>}<label>Categoria principal<select name="category" required><option value="">Selecione</option>{solutionCategories.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><fieldset className="solution-selector"><legend>Soluções oferecidas <small>Selecione uma ou mais</small></legend>{solutionCategories.map((item) => <label className="check" key={item.name}><input name="categories" type="checkbox" value={item.name} /> {item.title}</label>)}</fieldset><div className="field-row"><label>Cidade<input name="city" required placeholder="Cidade da sede" /></label><label>Estado<select name="state" required><option value="">UF</option>{BRAZIL_STATES.map((state) => <option key={state}>{state}</option>)}</select></label></div><label>Apresentação da empresa<textarea name="description" rows={3} placeholder="Especialidades, diferenciais e região atendida" /></label><label>Logo da empresa <small>PNG, JPG ou WebP, até 3 MB</small><input name="logo" type="file" accept="image/png,image/jpeg,image/webp" /></label><label className="consent logo-consent"><input name="logoConsent" type="checkbox" required /> <span>Declaro que possuo autorização para utilizar e divulgar esta marca/logotipo no Hub Brasil e autorizo sua exibição no perfil público, diretório e mapa da plataforma.</span></label></>}
              <label className="consent"><input type="checkbox" required /> <span>Li e concordo com a <a href="/privacidade" target="_blank">Política de Privacidade</a> e os <a href="/termos" target="_blank">Termos de Uso</a>.</span></label>
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
