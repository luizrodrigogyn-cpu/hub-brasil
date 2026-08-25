"use client";

import { useEffect, useState } from "react";

type Supplier = {
  id: number;
  name: string;
  category: string;
  city: string;
  state: string;
  description: string;
  qualityScore?: number;
  qualityReasons?: string[];
  verificationStatus?: string;
  logoUrl?: string | null;
  phone?: string | null;
  instagram?: string | null;
  website?: string | null;
};

type Product = {
  id: number;
  supplierName: string;
  name: string;
  category: string;
  isProtected: boolean;
};

type RouteParams = { id: string | number };

export default function SharedSupplier({ params }: { params: Promise<RouteParams> | RouteParams }) {
  const [id, setId] = useState(0);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  // Antes, "carregando" e "link inválido/expirado" mostravam a mesma mensagem — um link
  // compartilhado quebrado parecia carregar para sempre em vez de avisar o visitante.
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await (params instanceof Promise ? params : Promise.resolve(params));
      const normalizedId = Number(resolved.id);
      if (Number.isInteger(normalizedId) && normalizedId > 0) setId(normalizedId);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!id) return;
    Promise.all([fetch("/api/suppliers").then((response) => response.json()), fetch("/api/products").then((response) => response.json())])
      .then(([supplierResult, productResult]) => {
        const rows = (supplierResult.suppliers || []) as Array<Record<string, unknown>>;
        const item = rows.find((record) => Number(record.id) === id) as Record<string, unknown> | undefined;
        if (!item) {
          setSupplier(null);
          setNotFound(true);
          return;
        }
        const parsedCategory = String(item.category || "Não informado");
        const parsedName = String(item.name || "Fornecedor");
        const parsedDescription = String(item.description || "Fornecedor aprovado no Hub.");
        setSupplier({
          id: Number(item.id),
          name: parsedName,
          category: parsedCategory,
          city: String(item.city || ""),
          state: String(item.state || ""),
          description: parsedDescription,
          qualityScore: Number(item.qualityScore || 0),
          qualityReasons: Array.isArray(item.qualityReasons) ? item.qualityReasons.map(String) : [],
          verificationStatus: item.verificationStatus ? String(item.verificationStatus) : "approved",
          logoUrl: typeof item.logoKey === "string" ? item.logoKey : null,
          phone: typeof item.phone === "string" ? item.phone : null,
          instagram: typeof item.instagram === "string" ? item.instagram : null,
          website: typeof item.website === "string" ? item.website : null,
        });

        const catalog = (productResult.products || []) as Array<Record<string, unknown>>;
        setProducts(catalog.filter((record) => String(record.supplierName) === parsedName).map((record) => ({ id: Number(record.id), supplierName: String(record.supplierName || ""), name: String(record.name || ""), category: String(record.category || ""), isProtected: true })));
      })
      .catch(() => {
        setProducts([]);
        setNotFound(true);
      });
  }, [id]);

  if (notFound) return <main className="test-area"><header className="test-header"><div><span>HUB BRASIL · PERFIL COMPARTILHADO</span><h1>Fornecedor não encontrado</h1><p>Este link pode estar expirado, ou o fornecedor não está mais aprovado no Hub.</p></div><a href="/">Voltar ao Hub</a></header></main>;

  if (!supplier) return <main className="test-area"><header className="test-header"><div><span>HUB BRASIL · PERFIL COMPARTILHADO</span><h1>Fornecedor</h1><p>Buscando fornecedor aprovado...</p></div><a href="/">Voltar ao Hub</a></header></main>;

  return (
    <main className="test-area">
      <header className="test-header">
        <div><span>HUB BRASIL · PERFIL COMPARTILHADO</span><h1>{supplier.name}</h1><p>{supplier.category} · {supplier.city}/{supplier.state}</p></div>
        <a href="/">Abrir o Hub</a>
      </header>
      <div className="test-grid">
        <section className="test-card">
          <div className="test-card-title"><div><small>QUALIDADE</small><h2>{supplier.verificationStatus === "verified" ? "Fornecedor verificado" : "Fornecedor aprovado"}</h2></div><span>◆</span></div>
          <p>{supplier.description}</p>
          {supplier.qualityScore !== undefined && <div className="quality-score"><strong>{String(supplier.qualityScore)}</strong><span>Qualidade no Hub</span><small>{supplier.qualityReasons?.join(" · ")}</small></div>}
          <p className="commercial-notice">Contato apenas no Hub e com consentimento do usuário no fluxo principal.</p>
        </section>
        <section className="test-card">
          <div className="test-card-title"><div><small>CATÁLOGO</small><h2>Produtos publicados</h2></div><span>▣</span></div>
          {products.length === 0 ? <p className="test-empty">Nenhum produto visível para este acesso.</p> : products.map((item) => <article className="content-item" key={item.id}><h3>{item.name}</h3><p>{item.category}</p></article>)}
        </section>
      </div>
    </main>
  );
}
