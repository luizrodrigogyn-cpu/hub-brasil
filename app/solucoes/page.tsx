import type { Metadata } from "next";
import { niches } from "./niches";
import { getEcosystemCounts, getLatestNews, getUpcomingEvents } from "./live-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tudo que a sua empresa de rastreamento precisa em um só lugar | Hub Brasil",
  description:
    "Fornecedores validados, comparação técnica, cotação estruturada, eventos e notícias do setor de rastreamento veicular, telemetria e IoT — reunidos em um só lugar.",
  alternates: { canonical: "/solucoes" },
};

export default async function SolucoesPage() {
  const [counts, news, events] = await Promise.all([getEcosystemCounts(), getLatestNews(3), getUpcomingEvents(3)]);

  return (
    <main className="legal-page seo-page">
      <a href="/">← Voltar ao Hub Brasil</a>
      <span className="eyebrow">HUB BRASIL · SOLUÇÕES</span>
      <h1>Tudo que a sua empresa de rastreamento precisa em um só lugar</h1>
      <p>
        Aqui você se atualiza sobre eventos, novidades em equipamentos e notícias que movem o setor — e encontra fornecedores
        validados de rastreamento veicular, telemetria e IoT para cada necessidade da sua operação.
      </p>
      {(counts.suppliers > 0 || counts.products > 0) && (
        <p>
          Hoje o Hub Brasil reúne <strong>{counts.suppliers}</strong> fornecedor{counts.suppliers === 1 ? "" : "es"} aprovado
          {counts.suppliers === 1 ? "" : "s"} e <strong>{counts.products}</strong> produto{counts.products === 1 ? "" : "s"}{" "}
          publicado{counts.products === 1 ? "" : "s"}, todos passando por aprovação da gestão antes de ficarem visíveis.
        </p>
      )}

      <h2>Escolha sua necessidade</h2>
      <div className="seo-card-grid">
        {niches.map((niche) => (
          <a className="seo-card" key={niche.slug} href={`/solucoes/${niche.slug}`}>
            <span className="eyebrow">{niche.kicker}</span>
            <h3>{niche.h1}</h3>
            <p>{niche.intro.slice(0, 140)}…</p>
            <small>Ver fornecedores →</small>
          </a>
        ))}
      </div>

      <h2>Ou explore por categoria técnica</h2>
      <p>
        Prefere buscar por tecnologia em vez de aplicação? Veja o <a href="/?ir=solutions">catálogo completo de categorias</a>{" "}
        — rastreadores, plataformas, telemetria, sensores, videotelemetria e mais.
      </p>

      {(news.length > 0 || events.length > 0) && (
        <>
          <h2>Novidades e eventos do setor</h2>
          {news.length > 0 && (
            <>
              <h3>Radar do setor</h3>
              <ul>
                {news.map((item) => (
                  <li key={item.id}>
                    <strong>{item.title}</strong> — {item.summary}
                  </li>
                ))}
              </ul>
            </>
          )}
          {events.length > 0 && (
            <>
              <h3>Próximos eventos</h3>
              <ul>
                {events.map((item) => (
                  <li key={item.id}>
                    <strong>{item.name}</strong> — {item.city}/{item.state} ·{" "}
                    {new Date(`${item.eventDate}T12:00:00`).toLocaleDateString("pt-BR")}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p>
            <a href="/?ir=news">Ver tudo no Radar do Setor →</a>
          </p>
        </>
      )}

      <h2>Faça parte do ecossistema</h2>
      <p>
        Cadastre sua empresa gratuitamente como fornecedor ou encontre o parceiro certo para o seu projeto de rastreamento hoje
        mesmo.
      </p>
      <p>
        <a href="/?cadastro=fornecedor">Sou fornecedor →</a> &nbsp;·&nbsp; <a href="/?ir=directory">Buscar fornecedores →</a>
      </p>
    </main>
  );
}
