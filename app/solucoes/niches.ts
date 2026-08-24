// Conteúdo das páginas de entrada por nicho (SEO). Estático e revisável — nenhum dado
// aqui é inventado; números de fornecedores/produtos são buscados ao vivo no banco
// pelas próprias páginas, este arquivo só guarda a copy e os vínculos com categorias reais.
export type Niche = {
  slug: string;
  kicker: string;
  h1: string;
  intro: string;
  metaTitle: string;
  metaDescription: string;
  audience: string[];
  relatedCategories: string[];
};

export const niches: Niche[] = [
  {
    slug: "rastreamento-de-frotas",
    kicker: "PARA GESTÃO DE FROTAS",
    h1: "Rastreamento de frotas",
    intro:
      "Encontre fornecedores validados de rastreamento veicular para gerenciar frotas próprias, terceirizadas ou de locação — do dispositivo GPS à plataforma de monitoramento, com telemetria e identificação de motorista quando a operação exigir.",
    metaTitle: "Rastreamento de frotas — fornecedores validados | Hub Brasil",
    metaDescription:
      "Compare fornecedores aprovados de rastreamento de frotas: GPS veicular, plataformas de monitoramento, telemetria e identificação de motorista. Cotação estruturada e contato direto pelo Hub Brasil.",
    audience: [
      "Empresas de transporte e locação com frota própria ou de terceiros",
      "Gestores de frota que precisam comparar tecnologia antes de negociar",
      "Integradores que buscam parceiros técnicos para revenda",
    ],
    relatedCategories: ["Rastreadores", "Plataformas de rastreamento veicular", "Telemetria", "Identificação de motorista"],
  },
  {
    slug: "rastreamento-de-ativos-para-logistica",
    kicker: "PARA OPERAÇÕES DE LOGÍSTICA E CARGA",
    h1: "Rastreamento de ativos para logística",
    intro:
      "Do container ao reboque, encontre fornecedores especializados em rastreamento de ativos e carga: dispositivos com conectividade M2M, sensores de temperatura e porta, e identificação por tag para operações logísticas que não podem perder visibilidade da carga.",
    metaTitle: "Rastreamento de ativos para logística | Hub Brasil",
    metaDescription:
      "Fornecedores validados para rastreamento de ativos e cargas na logística: conectividade M2M, sensores e tags de identificação. Compare tecnicamente e solicite cotação pelo Hub Brasil.",
    audience: [
      "Operadores logísticos e transportadoras de carga",
      "Empresas com ativos móveis de alto valor (reboques, containers, equipamentos)",
      "Times de operação que precisam de rastreabilidade em tempo real",
    ],
    relatedCategories: ["Rastreadores", "Sensores", "Tags e identificação", "Conectividade M2M"],
  },
  {
    slug: "rastreamento-de-equipamentos-de-obra",
    kicker: "PARA CONSTRUÇÃO E LOCAÇÃO DE EQUIPAMENTOS",
    h1: "Rastreamento de equipamentos de obra",
    intro:
      "Proteja e monitore máquinas e equipamentos de obra com fornecedores especializados em rastreamento para o setor de construção: localização, sensores de uso e leitura de dados de equipamentos pesados, mesmo em áreas com conectividade limitada.",
    metaTitle: "Rastreamento de equipamentos de obra | Hub Brasil",
    metaDescription:
      "Compare fornecedores de rastreamento para equipamentos de obra e construção civil: localização, sensores e conectividade de baixa potência. Cotação estruturada pelo Hub Brasil.",
    audience: [
      "Construtoras e empresas de locação de máquinas pesadas",
      "Gestores de pátio que precisam reduzir perda e furto de equipamentos",
      "Empresas que operam em canteiros com cobertura de rede limitada",
    ],
    relatedCategories: ["Rastreadores", "Sensores", "CAN / OBD", "LoRaWAN"],
  },
];

export function findNiche(slug: string): Niche | undefined {
  return niches.find((item) => item.slug === slug);
}
