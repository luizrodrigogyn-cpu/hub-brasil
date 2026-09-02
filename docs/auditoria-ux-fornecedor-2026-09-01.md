# Auditoria visual e UX — jornada do fornecedor

Data: 1º de setembro de 2026  
Escopo: código atual em `app/page.tsx`, `app/sign-up/page.tsx` e `app/globals.css`; sem alterar dados, contratos ou comportamento de produção.

## Resumo executivo

A experiência atual já possui uma base comercial madura: landing dedicada, cadastro com promessa de dois minutos, cockpit, oportunidades ordenadas por compatibilidade, “Para você”, Hub Créditos e progresso de perfil. O principal problema deixou de ser ausência de recursos e passou a ser **competição entre recursos**. O cockpit repete sinais semelhantes em KPIs, prioridades, inteligência e feed, fazendo a oportunidade perder protagonismo. O cadastro inicial ainda herda o padrão visual e a densidade de um modal genérico.

## O que preservar

- Separação explícita entre fornecedor e usuário.
- Status de cadastro em análise e curadoria antes da publicação.
- Compatibilidade acompanhada por contexto, sem promessa opaca.
- No máximo quatro KPIs no cockpit atual.
- Bloco “Para você” limitado a três prioridades.
- Progresso de perfil e proposta de preenchimento progressivo.
- Estados vazios e skeleton já presentes.
- Modo de visualização do fornecedor para a gestão.

## Achados priorizados

### P0 — Oportunidade é importante, mas aparece tarde

Depois do hero, o usuário encontra banner, quatro KPIs, progresso do perfil, “Para você” e inteligência antes do feed completo. Quando há uma demanda nova, a tarefa de maior valor fica abaixo de vários blocos auxiliares.

**Recomendação:** exibir as oportunidades que aguardam ação imediatamente após a saudação; mover KPIs e recomendações para depois. O hero deve ter um único CTA contextual.

### P0 — A mesma demanda pode competir consigo mesma

A primeira oportunidade pendente pode aparecer no hero, em “Para você”, em “Inteligência comercial” e novamente no feed. Isso aumenta volume visual sem criar informação nova.

**Recomendação:** uma oportunidade tem uma representação canônica. Recomendações podem referenciá-la com linguagem de apoio, sem recriar outro cartão completo.

### P1 — Cadastro visualmente genérico e potencialmente denso

A entrada promete cadastro essencial, mas o formulário reutiliza um modal escuro genérico. A arquitetura do componente comporta diversos campos, consentimentos e seletores. Em mobile, o modal ocupa quase toda a tela e a relação entre “começar” e “completar depois” fica fraca.

**Recomendação:** fluxo dedicado de duas etapas curtas: identidade essencial e atuação. Explicitar o que fica para depois. Manter contratos atuais; o protótipo não envia dados.

### P1 — Hierarquia cromática muito uniforme

Grande parte do cockpit usa fundo azul-escuro e bordas de intensidade semelhante. Cards de KPI, prioridades e oportunidades têm pesos próximos, tornando a leitura cansativa.

**Recomendação:** canvas claro para operação diária, navegação institucional escura e uma superfície branca predominante. Reservar azul intenso para ação e oportunidade nova.

### P1 — Mobile transforma KPIs em uma lista longa

Na regra atual abaixo de 600 px, os quatro KPIs viram uma coluna. Antes de chegar ao conteúdo comercial, o usuário percorre quatro cards grandes.

**Recomendação:** grade 2×2 no mobile, valores compactos e explicações curtas; detalhes ficam acessíveis por páginas específicas.

### P2 — Atalhos ficam depois de uma página extensa

Performance, créditos, produto e evento ficam no final do cockpit. São úteis, porém distantes.

**Recomendação:** navegação lateral no desktop e barra superior/rolável no mobile. Atalhos de criação continuam secundários à resposta de oportunidades.

### P2 — Perfil público e edição não formam um ciclo explícito

O fornecedor pode editar empresa e visitar o perfil, mas a interface não apresenta permanentemente a prévia pública como consequência do preenchimento.

**Recomendação:** bloco “Seu perfil público” com completude, prévia e próximo campo de maior impacto.

### P2 — Cópia pode ser mais operacional

Expressões como “O Hub trabalhando por você” são positivas, porém menos específicas que o dado mostrado.

**Recomendação:** título orientado ao resultado: “Como melhorar seus próximos matches” ou “Ações para gerar mais contatos”.

## Fluxo proposto

`Entrada do fornecedor → autenticação existente → cadastro essencial em 2 passos → confirmação de análise → cockpit → oportunidade → resposta`

O preenchimento avançado acontece a partir do cockpit:

`Cockpit → próxima melhoria de perfil → prévia pública → envio para curadoria existente`

## Critérios para aprovação do protótipo

- Uma nova oportunidade é identificável em menos de cinco segundos.
- O usuário entende os quatro KPIs sem abrir ajuda.
- Cadastro inicial contém somente dados essenciais e explica o que vem depois.
- Nenhuma tela depende de hover.
- Fluxos principais funcionam a 360 px sem rolagem horizontal.
- Nenhuma ação do protótipo chama APIs ou grava dados.

## Limites desta entrega

Esta auditoria não valida dados reais nem testa uma sessão autenticada em produção. O servidor local do app principal não iniciou com a versão de runtime instalada porque a data de compatibilidade do projeto é posterior à suportada pelo binário local. Por isso, a análise visual do estado atual foi feita a partir da estrutura renderizável e das regras responsivas do código, e a validação visual foi concentrada no protótipo estático isolado.
