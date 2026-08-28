# Multi-tenancy, módulos e operação segura

## Decisão de produto

O Hub Brasil passa a operar como **marketplace compartilhado com isolamento lógico multi-tenant**:

- o catálogo público aprovado (fornecedores, produtos e eventos) continua compartilhado para preservar o efeito de rede do marketplace;
- cada cliente e fornecedor possui uma organização;
- dados privados carregam `organization_id` ou, em relações bilaterais, os IDs das duas organizações participantes;
- toda leitura ou alteração privada deve combinar o ID do recurso com a organização da sessão;
- o Gestor Master mantém acesso transversal, protegido por allowlist e segundo fator.

O D1 usa SQLite e não oferece Row Level Security nativo como PostgreSQL. A barreira equivalente adotada é: contexto central de organização, filtros obrigatórios nas APIs, chaves estrangeiras, índices por organização e testes A/B com operações SQL reais.

## Organizações

- `organizations`: tenant lógico.
- `organization_members`: usuários e papéis da organização.
- `leads.organization_id`: perfil pertencente à organização.
- relações privadas usam `organization_id`, `client_organization_id`, `supplier_organization_id`, `actor_organization_id` ou `reporter_organization_id`, conforme o fluxo.

## Catálogo de módulos

O catálogo inicial contém: diretório, cotações, mensagens, avaliações, comunidade, eventos, Hub Créditos, alertas e relatórios. `organization_features` permite ligar ou desligar cada módulo por organização. A API administrativa `/api/admin/features` exige Gestor Master e 2FA.

## Erros e alertas

Relatos do navegador entram na Queue `hub-brasil-errors`. O consumidor grava o incidente em `error_incidents`, registra log estruturado e, quando o secret `ERROR_ALERT_WEBHOOK_URL` estiver configurado, envia alerta externo. Após três tentativas, a mensagem vai para `hub-brasil-errors-dlq`.

## Publicação protegida

O Cloudflare deve observar somente o ramo `production`. Pushes em `main` executam lint, verificação de tipos, testes, build, varredura de segredos, auditoria de dependências e CodeQL. Apenas quando todos passam, o workflow atualiza `production`, liberando o deploy automático.

## Ordem de migração

1. exportar backup completo do D1 remoto;
2. executar `drizzle/0021_organizations_features_errors.sql` no D1 remoto;
3. conferir colunas, backfill, membros e contagens;
4. criar as duas Queues;
5. publicar o código;
6. validar login, cadastro, produtos, eventos, avaliações, cotações, mensagens, feature flags e relato de erro.

## Observação pendente antes da abertura pública

As chaves do Clerk ainda devem ser migradas para uma instância de produção, com domínio verificado e métodos de login reconfigurados. Essa troca deve ocorrer antes da liberação ampla a clientes.
