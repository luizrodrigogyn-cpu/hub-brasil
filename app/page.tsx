"use client";

import { type ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

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
};

type HubEvent = { id: number; name: string; supplier: string; venue: string; city: string; state: string; date: string; displayDate: string; link: string; x: number; y: number; demo?: boolean };
type Product = { id: number; supplierId?: number | null; supplierName: string; supplierPhone?: string | null; name: string; category: string; technicalDetails: string; highlighted?: boolean; imageUrl?: string | null };
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
  supplierIds: string[];
  contactConsent: boolean;
};

function displayCategory(category: string) {
  return category === "Câmeras veiculares" || category === "ADAS e DSM" ? "Videotelemetria" : category;
}

function supplierLogoUrl(key?: string | null) {
  return key ? `/api/supplier-logo?key=${encodeURIComponent(key)}` : null;
}

function mapPoint(state: string) {
  const points: Record<string, [number, number]> = { AC:[26,45],AM:[35,30],RR:[45,15],RO:[38,50],PA:[55,32],AP:[62,18],TO:[58,48],MA:[67,38],PI:[70,46],CE:[78,42],RN:[86,43],PB:[84,48],PE:[81,51],AL:[80,55],SE:[78,59],BA:[70,60],MT:[49,53],GO:[58,62],DF:[61,59],MS:[48,68],MG:[65,69],ES:[74,69],RJ:[70,76],SP:[59,76],PR:[55,83],SC:[56,89],RS:[51,95] };
  return points[state] || [55, 55];
}

