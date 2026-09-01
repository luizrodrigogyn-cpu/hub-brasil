# Experiência do fornecedor — baseline do Bloco A

Data da auditoria: 1º de setembro de 2026.

## Objetivo desta linha de base

Registrar o funcionamento anterior ao redesign das fases 1–3 sem alterar dados, IDs, permissões ou contratos existentes. O Bloco A reutiliza a estrutura atual e não exige migração de banco.

## Fluxos atuais preservados

| Fluxo | Comportamento e proteção reutilizados |
| --- | --- |
| Login | Clerk por código de e-mail; a API resolve a identidade no servidor. |
| Cadastro | `POST /api/leads`; um perfil por usuário autenticado, com atualização retrocompatível pelo `authUserId`. |
| Aprovação | Fornecedor nasce com status `pending`; publicação pública continua condicionada à curadoria existente. |
| Perfil e edição | `GET /api/roadmap` e `PATCH /api/leads`; edição limitada ao fornecedor e à organização autenticada. |
| Produtos | `/api/products` e `/api/product-images`; vínculo pelo ID do fornecedor e isolamento por organização. |
| Oportunidades/cotações | `/api/roadmap` e `/api/match`; controles de papel, propriedade e destinatário existentes são mantidos. |
| Mensagens | `/api/messages`; somente participantes autorizados acessam cada conversa. |
| Avaliações | `/api/ratings`; associação pelo ID do fornecedor. |
| Hub Créditos | Regras atuais em `app/hub-credits.ts`; sem alteração neste bloco. |
| Métricas | `GET /api/roadmap`; métricas existentes permanecem disponíveis no painel. |
| Logo | `/api/supplier-logo`; upload opcional, validação de arquivo e autorização de uso preservadas. |

## Componentes do fornecedor em `app/page.tsx`

- entrada “Para fornecedores” e CTAs equivalentes;
- seletor de perfil e formulário de cadastro;
- painel do fornecedor e aviso de aprovação;
- edição da empresa;
- cadastro e catálogo de produtos;
- cadastro de eventos;
- oportunidades, mensagens, métricas e Hub Créditos;
- prévia do perfil e logo no diretório/mapa.

## Alterações permitidas no Bloco A

- nova landing curta para fornecedores;
- redução dos campos exigidos no primeiro cadastro;
- preenchimento progressivo posterior pela edição existente;
- nova confirmação pós-cadastro, fiel ao status real de aprovação.

## Invariantes de segurança e compatibilidade

- nenhum registro, ID ou coluna existente será removido ou recriado;
- cadastros antigos continuam válidos mesmo sem campos novos;
- APIs protegidas continuam validando identidade, papel, organização e propriedade no servidor;
- o status `pending` continua impedindo publicação pública antes da curadoria;
- nenhum dado de outro fornecedor será exposto pelo redesign;
- desktop e mobile continuam suportados.
