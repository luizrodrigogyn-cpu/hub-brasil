# Hub Brasil — Design System oficial

Versão 1.0 · 1º de setembro de 2026 · proposta para aprovação

Este documento é o contrato visual e de experiência do Hub Brasil. Ele foi estruturado no fluxo de prototipagem inspirado pelo OpenDesign, mas não adiciona OpenDesign, bibliotecas, scripts ou dependências ao produto.

## 1. Princípios

1. **Negócio antes de navegação.** A primeira tela responde: “há uma oportunidade que exige minha ação?”
2. **Uma decisão por bloco.** Cada cartão tem um objetivo, uma ação principal e, no máximo, uma ação secundária.
3. **Progressivo, não exaustivo.** Pedir apenas o necessário para começar; explicar por que e quando pedir o restante.
4. **Confiança verificável.** Status, prazos, origem dos dados e critérios de compatibilidade devem ser legíveis.
5. **Premium é clareza.** Hierarquia, espaço e precisão substituem excesso de efeitos ou informação.
6. **Mobile é operação, não versão reduzida.** O fornecedor deve conseguir decidir e responder com uma mão.
7. **Dados honestos.** Sem métricas decorativas, urgência artificial ou promessas não sustentadas.

## 2. Personalidade

Profissional, direto, confiável, nacional e tecnológico. A voz é humana e operacional: “3 oportunidades aguardam resposta”, não “Potencialize sua jornada”. O texto deve antecipar a próxima dúvida sem transformar a interface em manual.

## 3. Cores

| Token | Valor | Uso |
| --- | --- | --- |
| `ink-950` | `#071426` | navegação, fundos institucionais |
| `ink-900` | `#0B1D33` | títulos e painéis escuros |
| `ink-700` | `#30445F` | texto secundário |
| `ink-500` | `#66758A` | legendas e metadados |
| `surface` | `#FFFFFF` | cartões e formulários |
| `canvas` | `#F4F7FB` | fundo de áreas operacionais |
| `line` | `#DDE5EF` | divisores e bordas |
| `brand-700` | `#1458D4` | ação primária e links |
| `brand-600` | `#2167E8` | hover/ênfase de marca |
| `brand-100` | `#EAF1FF` | fundos informativos |
| `cyan-600` | `#0786A8` | compatibilidade e inteligência |
| `green-700` | `#087A55` | sucesso, aprovado e positivo |
| `green-100` | `#E5F6EF` | fundo de sucesso |
| `amber-700` | `#9A6200` | atenção sem erro |
| `amber-100` | `#FFF3D5` | fundo de atenção |
| `red-700` | `#B3293A` | erros e ações destrutivas |

Contraste mínimo: WCAG AA (4,5:1 para texto comum; 3:1 para texto grande e componentes). Cor nunca é o único indicador de estado.

## 4. Tipografia

Fonte primária: `Inter`, quando já disponível; fallback `ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Não carregar fonte externa só para o protótipo.

| Estilo | Desktop | Mobile | Peso | Entrelinha |
| --- | ---: | ---: | ---: | ---: |
| Display | 48 px | 34 px | 720 | 1,05 |
| H1 operacional | 36 px | 28 px | 700 | 1,12 |
| H2 | 26 px | 22 px | 700 | 1,2 |
| H3 | 18 px | 17 px | 680 | 1,3 |
| Corpo | 16 px | 16 px | 400 | 1,55 |
| Corpo compacto | 14 px | 14 px | 450 | 1,45 |
| Legenda | 12 px | 12 px | 600 | 1,4 |
| Eyebrow | 11 px | 11 px | 750 | 1,3; tracking 0,08em |

Números de KPI usam algarismos tabulares. Caixas altas ficam restritas a rótulos curtos.

## 5. Espaçamento, grid e largura

Escala base de 4 px: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80`.

- Conteúdo desktop: máximo `1240px`, 12 colunas, gutter `24px`, margens mínimas `32px`.
- Tablet: 8 colunas, gutter `20px`, margens `24px`.
- Mobile: 4 colunas, gutter `12px`, margens `16px`.
- Seções operacionais: `40–56px` entre blocos no desktop, `32–40px` no mobile.
- Alvos de toque: mínimo `44 × 44px`.

## 6. Radius, borda e elevação

- Controles: `10px`.
- Cartões operacionais: `16px`.
- Painéis protagonistas/modais: `20px`.
- Pills: `999px`.
- Borda padrão: `1px solid #DDE5EF`.
- Sombra baixa: `0 8px 24px rgba(23, 45, 76, .07)`.
- Sombra alta (modal/menu): `0 24px 64px rgba(7, 20, 38, .18)`.

Usar no máximo dois níveis de elevação na mesma tela.

## 7. Botões

### Primário

