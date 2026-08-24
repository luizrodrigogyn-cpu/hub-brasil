import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findNiche, niches } from "../niches";
import { getEcosystemCounts } from "../live-data";

export const dynamic = "force-dynamic";

type RouteParams = { slug: string };

export async function generateMetadata({ params }: { params: Promise<RouteParams> | RouteParams }): Promise<Metadata> {
  const resolved = await (params instanceof Promise ? params : Promise.resolve(params));
  const niche = findNiche(resolved.slug);
  if (!niche) return { title: "Soluções | Hub Brasil" };
  return {
    title: niche.metaTitle,
    description: niche.metaDescription,
    alternates: { canonical: `/solucoes/${niche.slug}` },
  };
}

export default async function NichePage({ params }: { params: Promise<RouteParams> | RouteParams }) {
  const resolved = await (params instanceof Promise ? params : Promise.resolve(params));
  const niche = findNiche(resolved.slug);
  if (!niche) notFound();

  const counts = await getEcosystemCounts();
  const others = niches.filter((item) => item.slug !== niche!.slug);
  const categoryQuery = (name: string) => `/?ir=directory&categoria=${encodeURIComponent(name)}`;

  return (
    <main className="legal-page seo-page">
      <a href="/solucoes">← Todas as soluções</a>
      <span className="eyebrow">{niche!.kicker}</span>
      <h1>{niche!.h1}</h1>
      <p>{niche!.intro}</p>
      {counts.suppliers > 0 && (
        <p>
          Hoje o Hub Brasil reúne <strong>{counts.suppliers}</strong> fornecedor{counts.suppliers === 1 ? "" : "es"} aprovado
          {counts.suppliers === 1 ? "" : "s"}, todos validados pela gestão do Hub antes de ficarem visíveis.
        </p>
      )}

      <h2>Para quem é</h2>
      <ul>
        {niche!.audience.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>O que você encontra aqui</h2>
      <ul>
        <li>Fornecedores aprovados pela gestão, com telefone verificado antes da publicação</li>
        <li>Ficha técnica comparável por categoria — sem precisar consultar manual para o essencial</li>
        <li>Transparência antes do contato: SLA médio de resposta, faixa de preço e área de atendimento</li>
        <li>Cotação estruturada enviada diretamente aos fornecedores certos, ordenada por compatibilidade</li>
      </ul>

      <h2>Categorias técnicas relacionadas</h2>
      <p className="seo-chip-row">
        {niche!.relatedCategories.map((category) => (
          <a className="seo-chip" key={category} href={categoryQuery(category)}>
            {category}
          </a>
        ))}
      </p>

      <p>
        <a href="/?ir=directory">Ver todos os fornecedores aprovados →</a>
      </p>

      <h2>Outras aplicações</h2>
      <p className="seo-chip-row">
        {others.map((item) => (
          <a className="seo-chip" key={item.slug} href={`/solucoes/${item.slug}`}>
            {item.h1}
          </a>
        ))}
      </p>

      <h2>Faça parte do ecossistema</h2>
      <p>
        <a href="/?cadastro=fornecedor">Sou fornecedor →</a> &nbsp;·&nbsp; <a href="/?ir=directory">Buscar fornecedores →</a>{" "}
        &nbsp;·&nbsp; <a href="/?ir=news">Radar do setor →</a>
      </p>
    </main>
  );
}