function maskPhone(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "Contato protegido";
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}••••-••••`;
}

export default function Home() {
  const [view, setView] = useState<"map" | "solutions" | "directory" | "supplier" | "events" | "products" | "news" | "about" | "supplier-dashboard" | "messages">("map");
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
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [ratings, setRatings] = useState<Record<string, { average: number; total: number }>>({});
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [news, setNews] = useState<SectorNews[]>([]);
  const [newsCategory, setNewsCategory] = useState("Todos");
  const [referralCode, setReferralCode] = useState("");
  const [previewMode, setPreviewMode] = useState<"client" | "supplier" | null>(null);
  const [dashboard, setDashboard] = useState<{ supplierMetrics?: Record<string, number>; supplierQuotes?: Array<{ id:number; protocol:string; category:string; application:string; status:string; createdAt:string }>; profile?: { address?:string|null; city?:string|null; state?:string|null; phone?:string|null; instagram?:string|null; website?:string|null; description?:string|null; categories?:string[] } }>({});
  const [editingCompany, setEditingCompany] = useState(false);
  const [messageData, setMessageData] = useState<{ conversations: Array<{id:number;subject:string;updatedAt:string;supplierName?:string;clientName?:string;clientCompany?:string}>; messages?: Array<{id:number;senderUserId:string;body:string;createdAt:string}>; currentUserId?:string }>({ conversations: [] });
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [quoteFlowOpen, setQuoteFlowOpen] = useState(false);
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft>({ category: "", application: "", quantity: "1", city: "", state: "", deadline: "", notes: "", supplierIds: [], contactConsent: false });
  const [pendingContactSupplier, setPendingContactSupplier] = useState<Supplier | null>(null);
  const [contactUnlocked, setContactUnlocked] = useState<Record<number, boolean>>({});
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
    try { const response = await fetch("/api/suppliers"); const data = await response.json(); setSuppliers((data.suppliers || []).map((item: Supplier) => ({ ...item, initials: item.name.split(/\s+/).slice(0,2).map((part) => part[0]).join("").toUpperCase(), description: item.description || "Fornecedor aprovado no Hub Brasil.", accent: "blue" }))); } catch {}
  }

  async function refreshProducts() {
    try { const response = await fetch("/api/products"); const data = await response.json(); setProducts(data.products || []); } catch {}
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setWelcomeOpen(true), 900);
    const search = new URLSearchParams(window.location.search);
    const requestedRole = search.get("cadastro");
    const referredBy = search.get("indicado");
    const requestedPreview = search.get("visao");
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
    fetch("/api/ratings").then((response) => response.json()).then((data) => setRatings(data.ratings || {})).catch(() => {});
    refreshSuppliers();
    fetch("/api/news").then((response) => response.json()).then((data) => setNews(data.news || [])).catch(() => {});
    fetch("/api/events").then((response) => response.json()).then((data) => setEvents((data.events || []).map((item: Record<string, string | number>) => { const [x,y] = mapPoint(String(item.state)); const date = new Date(`${item.eventDate}T12:00:00`); return { id: Number(item.id), name: String(item.name), supplier: String(item.supplierName || "Fornecedor aprovado"), venue: String(item.venue), city: String(item.city), state: String(item.state), date: String(item.eventDate), displayDate: date.toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" }).toUpperCase().replace(".", ""), link: String(item.registrationUrl), x, y }; }))).catch(() => {});
    fetch("/api/me").then((response) => response.json()).then((data) => {
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
        if (data.profile.role === "supplier") fetch("/api/roadmap").then((response) => response.ok ? response.json() : null).then((result) => result && setDashboard(result)).catch(() => {});
      }
    }).catch(() => {});
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
  const isContactUnlocked = (supplier: Supplier) => Boolean(contactUnlocked[supplier.id]);

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
    setContactUnlocked((current) => ({ ...current, [pendingContactSupplier.id]: true }));
    try {
      await fetch("/api/roadmap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "track", kind: "contact_revealed", supplierId: pendingContactSupplier.id }),
      });
    } catch {}
    setPendingContactSupplier(null);
    setToast("Contato liberado. Agora o WhatsApp e telefone aparecem no perfil.");
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
      const result = await response.json();
      if (response.status === 401) { window.location.href = result.signIn; return; }
      if (!response.ok) { setToast(result.error || "Não foi possível cadastrar."); return; }
    } catch { setToast("Não foi possível concluir o cadastro. Tente novamente."); return; }
    if (registrationRole === "supplier" && logo instanceof File && logo.size) {
      const logoForm = new FormData();
      logoForm.set("logo", logo);
      logoForm.set("logoConsent", String(payload.logoConsent === "on"));
      const logoResponse = await fetch("/api/supplier-logo", { method: "POST", body: logoForm });
      if (!logoResponse.ok) { const result = await logoResponse.json().catch(() => ({})); setToast(result.error || "Cadastro criado, mas não foi possível enviar a logo."); }
    }
    if (registrationRole === "client" && profilePhoto instanceof File && profilePhoto.size) {
      const photoForm = new FormData();
      photoForm.set("photo", profilePhoto);
      const photoResponse = await fetch("/api/profile-photo", { method: "POST", body: photoForm });
      if (!photoResponse.ok) { const result = await photoResponse.json().catch(() => ({})); setToast(result.error || "Cadastro criado, mas não foi possível enviar a foto."); }
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

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("supplierName", supplierCompany || "Fornecedor cadastrado");
    const photo = form.get("photo");
    const preview = photo instanceof File && photo.size ? URL.createObjectURL(photo) : null;
    try { const response = await fetch("/api/products", { method: "POST", body: form }); const data = await response.json(); if (response.status === 401) { window.location.href = data.signIn; return; } if (!response.ok) { setToast(data.error); return; } } catch { setToast("Não foi possível enviar o produto."); return; }
    if (preview) URL.revokeObjectURL(preview); setProductFormOpen(false); setView("supplier-dashboard"); setToast("Produto enviado para aprovação do gestor."); window.setTimeout(() => setToast(""), 3500);
  }

  async function rateSupplier(name: string, stars: number) {
    if (userRole !== "client") { setToast("Entre como usuário para avaliar fornecedores."); window.setTimeout(() => setToast(""), 3000); return; }
    const current = ratings[name] || { average: 0, total: 0 };
    const optimistic = { average: (current.average * current.total + stars) / (current.total + 1), total: current.total + 1 };
    setRatings((all) => ({ ...all, [name]: optimistic }));
    try { const response = await fetch("/api/ratings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ supplierName: name, stars }) }); const data = await response.json(); if (response.status === 401) { window.location.href = data.signIn; return; } if (response.ok) setRatings((all) => ({ ...all, [name]: data })); } catch {}
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
    try { const response = await fetch(`/api/messages${conversationId ? `?conversationId=${conversationId}` : ""}`); const data = await response.json(); if (!response.ok) { setToast(data.error || "Não foi possível abrir mensagens."); return; } setMessageData(data); if (conversationId) setActiveConversationId(conversationId); } catch { setToast("Não foi possível abrir mensagens."); }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const message = String(form.get("message") || "");
    const payload = activeConversationId ? { conversationId: activeConversationId, message } : selectedSupplier ? { supplierId: selectedSupplier.id, subject: `Contato com ${selectedSupplier.name}`, message } : null;
    if (!payload) return;
    const response = await fetch("/api/messages", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(payload) }); const data = await response.json();
    if (!response.ok) { setToast(data.error || "Não foi possível enviar a mensagem."); return; }
    event.currentTarget.reset(); await loadMessages(data.conversationId); setToast("Mensagem enviada."); window.setTimeout(()=>setToast(""),3000);
  }

  async function saveCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const payload = { company: form.get("company"), phone: form.get("phone"), instagram: form.get("instagram"), website: form.get("website"), address: form.get("address"), city: form.get("city"), state: form.get("state"), description: form.get("description"), categories: form.getAll("categories") };
    const response = await fetch("/api/leads", { method:"PATCH", headers:{"content-type":"application/json"}, body:JSON.stringify(payload) }); const data = await response.json();
    if (!response.ok) { setToast(data.error || "Não foi possível atualizar a empresa."); return; }
    setSupplierCompany(String(payload.company || "")); setEditingCompany(false); await refreshSuppliers(); fetch("/api/roadmap").then(r=>r.json()).then(setDashboard).catch(()=>{}); setToast("Informações da empresa atualizadas."); window.setTimeout(()=>setToast(""),3000);
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
      contactConsent: quoteDraft.contactConsent,
    };
    if (!payload.contactConsent || !payload.category || !payload.application || !payload.city || !payload.state || !payload.supplierIds.length) {
      setToast("Confirme o consentimento e preencha categoria, aplicação, cidade, estado e pelo menos um fornecedor.");
      window.setTimeout(() => setToast(""), 3500);
      return;
    }
    const response = await fetch("/api/roadmap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) { setToast(data.error || "Não foi possível abrir a cotação."); return; }
    setQuoteFlowOpen(false);
    setToast(`Cotação enviada. Protocolo: ${data.protocol}`);
    window.setTimeout(() => setToast(""), 4500);
    setQuoteDraft({ category: "", application: "", quantity: "1", city: "", state: "", deadline: "", notes: "", supplierIds: [], contactConsent: false });
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
    try { const response = await fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); const data = await response.json(); if (response.status === 401) { window.location.href = data.signIn; return; } if (!response.ok) { setToast(data.error); return; } } catch { setToast("Não foi possível enviar o evento."); return; }
    setEventFormOpen(false); setView("supplier-dashboard"); setToast("Evento enviado para aprovação do gestor.");
    window.setTimeout(() => setToast(""), 3500);
  }

  async function markEventInterest(eventId:number){
    if(!registered){setRegistrationRole("client");setRegisterOpen(true);return}
    const response=await fetch("/api/community",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"event_interest",eventId,reminderEnabled:true})});
    const result=await response.json();setToast(response.ok?"Interesse salvo. Você poderá receber um lembrete.":result.error||"Não foi possível salvar.");window.setTimeout(()=>setToast(""),3500);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigateTo("map")} aria-label="Ir para o mapa do Hub Brasil">
          <span className="brand-mark"><span></span><span></span><span></span></span>
          <span className="brand-copy"><strong>Hub <b>Brasil</b></strong><small>TECNOLOGIA VEICULAR</small></span>
        </button>
        <nav className="desktop-nav" aria-label="Navegação principal">
          <button className={view === "map" ? "active" : ""} onClick={() => setView("map")}>Início</button>
          <button className={view === "directory" ? "active" : ""} onClick={() => setView("directory")}>Fornecedores</button>
          <button className={view === "solutions" ? "active" : ""} onClick={() => setView("solutions")}>Soluções</button>
          <button className={view === "products" ? "active" : ""} onClick={() => setView("products")}>Produtos</button>
          <button className={view === "events" ? "active" : ""} onClick={() => setView("events")}>Eventos</button>
          <button className={view === "news" ? "active" : ""} onClick={() => setView("news")}>Radar do Setor</button>
          <button className={view === "about" ? "active" : ""} onClick={() => setView("about")}>Sobre o Hub</button>
          <button onClick={openQuoteRequest}>Solicitar cotação</button>
        </nav>
        <div className="navigation-menu" ref={navigationMenuRef}>
          <button className="mobile-menu-toggle" type="button" aria-expanded={navigationOpen} aria-controls="mobile-navigation" onClick={() => setNavigationOpen((open) => !open)}>Menu <span>☰</span></button>
          {navigationOpen && <nav id="mobile-navigation" className="mobile-navigation" aria-label="Navegação principal móvel">
            {previewMode && <a className="preview-exit" href="/admin">↩ Voltar à Visão Gestor</a>}
            <button onClick={() => navigateTo("map")}>Início</button>
            <button onClick={() => navigateTo("directory")}>Fornecedores</button>
            <button onClick={() => navigateTo("solutions")}>Soluções</button>
            <button onClick={() => navigateTo("products")}>Produtos</button>
            <button onClick={() => navigateTo("events")}>Eventos</button>
            <button onClick={() => navigateTo("news")}>Radar do Setor</button>
            <button onClick={() => navigateTo("about")}>Sobre o Hub</button>
            <button onClick={() => { openQuoteRequest(); setNavigationOpen(false); }}>Solicitar cotação</button>
            {userRole === "supplier" && <button onClick={() => navigateTo("supplier-dashboard")}>Minha empresa</button>}
            {!registered && <a href="/sign-in?return_to=/">Entrar</a>}
          </nav>}
        </div>
        <div className="top-actions">
          {previewMode && <a className="preview-exit" href="/admin">↩ Voltar à Visão Gestor</a>}
          {registered && <button className="admin-link" onClick={() => setView("supplier-dashboard")}>Painel da operação</button>}
          <a className="admin-link" href="/admin">Ver cadastros</a>
          {registered ? <span className="access-chip"><i></i>Acesso liberado</span> : <a className="text-action" href="/sign-in?return_to=/">Entrar</a>}
          {userRole === "supplier" && <button className="text-action" onClick={() => setView("supplier-dashboard")}>Minha empresa</button>}
          <button className="primary small" onClick={() => openRegistration("supplier")}>Para fornecedores</button>
        </div>
      </header>

      <main>
        {view === "map" && (
          <>
          <section className="map-layout">
            <div className="map-copy">
              <span className="hero-kicker">✦ O ecossistema de negócios do rastreamento veicular</span>
              <h1>Encontre os melhores fornecedores de <em>rastreamento, telemetria e conectividade</em> em um só lugar.</h1>
              <p>Conecte-se a fabricantes, integradores e fornecedores validados de todo o Brasil.</p>
              <p className="quality-promise"><span>✓</span> Aqui, o destaque do fornecedor é por qualidade!</p>
              <p className="empty-note">Somente fornecedores e eventos aprovados pela gestão aparecem no mapa.</p>
            </div>
            <div className="map-panel" aria-label="Mapa ilustrativo de fornecedores no Brasil">
              <div className="map-grid"></div>
              <div className="brazil-map">
                <img src="/brazil-states-map.png" alt="Mapa geográfico do Brasil dividido por estados" />
                {suppliers.map((item) => { const [x,y] = mapPoint(item.state); const logoUrl = supplierLogoUrl(item.logoKey); return <button key={`supplier-${item.id}`} className={`map-pin ${logoUrl ? "logo" : ""} ${item.highlightedOnMap ? "hub-highlight" : ""}`} style={{ left: `${x}%`, top: `${y}%` }} onClick={() => showSupplier(item)} aria-label={`${item.highlightedOnMap ? "Destaque Hub, " : ""}Fornecedor ${item.name}, em ${item.city}`}>{logoUrl ? <img src={logoUrl} alt="" /> : <span>{item.initials}</span>}{item.highlightedOnMap && <i>★</i>}</button>; })}
                {plottedEvents.map((item) => <button key={`event-${item.id}`} className={`event-pin ${selectedEvent?.id === item.id ? "selected" : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%` }} onClick={() => setSelectedEvent(item)} aria-label={`Evento ${item.name}, em ${item.city}`} title={`${item.name} · ${item.city}/${item.state}`}><span>★</span></button>)}
              </div>
              <span className="map-caption">FORNECEDORES E EVENTOS APROVADOS</span>
              {!selectedEvent && suppliers.length === 0 && events.length === 0 && <div className="map-empty"><strong>Mapa pronto para receber cadastros reais</strong><span>Fornecedores e eventos aparecerão aqui após aprovação.</span></div>}
              {selectedEvent && <div className="event-popover"><span className="event-date">{selectedEvent.displayDate}</span><div><small>PRÓXIMO EVENTO {selectedEvent.demo ? "· DEMONSTRAÇÃO" : ""}</small><strong>{selectedEvent.name}</strong><span>{selectedEvent.city}, {selectedEvent.state}</span></div><button onClick={() => setView("events")}>Ver →</button></div>}
              <a className="map-source" href="https://commons.wikimedia.org/wiki/File:Brazil_states_blank.png" target="_blank" rel="noreferrer">Mapa: Wikimedia Commons · CC BY-SA</a>
            </div>
            <div className="hero-search-stage"><div className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busque por empresa, produto, categoria ou cidade" aria-label="Buscar" /><button onClick={() => setView("directory")}>Buscar</button></div><div className="suggestion-pills" aria-label="Sugestões de busca"><span>Comece por aqui:</span><button onClick={() => { setCategory("Rastreadores"); setView("directory"); }}>Rastreador 4G</button><button onClick={() => { setCategory("Plataformas de rastreamento veicular"); setView("directory"); }}>Plataforma de rastreamento</button><button onClick={() => { setCategory("Videotelemetria"); setView("directory"); }}>Videotelemetria</button><button onClick={() => { setCategory("Conectividade M2M"); setView("directory"); }}>Chip M2M</button></div></div>
          </section>
          <section className="home-overview">
            <div className="overview-stats"><article><strong>{suppliers.length}+</strong><span>Fornecedores</span></article><article><strong>{products.length}+</strong><span>Produtos</span></article><article><strong>{solutionCategories.length}</strong><span>Soluções</span></article><article><strong>{events.length}</strong><span>Eventos</span></article></div>
            <div className="home-section-heading"><div><span className="eyebrow">DESCUBRA A TECNOLOGIA CERTA</span><h2>Principais soluções</h2><p>Uma base organizada para encontrar tecnologia veicular com clareza.</p></div><button className="section-link" onClick={() => setView("solutions")}>Ver todas →</button></div>
            <div className="solution-preview">{solutionCategories.slice(0, 4).map((item) => <button key={item.name} onClick={() => { setCategory(item.name); setView("directory"); }}><span>{item.icon}</span><strong>{item.title}</strong><small>{item.description}</small></button>)}</div>
            <section className="audience-section" aria-labelledby="audience-heading"><span className="eyebrow">CONEXÃO PARA O SETOR</span><h2 id="audience-heading">Para quem é o Hub Brasil</h2><div className="audience-grid">{audienceGroups.map((item) => <span key={item}>ϟ {item}</span>)}</div></section>
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
                  <div className="supplier-badges">{supplier.highlightedInSearch && <span>⭐ Destaque Hub</span>}{supplier.founderMember && <span>🏅 Membro Fundador</span>}</div>
                  <span className="category">{displayCategory(supplier.category)}</span>
                  <h2>{supplier.name}</h2>
                  <p>{supplier.description}</p>
                  {supplier.qualityScore !== undefined && <div className="quality-score"><strong>{supplier.qualityScore}</strong><span>Qualidade no Hub</span><small>{supplier.qualityReasons?.join(" · ")}</small></div>}
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
              <div><span className="verified">{selectedSupplier.verificationStatus === "verified" ? "◆ Fornecedor verificado" : "Fornecedor aprovado"}</span>{selectedSupplier.founderMember && <span className="verified">🏅 Membro Fundador</span>}<h1>{selectedSupplier.name}</h1><p>{displayCategory(selectedSupplier.category)} · {selectedSupplier.city}, {selectedSupplier.state}</p>{selectedSupplier.verifiedAt && <small>Verificado em {new Date(selectedSupplier.verifiedAt).toLocaleDateString("pt-BR")}</small>}</div>
              <div className="profile-actions"><button className="event-create" onClick={() => { const url=`${window.location.origin}/fornecedor/${selectedSupplier.id}`; if(navigator.share) navigator.share({title:selectedSupplier.name,url}).catch(()=>{}); else navigator.clipboard.writeText(url).then(()=>{setToast("Link do perfil copiado.");window.setTimeout(()=>setToast(""),3000)}); }}>Compartilhar perfil</button>{userRole === "supplier" && <button className="event-create" onClick={() => setEventFormOpen(true)}>＋ Cadastrar evento</button>}</div>
            </div>
            <div className="rating-panel"><div><strong>{ratings[selectedSupplier.name] ? ratings[selectedSupplier.name].average.toFixed(1) : "Sem avaliações"}</strong>{ratings[selectedSupplier.name] && <span>{"★".repeat(Math.round(ratings[selectedSupplier.name].average))}</span>}</div><p>Avalie este fornecedor</p><div className="star-picker">{[1,2,3,4,5].map((star) => <button key={star} onClick={() => rateSupplier(selectedSupplier.name, star)} aria-label={`${star} estrelas`}>★</button>)}</div></div>
            <div className="profile-columns">
              <div><h2>Produtos publicados</h2>{products.filter((item) => item.supplierName === selectedSupplier.name).length === 0 ? <div className="events-empty"><strong>Nenhum produto publicado</strong><p>Os produtos aprovados deste fornecedor aparecerão aqui.</p></div> : <div className="product-grid">{products.filter((item) => item.supplierName === selectedSupplier.name).map((item) => <article className="product-card" key={item.id}><div className="product-visual">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <div className="device"></div>}</div><span className="category">{displayCategory(item.category)}</span><h3>{item.name}</h3><p>Especificações, aplicação e diferenciais</p><button onClick={() => openProduct(item)}>Ver informações →</button></article>)}</div>}</div>
              <aside className="contact-panel"><h3>Contato comercial</h3><p>Conecte-se com segurança e só compartilhe contato quando você decidir.</p><dl><div><dt>Localização</dt><dd>{selectedSupplier.city}, {selectedSupplier.state}</dd></div><div><dt>Telefone / WhatsApp</dt><dd>{isContactUnlocked(selectedSupplier) ? selectedSupplier.phone || "Contato protegido" : maskPhone(selectedSupplier.phone)}</dd></div>{selectedSupplier.instagram && <div><dt>Instagram</dt><dd>{selectedSupplier.instagram}</dd></div>}{selectedSupplier.website && <div><dt>Site</dt><dd>{selectedSupplier.website}</dd></div>}</dl><div className="contact-actions"><button onClick={openContactForSupplier.bind(null, selectedSupplier)}>{isContactUnlocked(selectedSupplier) ? "Contato liberado" : "Liberar contato para conexão"}</button><button onClick={() => { if (!registered) { openRegistration("client"); return; } if (userRole !== "client") { setToast("Mensagens diretas são iniciadas por perfis de usuário."); return; } setActiveConversationId(null); setMessageData({ conversations: [] }); setView("messages"); }}>Enviar mensagem pelo Hub</button>{isContactUnlocked(selectedSupplier) && selectedSupplier.phone && <a href={`https://wa.me/55${selectedSupplier.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" onClick={() => fetch("/api/roadmap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "track", kind: "whatsapp_click", supplierId: selectedSupplier.id }) }).catch(() => {})}>Conversar no WhatsApp</a>}{selectedSupplier.website && <a href={selectedSupplier.website} target="_blank" rel="noreferrer" onClick={() => fetch("/api/roadmap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "track", kind: "website_click", supplierId: selectedSupplier.id }) }).catch(() => {})}>Visitar site</a>}</div><button className="event-create" onClick={openQuoteRequest.bind(null, selectedSupplier)}>Solicitar cotação estruturada</button></aside>
            </div>
          </section>
        )}

        {view === "events" && <section className="events-page"><div className="page-heading"><div><span className="eyebrow">AGENDA DO SETOR</span><h1>Próximos eventos</h1><p>Encontros, feiras e treinamentos promovidos por fornecedores.</p></div><button className="primary" onClick={() => setEventFormOpen(true)}>＋ Cadastrar evento</button></div>{events.length === 0 ? <div className="events-empty"><strong>Nenhum evento real publicado ainda</strong><p>Quando um evento for cadastrado e aprovado, ele aparecerá nesta agenda e no mapa.</p><button className="event-create" onClick={() => setEventFormOpen(true)}>Cadastrar o primeiro evento</button></div> : <div className="events-grid">{events.sort((a,b) => a.date.localeCompare(b.date)).map((item) => <article className="event-card" key={item.id}><div className="calendar-block"><strong>{item.displayDate.split(" ")[0]}</strong><span>{item.displayDate.split(" ")[1]}</span><small>{item.displayDate.split(" ")[2]}</small></div><div className="event-card-copy"><span className="eyebrow">EVENTO CADASTRADO</span><h2>{item.name}</h2><p>⌖ {item.venue} · {item.city}, {item.state}</p><small>Promovido por {item.supplier}</small><button className="event-interest" onClick={()=>markEventInterest(item.id)}>☆ Tenho interesse</button></div><a href={item.link} target="_blank" rel="noreferrer">Inscrever-se →</a></article>)}</div>}</section>}
        {view === "products" && <section className="products-page"><div className="page-heading"><div><span className="eyebrow">CATÁLOGO DO SETOR</span><h1>Produtos</h1><p>Fotos, especificações, aplicações e diferenciais publicados pelos fornecedores.</p></div>{userRole === "supplier" && <button className="primary" onClick={() => setProductFormOpen(true)}>＋ Cadastrar produto</button>}</div><p className="commercial-notice">Preços, disponibilidade, frete e condições comerciais devem ser confirmados diretamente com o fornecedor.</p>{products.length === 0 ? <div className="events-empty"><strong>Nenhum produto cadastrado ainda</strong><p>Os cards aparecerão aqui conforme os fornecedores adicionarem seus produtos.</p>{userRole === "supplier" ? <button className="event-create" onClick={() => setProductFormOpen(true)}>Cadastrar o primeiro produto</button> : <button className="event-create" onClick={() => openRegistration("supplier")}>Sou fornecedor</button>}</div> : <div className="catalog-grid">{products.map((product) => <article className="catalog-card" key={product.id} onClick={() => openProduct(product)}><div className="catalog-photo">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <span>Sem foto</span>}</div><div className="catalog-copy">{product.highlighted && <span className="verified">⭐ Destaque Hub</span>}<span className="category">{displayCategory(product.category)}</span><h2>{product.name}</h2><p>{product.supplierName}</p><button>Ver especificações e aplicações →</button></div></article>)}</div>}</section>}

        {view === "news" && <section className="news-page"><div className="news-hero"><div><span className="eyebrow">INFORMAÇÃO PARA QUEM MOVE O MERCADO</span><h1>Radar do Setor</h1><p>Notícias selecionadas sobre rastreamento veicular, telecomunicações, conectividade, tecnologia e mercado automotivo.</p></div><div className="news-radar-mark" aria-hidden="true"><span></span><i></i></div></div><div className="news-trust"><strong>Curadoria com fonte identificada</strong><span>O Hub publica somente resumos e direciona você para a matéria original. Todo conteúdo passa por aprovação.</span></div><div className="news-filters" aria-label="Filtrar notícias por categoria">{newsCategories.map((item) => <button key={item} className={newsCategory === item ? "active" : ""} onClick={() => setNewsCategory(item)}>{item}</button>)}</div>{filteredNews.length === 0 ? <div className="events-empty news-empty"><strong>O Radar está pronto para receber notícias reais</strong><p>As primeiras publicações aparecerão aqui após a conferência da fonte e aprovação da gestão.</p><a className="event-create" href="/admin">Acessar gestão do Radar</a></div> : <div className="news-grid">{filteredNews.map((item, index) => <article className={`news-card ${index === 0 ? "featured" : ""}`} key={item.id}>{item.imageUrl ? <div className="news-image"><img src={item.imageUrl} alt="" /></div> : <div className="news-image news-image-placeholder"><span>RADAR</span><i></i></div>}<div className="news-card-copy"><div className="news-meta"><span>{item.category}</span><time dateTime={item.publishedAt}>{new Date(`${item.publishedAt}T12:00:00`).toLocaleDateString("pt-BR")}</time></div><h2>{item.title}</h2><p>{item.summary}</p><div className="news-source"><small>Fonte: {item.sourceName}</small><a href={item.sourceUrl} target="_blank" rel="noreferrer">Ler notícia completa →</a></div></div></article>)}</div>}</section>}

        {view === "supplier-dashboard" && <section className="supplier-dashboard"><div className="page-heading"><div><span className="eyebrow">PAINEL DA EMPRESA</span><h1>{supplierCompany || "Minha empresa"}</h1><p>Publique soluções, acompanhe oportunidades e mantenha seu perfil atualizado.</p></div><div className="dashboard-actions"><button className="event-create" onClick={() => setEditingCompany(true)}>Editar empresa</button><button className="event-create" onClick={() => { setView("messages"); loadMessages(); }}>Mensagens</button></div></div>{previewMode === "supplier" ? <div className="approval-banner"><strong>Modo de visualização</strong><span>Você está vendo a experiência do fornecedor. Cadastros estão desativados nesta visualização.</span></div> : !supplierApproved && <div className="approval-banner"><strong>Cadastro em análise</strong><span>O gestor precisa validar seu telefone e aprovar sua empresa antes da primeira publicação.</span></div>}<div className="metric-grid"><article><span>◉</span><strong>{dashboard.supplierMetrics?.profile_view || 0}</strong><small>Visualizações do perfil</small></article><article><span>◌</span><strong>{dashboard.supplierMetrics?.whatsapp_click || 0}</strong><small>Cliques no WhatsApp</small></article><article><span>↗</span><strong>{dashboard.supplierMetrics?.website_click || 0}</strong><small>Cliques no site</small></article><article><span>✦</span><strong>{dashboard.supplierMetrics?.quote_request || 0}</strong><small>Solicitações recebidas</small></article><article><span>☆</span><strong>{dashboard.supplierMetrics?.favorite || 0}</strong><small>Favoritos recebidos</small></article></div><div className="management-grid"><button disabled={!supplierApproved || Boolean(previewMode)} onClick={() => setProductFormOpen(true)}><span>▣</span><strong>Cadastrar produto</strong><small>{previewMode ? "Disponível para fornecedores aprovados" : supplierApproved ? "Foto, categoria, especificações, aplicação e diferenciais" : "Disponível após aprovação"}</small></button><button disabled={!supplierApproved || Boolean(previewMode)} onClick={() => setEventFormOpen(true)}><span>★</span><strong>Cadastrar evento</strong><small>{previewMode ? "Disponível para fornecedores aprovados" : supplierApproved ? "Local, data e link de inscrição" : "Disponível após aprovação"}</small></button><button onClick={() => setView("products")}><span>⌕</span><strong>Ver produtos publicados</strong><small>Acompanhe seus cards e especificações no catálogo.</small></button></div>{(dashboard.supplierQuotes || []).length > 0 && <section className="dashboard-requests"><h2>Oportunidades recentes</h2>{dashboard.supplierQuotes?.map((quote) => <article key={quote.id}><strong>{quote.protocol}</strong><span>{quote.category} · {quote.application}</span><small>{quote.status === "responded" ? "Respondida" : "Aguardando resposta"}</small></article>)}</section>}</section>}

        {view === "messages" && <section className="messages-page"><div className="page-heading"><div><span className="eyebrow">MENSAGENS PRIVADAS</span><h1>Conversas no Hub</h1><p>O contato é compartilhado apenas quando você decide conversar.</p></div><button className="event-create" onClick={() => { setView(userRole === "supplier" ? "supplier-dashboard" : "directory"); }}>Voltar</button></div><div className="messages-layout"><aside><h2>Conversas</h2>{messageData.conversations.length === 0 ? <p>Nenhuma conversa iniciada ainda.</p> : messageData.conversations.map((conversation) => <button key={conversation.id} className={activeConversationId === conversation.id ? "active" : ""} onClick={() => loadMessages(conversation.id)}><strong>{conversation.supplierName || conversation.clientCompany || conversation.clientName || "Contato"}</strong><span>{conversation.subject}</span></button>)}</aside><section className="message-thread">{selectedSupplier && !activeConversationId && userRole === "client" ? <><h2>Nova mensagem para {selectedSupplier.name}</h2><p>Apresente sua necessidade. A empresa receberá a conversa em seu painel.</p><form onSubmit={sendMessage}><textarea name="message" required rows={6} placeholder="Olá, gostaria de saber mais sobre..." /><button className="primary">Enviar mensagem →</button></form></> : activeConversationId ? <><h2>{messageData.conversations.find((item) => item.id === activeConversationId)?.subject || "Conversa"}</h2><div className="thread-list">{messageData.messages?.map((message) => <article key={message.id} className={message.senderUserId === messageData.currentUserId ? "mine" : ""}><p>{message.body}</p><small>{new Date(message.createdAt).toLocaleString("pt-BR")}</small></article>)}</div><form onSubmit={sendMessage}><textarea name="message" required rows={3} placeholder="Escreva sua resposta" /><button className="primary">Enviar →</button></form></> : <div className="events-empty"><strong>Selecione uma conversa</strong><p>Quando um cliente entrar em contato, ela aparecerá aqui.</p></div>}</section></div></section>}
      </main>

      <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><button className="brand" onClick={() => setView("map")}><span className="brand-mark"><span></span><span></span><span></span></span><span className="brand-copy"><strong>Hub <b>Brasil</b></strong><small>TECNOLOGIA VEICULAR</small></span></button><p>O ecossistema de negócios do mercado de rastreamento, telemetria e IoT no Brasil.</p></div><div><strong>Plataforma</strong><button onClick={() => setView("directory")}>Fornecedores</button><button onClick={() => setView("solutions")}>Soluções</button><button onClick={() => setView("events")}>Eventos</button><button onClick={openQuoteRequest}>Solicitar cotação</button></div><div><strong>Para empresas</strong><button onClick={() => openRegistration("supplier")}>Cadastrar empresa</button><button onClick={() => setView("about")}>Sobre o Hub</button><button onClick={() => setRegisterOpen(true)}>Entrar</button></div><div><strong>Contato</strong><a href="mailto:suporte@niviontech.com.br">suporte@niviontech.com.br</a><span>Brasil</span></div></div><div className="footer-bottom"><span>© 2026 Hub Brasil. Todos os direitos reservados.</span><div><a href="/termos">Termos de uso</a><a href="/privacidade">Privacidade</a><a href="/admin">Gestão</a></div></div></footer>

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
            <form onSubmit={submitQuoteRequest}>
              <label>Categoria de necessidade<input name="category" value={quoteDraft.category} onChange={updateQuoteInput} required list="category-suggestions" placeholder="Ex.: Rastreadores para frota" /></label>
              <datalist id="category-suggestions">{solutionCategories.map((item) => <option key={item.name} value={item.name} />)}</datalist>
              <label>Uso da solução<textarea name="application" value={quoteDraft.application} onChange={updateQuoteInput} rows={3} required placeholder="Para quais operações e quantidade de veículos?" /></label>
              <div className="field-row">
                <label>Quantidade de ativos<input name="quantity" type="number" min="1" max="120" value={quoteDraft.quantity} onChange={updateQuoteInput} required /></label>
                <label>Prazo limite (opcional)<input name="deadline" type="date" value={quoteDraft.deadline} onChange={updateQuoteInput} /></label>
              </div>
              <label>Cidade da operação<input name="city" value={quoteDraft.city} onChange={updateQuoteInput} required placeholder="Ex.: São Paulo" /></label>
              <label>Estado (UF)<input name="state" value={quoteDraft.state} onChange={updateQuoteInput} required maxLength={2} placeholder="SP" /></label>
              <label>Notas de contexto<textarea name="notes" value={quoteDraft.notes} onChange={updateQuoteInput} rows={3} placeholder="Tipo de operação, horários de monitoramento, cobertura necessária..." /></label>
              <fieldset className="solution-selector">
                <legend>Fornecedores candidatos <small>Selecione 1 a 8</small></legend>
                {suppliers.map((supplier) => (
                  <label className="check" key={supplier.id}>
                    <input type="checkbox" checked={quoteDraft.supplierIds.includes(String(supplier.id))} onChange={() => toggleQuoteSupplier(supplier.id)} />
                    {supplier.name} · {supplier.city}/{supplier.state}
                  </label>
                ))}
              </fieldset>
              <label className="consent"><input type="checkbox" name="contactConsent" checked={quoteDraft.contactConsent} onChange={(event) => setQuoteDraft((draft) => ({ ...draft, contactConsent: event.target.checked }))} required /> <span>Autorizo o Hub a repassar meu contato aos fornecedores escolhidos para retorno da cotação.</span></label>
              <button className="primary full" type="submit">Enviar solicitação <span>→</span></button>
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
            <p>Ao revelar, o telefone/WhatsApp de <strong>{pendingContactSupplier.name}</strong> fica visível para você e passará a receber os eventos de contato.</p>
            <button className="primary full" onClick={confirmContactForSupplier}>Entendo e quero liberar contato</button>
            <button className="event-create" onClick={closeContactForSupplier}>Agora não</button>
          </section>
        </div>
      )}

      {editingCompany && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingCompany(false); }}><section className="access-modal event-form company-editor" role="dialog" aria-modal="true"><button className="modal-close" onClick={() => setEditingCompany(false)} aria-label="Fechar">×</button><span className="eyebrow">MINHA EMPRESA</span><h2>Editar informações da empresa</h2><p>Esses dados compõem seu perfil público após a aprovação da gestão.</p><form onSubmit={saveCompany}><label>Nome da empresa<input name="company" defaultValue={supplierCompany} required /></label><div className="field-row"><label>Telefone / WhatsApp<input name="phone" defaultValue={dashboard.profile?.phone || ""} required /></label><label>Instagram<input name="instagram" defaultValue={dashboard.profile?.instagram || ""} /></label></div><label>Site da empresa <small>Opcional</small><input name="website" type="url" defaultValue={dashboard.profile?.website || ""} placeholder="https://www.suaempresa.com.br" /></label><label>Endereço<input name="address" defaultValue={dashboard.profile?.address || ""} required placeholder="Rua, número, bairro e complemento" /></label><div className="field-row"><label>Cidade<input name="city" defaultValue={dashboard.profile?.city || ""} required /></label><label>Estado<input name="state" maxLength={2} defaultValue={dashboard.profile?.state || ""} required /></label></div><fieldset className="solution-selector"><legend>Soluções oferecidas <small>Escolha uma ou mais.</small></legend>{solutionCategories.map((item) => <label className="check" key={item.name}><input name="categories" type="checkbox" value={item.name} defaultChecked={(dashboard.profile?.categories || []).includes(item.name)} />{item.title}</label>)}</fieldset><label>Sobre a empresa<textarea name="description" rows={4} defaultValue={dashboard.profile?.description || ""} placeholder="Especialidades, diferenciais e informações relevantes" /></label><button className="primary full" type="submit">Salvar informações →</button></form></section></div>}

      {eventFormOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEventFormOpen(false); }}><section className="access-modal event-form" role="dialog" aria-modal="true" aria-labelledby="event-form-title"><button className="modal-close" onClick={() => setEventFormOpen(false)} aria-label="Fechar">×</button><span className="eyebrow">ÁREA DO FORNECEDOR</span><h2 id="event-form-title">Cadastrar novo evento</h2><p>Após a revisão, o evento aparecerá na agenda e como um ponto especial no mapa.</p><form onSubmit={createEvent}><label>Nome do evento<input name="name" required placeholder="Ex.: Encontro de Integradores" /></label><div className="field-row"><label>Data<input name="date" type="date" required /></label><label>Local<input name="venue" required placeholder="Centro de eventos" /></label></div><div className="field-row"><label>Cidade<input name="city" required placeholder="São Paulo" /></label><label>Estado<select name="state" required><option value="">Selecione</option><option>SP</option><option>PR</option><option>MG</option><option>RJ</option><option>GO</option><option>PE</option></select></label></div><label>Link para inscrição<input name="link" type="url" required placeholder="https://seusite.com/inscricao" /></label><label>Descrição<textarea name="description" rows={3} placeholder="Conte brevemente sobre o evento" /></label><button className="primary full" type="submit">Enviar evento para publicação <span>→</span></button></form></section></div>}

      {selectedProduct && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProduct(null); }}><section className="access-modal product-detail" role="dialog" aria-modal="true"><button className="modal-close" onClick={() => setSelectedProduct(null)} aria-label="Fechar">×</button><div className="detail-photo">{selectedProduct.imageUrl ? <img src={selectedProduct.imageUrl} alt={selectedProduct.name} /> : <span>Produto sem foto</span>}</div><span className="category">{displayCategory(selectedProduct.category)}</span><h2>{selectedProduct.name}</h2><strong className="detail-supplier">{selectedProduct.supplierName}</strong><h3>Informações do produto</h3><p>{selectedProduct.technicalDetails}</p><p className="commercial-notice">Preços, disponibilidade, frete e condições comerciais devem ser confirmados diretamente com o fornecedor.</p><button className="primary full quote-button" onClick={() => { setSelectedProduct(null); openQuoteRequestFromProduct(selectedProduct); }}>Solicitar cotação estruturada <span>→</span></button></section></div>}

      {productFormOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProductFormOpen(false); }}><section className="access-modal event-form" role="dialog" aria-modal="true"><button className="modal-close" onClick={() => setProductFormOpen(false)} aria-label="Fechar">×</button><span className="eyebrow">ÁREA DO FORNECEDOR</span><h2>Cadastrar produto</h2><p>Destaque as informações que ajudam o cliente a identificar a solução adequada.</p><form onSubmit={createProduct}><label>Foto do produto<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required /></label><label>Nome do produto<input name="name" required placeholder="Ex.: Rastreador 4G LTE" /></label><label>Categoria<select name="category" required><option value="">Selecione</option>{solutionCategories.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label>Especificações técnicas<textarea name="technicalDetails" rows={4} required placeholder="Tecnologia, alimentação, conectividade, homologações e demais especificações" /></label><label>Aplicação<textarea name="application" rows={3} required placeholder="Para quais veículos, operações ou necessidades este produto é indicado?" /></label><label>Diferenciais<textarea name="differentials" rows={3} required placeholder="Recursos, benefícios e diferenciais da solução" /></label><p className="commercial-notice">Preços, disponibilidade, frete e condições comerciais serão tratados diretamente com o cliente.</p><button className="primary full" type="submit">Enviar produto para aprovação <span>→</span></button></form></section></div>}

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
              <label>Telefone / WhatsApp<input name="phone" required inputMode="tel" placeholder="(00) 00000-0000" /></label>
              <label>Endereço<input name="address" required placeholder="Rua, número, bairro e complemento" /></label>
              <div className="field-row"><label>Nome fantasia {registrationRole === "client" && <small>Opcional</small>}<input name="company" required={registrationRole === "supplier"} placeholder="Nome da empresa" /></label><label>Instagram <small>Opcional</small><input name="instagram" placeholder="@suaempresa" /></label></div>
              {registrationRole === "client" && <><label>CNPJ <small>Opcional</small><input name="cnpj" inputMode="numeric" placeholder="00.000.000/0000-00" /></label><label>Foto de perfil <small>Opcional · PNG, JPG ou WebP, até 3 MB</small><input name="profilePhoto" type="file" accept="image/png,image/jpeg,image/webp" /></label></>}
              {registrationRole === "supplier" && <><label>CNPJ<input name="cnpj" required inputMode="numeric" placeholder="00.000.000/0000-00" /><small>Validamos apenas os dígitos; a confirmação empresarial é feita pela gestão.</small></label>{referralCode && <p className="commercial-notice">Você foi indicado por uma empresa parceira do Hub Brasil.</p>}<label>Categoria principal<select name="category" required><option value="">Selecione</option>{solutionCategories.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><fieldset className="solution-selector"><legend>Soluções oferecidas <small>Selecione uma ou mais</small></legend>{solutionCategories.map((item) => <label className="check" key={item.name}><input name="categories" type="checkbox" value={item.name} /> {item.title}</label>)}</fieldset><div className="field-row"><label>Cidade<input name="city" required placeholder="Cidade da sede" /></label><label>Estado<select name="state" required><option value="">UF</option>{["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((state) => <option key={state}>{state}</option>)}</select></label></div><label>Apresentação da empresa<textarea name="description" rows={3} placeholder="Especialidades, diferenciais e região atendida" /></label><label>Logo da empresa <small>PNG, JPG ou WebP, até 3 MB</small><input name="logo" type="file" accept="image/png,image/jpeg,image/webp" /></label><label className="consent logo-consent"><input name="logoConsent" type="checkbox" required /> <span>Declaro que possuo autorização para utilizar e divulgar esta marca/logotipo no Hub Brasil e autorizo sua exibição no perfil público, diretório e mapa da plataforma.</span></label></>}
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