Fundo `brand-700`, texto branco, altura `44–48px`, padding horizontal `18px`. Um botão primário por área de decisão. Texto começa por verbo: “Ver oportunidade”, “Continuar cadastro”.

### Secundário

Fundo branco, borda `line`, texto `ink-900`. Reservado a ações seguras e reversíveis.

### Terciário

Sem caixa; texto `brand-700`. Para navegação de baixa prioridade.

### Destrutivo

Vermelho somente quando a ação realmente remove ou invalida algo. Exigir confirmação quando não houver recuperação.

Estados obrigatórios: default, hover, focus visível, pressed, loading com rótulo preservado e disabled com motivo próximo.

## 8. Cards

- **Oportunidade:** status + tempo, demanda, local/volume, compatibilidade explicável e uma ação. Nova oportunidade recebe barra lateral de marca, não uma tela inteira colorida.
- **KPI:** rótulo, valor, período/contexto. Clicável somente quando abre uma explicação útil.
- **Para você:** recomendação, benefício e esforço estimado. Máximo de três itens.
- **Perfil público:** logo, nome, localização, categorias, evidências de confiança, resumo e catálogo. Contato protegido deve explicar como é liberado.

Nunca aninhar cartões apenas para decoração.

## 9. Ícones

Ícones lineares, traço `1.75–2px`, tamanhos `16, 20, 24px`. Sempre com rótulo em ações importantes. Emoji não é ícone de interface. O protótipo usa SVGs originais simples, sem pacote externo.

## 10. Formulários e cadastro simplificado

- Label acima do campo; placeholder é exemplo, não label.
- Ajuda e erro abaixo do campo; erro descreve correção.
- Altura mínima `48px`; foco com anel de 3 px.
- Agrupar por tarefa, não por estrutura de banco.
- Primeiro cadastro do fornecedor: empresa, WhatsApp, cidade/UF e categoria principal. O e-mail vem da identidade autenticada.
- Segundo momento: descrição, cobertura, logo, site, categorias adicionais e catálogo.
- Mostrar progresso por significado (“Informações essenciais”, “Sua atuação”), não “Etapa 1 de 9”.
- Salvar progresso quando o comportamento atual suportar isso; nunca prometer autosave sem suporte.

## 11. Estados vazios e feedback

Todo vazio deve conter: o que aconteceu, por que importa e uma próxima ação possível. Exemplo: “Nenhuma oportunidade nova. Complete sua cobertura para melhorar os próximos matches.”

- Sucesso: confirmação específica e próximo passo.
- Erro local: junto ao campo.
- Erro de sistema: mensagem persistente, ação “Tentar novamente” e preservação dos dados digitados.
- Loading: skeleton com geometria parecida com o conteúdo; respeitar `prefers-reduced-motion`.
- Toast não carrega informação crítica nem única.

## 12. Cockpit do fornecedor

Ordem recomendada:

1. saudação curta + status da empresa;
2. oportunidades que exigem ação;
3. quatro KPIs: novas oportunidades, taxa de resposta, interações e Hub Créditos;
4. “Para você” com até três recomendações;
5. progresso do perfil;
6. atalhos e histórico secundário.

Performance detalhada e extrato ficam em páginas próprias. Não repetir a mesma oportunidade em “Para você”, inteligência e feed sem indicar claramente que é o mesmo item.

## 13. Perfil público premium

Acima da dobra: identidade, localização/cobertura, categorias, aprovação/verificação, resumo e CTA de contato. Depois: produtos, diferenciais, eventos e avaliações elegíveis. Critérios de selo e avaliação devem estar acessíveis. O fornecedor sempre vê uma prévia fiel antes de publicar alterações.

## 14. Responsividade

- Desktop: oportunidade em linha; KPIs em quatro colunas.
- Tablet: KPIs 2×2; ações podem quebrar para segunda linha.
- Mobile: uma coluna; CTA principal pode ficar fixo no rodapé apenas durante uma decisão; metadados essenciais antes do CTA.
- Evitar carrossel para conteúdo operacional.
- Nunca esconder funcionalidade crítica apenas por largura.

## 15. Acessibilidade e conteúdo

HTML semântico, ordem de tabulação previsível, foco visível, títulos hierárquicos, mensagens anunciadas por tecnologia assistiva e imagens com texto alternativo adequado. Datas e números em pt-BR. Termos técnicos devem ter explicação curta na primeira ocorrência.

## 16. Governança

Novos padrões entram neste documento antes de virarem exceções repetidas. Mudanças de token exigem verificação em desktop e mobile. Métricas só entram no cockpit quando têm fonte, janela temporal e ação associada.

## 17. Licenças e referências

Nenhum componente, ícone, fonte, ilustração ou código externo foi incorporado ao protótipo desta proposta. A implementação usa HTML, CSS, JavaScript e SVGs próprios. OpenDesign foi usado apenas como referência de fluxo de design e prototipagem; não é dependência nem parte do produto.
