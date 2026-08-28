# Hub Brasil — mapa do sistema, permissões e segurança

Data da revisão: 27/08/2026

> Documento histórico da revisão inicial. Para o estado verificado após as
> implementações e a conferência do painel Cloudflare, consulte
> `docs/auditoria-360-2026-08-28.md`.

Este documento descreve o estado atual do Hub Brasil e o estado-alvo necessário antes de ampliar o teste com clientes. Ele não substitui uma auditoria externa, mas define as regras que o código, o banco e a esteira devem cumprir.

## 1. Mapa do sistema

```text
Visitante / Cliente / Fornecedor / Gestor
                    |
                    v
        Cloudflare (DNS, TLS, WAF, Bot)
                    |
                    v
      Worker hub-brasil + aplicação Vinext/React
          |             |               |
          |             |               +--> R2 (imagens)
          |             +------------------> D1 (dados)
          +--------------------------------> Clerk (identidade e sessão)
```

### Componentes principais

- **Aplicação pública:** mapa, fornecedores, soluções, produtos, eventos e Radar do Setor.
- **Área do cliente:** perfil, favoritos, alertas, cotações, mensagens, avaliações, comunidade e pedidos de exclusão.
- **Área do fornecedor:** perfil empresarial, produtos, eventos, oportunidades, respostas a cotações, mensagens, métricas, créditos e destaques.
- **Gestão:** aprovação e moderação, KPIs, exportação, denúncias, privacidade, créditos e histórico.
- **Identidade:** Clerk valida sessão; o gestor exige e-mail autorizado e segundo fator verificado.
- **Dados:** Cloudflare D1 (SQLite distribuído) e R2 para imagens.
- **Borda:** Cloudflare entrega o domínio e aplica proteções de rede.

## 2. Quem pode fazer o quê

| Ação | Visitante | Cliente autenticado | Fornecedor | Gestor Master |
|---|---:|---:|---:|---:|
| Ver conteúdo público aprovado | Sim, com dados protegidos | Sim | Sim | Sim |
| Ver contato completo de fornecedor | Não | Após ação de revelação | Conforme fluxo | Sim |
| Criar/editar o próprio perfil | Não | Sim | Sim | Pode moderar |
| Solicitar cotação | Não | Sim | Não | Não é o fluxo normal |
| Ver as próprias cotações | Não | Sim | Somente as recebidas pela empresa | Sim via gestão/KPIs |
| Responder cotação | Não | Não | Somente se destinatário | Não é o fluxo normal |
| Criar produto/evento | Não | Não | Empresa aprovada | Pode aprovar/rejeitar |
| Iniciar conversa | Não | Sim | Responde às conversas da própria empresa | Não é o fluxo normal |
| Avaliar fornecedor | Não | Cliente elegível após interação | Não | Modera conteúdo |
| Publicar demanda | Não | Sim | Não | Aprova/rejeita |
| Manifestar interesse em demanda | Não | Não | Fornecedor verificado | Modera |
| Exportar contatos | Não | Não | Não | Sim, com 2FA e auditoria |
| Aprovar, rejeitar ou excluir conteúdo | Não | Não | Não | Sim, com 2FA |

Regra central: identidade, papel, `userId` e empresa devem ser derivados da sessão validada. Nunca confiar em `userId`, `supplierId` ou `tenantId` enviados pelo navegador para definir propriedade.

## 3. Separação de clientes e multi-tenancy

### Estado atual

O Hub Brasil é um **marketplace compartilhado**, não uma aplicação SaaS com vários ambientes empresariais independentes. Não existe coluna `tenant_id` nas tabelas.

O isolamento atual ocorre na aplicação:

- dados de cliente usam o `userId` autenticado pelo Clerk;
- dados de fornecedor usam `leads.id` como `supplierId` e `authUserId` como vínculo do proprietário;
- consultas privadas de mensagens, cotações, produtos e eventos aplicam filtros de propriedade;
- conteúdo público usa apenas registros aprovados e projeções que ocultam dados pessoais.

Isso é uma boa base, mas não constitui isolamento forte de tenant no banco.

### Estado-alvo para o modelo atual

1. Centralizar o acesso privado em funções como `forCurrentClient()`, `forCurrentSupplier()` e `forAdmin()`.
2. Proibir consultas privadas sem filtro de proprietário.
3. Em toda atualização/exclusão, colocar propriedade no próprio `WHERE`, por exemplo `id = ? AND owner_user_id = ?`.
4. Criar testes com usuário A e usuário B comprovando que A nunca lê, altera ou exclui dados de B.
5. Manter chaves estrangeiras, índices compostos e unicidade no banco.

### Se o produto passar a ter empresas com vários usuários

Criar:

- `organizations`;
- `organization_members` (`organization_id`, `user_id`, `role`);
- `organization_id` obrigatório nas tabelas empresariais;
- contexto de organização derivado da sessão/membership, nunca do corpo da requisição;
- índices compostos iniciando por `organization_id`.

Para isolamento físico máximo, considerar um banco D1 por organização. Para RLS SQL nativa, seria necessário migrar os dados privados para PostgreSQL ou outro banco com suporte real a RLS.

## 4. Política de isolamento equivalente à RLS

Cloudflare D1 usa SQLite e não oferece políticas RLS nativas como PostgreSQL. Portanto, não é correto criar uma política SQL chamada “RLS” e considerar o problema resolvido.

Política obrigatória no Hub Brasil:

- **Deny by default:** nenhuma rota privada acessa dados sem sessão válida.
- **Visitante:** somente projeções públicas de registros aprovados.
- **Cliente:** somente linhas cujo `client_user_id`, `user_id` ou `actor_user_id` seja o `userId` da sessão.
- **Fornecedor:** somente linhas cujo `supplier_id` seja o ID da empresa vinculada ao `userId` da sessão.
- **Conversas:** somente se o usuário for o cliente da conversa ou o proprietário do fornecedor participante.
- **Gestor:** somente e-mail autorizado, sessão válida e 2FA confirmado.
- **Identificadores do navegador:** servem apenas para localizar o recurso; a consulta precisa combinar o identificador com a propriedade da sessão.
- **Administração do D1:** disponível somente pelo binding do Worker e credenciais operacionais protegidas.
- **Testes negativos obrigatórios:** A tenta ler/alterar/excluir B e deve receber 403/404, sem diferença que permita enumerar registros.

## 5. Segredos

### Estado atual

- Não foram encontradas chaves reais no código rastreado.
- `.env*` está ignorado pelo Git.
- `CLERK_SECRET_KEY` está cadastrado no Cloudflare como `secret_text`.
- `CLOUDFLARE_API_TOKEN` usado no backup vem de GitHub Actions Secrets.
- A chave pública do Clerk não é secreta.
- A pasta local `.wrangler-auth/` não foi versionada, mas precisa ser adicionada ao `.gitignore` imediatamente.

### Política

- API keys, tokens, senhas, chaves privadas e signing secrets nunca entram em código, `wrangler.jsonc`, commit, log ou captura de erro.
- Produção usa Cloudflare Secrets ou Secrets Store.
- CI usa GitHub Actions Secrets com menor privilégio possível.
- Ambiente local usa `.dev.vars`/`.env`, sempre ignorado.
- Segredos devem ter responsável, finalidade, ambiente, data de criação, rotação e revogação.
- O pipeline deve executar secret scanning e bloquear o commit/deploy quando detectar material sensível.

## 6. Catálogo de funcionalidades e feature flags

### Estado atual

Há módulos funcionais, mas eles estão fortemente concentrados em `app/page.tsx` e em uma rota multipropósito (`/api/roadmap`). Não existe catálogo geral de módulos nem feature flags por cliente. `credit_rules.active` controla regras de crédito, mas não é um sistema geral de feature flags.

### Estado-alvo

Criar um catálogo com:

- `feature_key`;
- nome e descrição;
- público permitido;
- dependências;
- status global;
- status por organização/cliente;
- data e responsável pela alteração.

Módulos sugeridos: diretório, cotação, mensagens, avaliações, comunidade, eventos, Radar, créditos, destaques, alertas e relatórios.

Feature flag nunca substitui autorização: desligar/ligar interface não pode liberar uma API proibida.

## 7. Reportar erro e observabilidade

### Estado atual

- Workers Observability está habilitado.
- Existe denúncia de conteúdo, não relato técnico de erro.
- Não existe `error.tsx`/`global-error.tsx`, Error Boundary global ou botão persistente de “Reportar erro”.
- Não existe fila de erros com captura de contexto.

### Estado-alvo

- Error Boundary global e por áreas críticas.
- Botão “Reportar erro” visível sem ocultar menu.
- Captura de rota, versão do deploy, horário, navegador, papel do usuário, correlation ID e últimos erros técnicos permitidos.
- Captura de tela somente após consentimento explícito, com prévia e possibilidade de remover; nunca capturar senha, código de acesso, token, telefone, CNPJ ou mensagens privadas.
- Fila assíncrona para processar relatos.
- Logs estruturados e redigidos; nunca incluir tokens, cookies, corpos completos ou PII desnecessária.
- Integração com ferramenta de error tracking e alertas por severidade.

## 8. Testes automáticos

### Estado atual

O CI executa lint, typecheck, build e um teste do pacote renderizado. Na revisão atual todos passaram, com avisos de imagens não otimizadas.

O único teste funcional atual confirma textos no bundle; ele não testa autorização, isolamento, banco, APIs nem jornadas.

### Testes obrigatórios

1. Matriz de autorização por rota e método.
2. Isolamento A/B para clientes e fornecedores.
3. Testes de cadastro, cotação, resposta, conversa, aprovação e exclusão.
4. Testes de migração do D1 em banco vazio e banco com dados.
5. Testes de upload malicioso, limites de tamanho e tipos.
6. Testes de rate limit e repetição/idempotência.
7. Testes de cabeçalhos de segurança e redirecionamento HTTPS.
8. Smoke test pós-deploy e alerta/rollback quando falhar.

## 9. Security audit como gate de deploy

### Estado atual

O gate de qualidade existe, mas não inclui um gate específico de segurança.

Adicionar antes do deploy:

- secret scanning;
- auditoria de dependências;
- análise estática/SAST;
- testes de autorização e isolamento;
- verificação de migrações pendentes;
- build e typecheck;
- teste dos cabeçalhos HTTPS/HSTS/CSP;
- inventário de rotas públicas e privadas;
- aprovação manual para migrações destrutivas;
- artefato com resultado da auditoria e versão do deploy.

## 10. WAF, bots e rate limiting

### Estado atual confirmado

- Bot Fight Mode ativo.
- Proteção DDoS da Cloudflare ativa.
- Rate limiting ativo para `POST /api/roadmap`.
- Não existe Turnstile configurado.
- Não há regras dedicadas para todos os formulários e uploads.

### Estado-alvo

- Rate limit separado para cadastro, mensagens, uploads, avaliações, login/callback e cotação.
- Turnstile em ações públicas/abusáveis quando aplicável.
- Limites na aplicação por usuário e na borda por IP.
- Alertas para picos de 401, 403, 429 e 5xx.

## 11. Rotas autenticadas

As rotas privadas mais importantes verificam sessão e propriedade: perfil, mensagens, cotações, comunidade, criação de produtos/eventos, avaliações e administração. As rotas administrativas exigem allowlist de e-mail e 2FA.

O resultado é **parcialmente satisfatório**, porque a segurança está repetida manualmente em várias rotas. Falta uma camada central obrigatória e testes negativos que impeçam regressões.

Rotas públicas por desenho: conteúdo aprovado, fornecedores/produtos com dados protegidos, eventos, notícias, imagens públicas e configuração contendo apenas a chave pública do Clerk.

## 12. Senhas, logins e criptografia de dados

### Senhas

O D1 não armazena senha de usuário. A autenticação atual é administrada pelo Clerk e o fluxo principal é por código. Caso senha seja habilitada no Clerk, hash e proteção permanecem sob responsabilidade do provedor; senha nunca deve ser copiada para o D1. Senhas devem ser **hasheadas**, não criptografadas de forma reversível.

### Quantidade de logins

O sistema não mantém hoje uma trilha própria de logins. Implementar:

- tabela `auth_events` com ID idempotente, `user_id`, tipo, horário, resultado e dados técnicos minimizados;
- ingestão por webhook assinado do provedor de identidade;
- métricas de logins por dia, usuários únicos, falhas, 2FA e sessões ativas;
- alerta de anomalia sem armazenar token, código ou cookie;
- retenção e finalidade documentadas pela LGPD.

### Criptografia

D1 já criptografa automaticamente todos os dados em repouso com AES-256 e protege o tráfego interno/administrativo com TLS. Isso não equivale a criptografia de campo controlada pelo aplicativo.

Dados pessoais como telefone, e-mail, endereço e CNPJ ainda são colunas legíveis pela aplicação/gestor. Se houver requisito de criptografia de campo:

1. usar Web Crypto com criptografia autenticada;
2. manter a chave mestra somente em Cloudflare Secret/Secrets Store;
3. gravar versão da chave, nonce e ciphertext;
4. usar índice cego/HMAC separado para buscas de igualdade e unicidade;
5. implementar rotação, backup e recuperação antes da migração;
6. nunca criptografar sem plano de busca, suporte, exportação LGPD e recuperação de chave.

## 13. HTTPS, TLS e HSTS

### Estado atual confirmado

- HTTPS responde corretamente.
- Cloudflare está em modo **Full**, não **Full (strict)**.
- HTTP responde conteúdo sem redirecionar obrigatoriamente para HTTPS.
- O cabeçalho `Strict-Transport-Security` não está presente.
- Há `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy`.
- CSP ainda não está ativa.

### Estado-alvo

1. Certificado válido no caminho Cloudflare-origem.
2. Alterar para Full (strict).
3. Ativar Always Use HTTPS.
4. Validar todos os subdomínios.
5. Só então ativar HSTS gradualmente; `includeSubDomains` e preload exigem revisão de todos os subdomínios antes de ligar.
6. Preparar CSP em modo report-only e ativar após validar Clerk, imagens e scripts.

## 14. Prioridades

### P0 — antes de ampliar o piloto

1. Migrar Clerk para produção e testar login/código/2FA.
2. Full (strict), redirecionamento HTTPS e implantação segura de HSTS.
3. Adicionar `.wrangler-auth/` ao `.gitignore` e ativar secret scanning.
4. Criar testes de autorização e isolamento A/B.

### P1 — segurança operacional

1. Centralizar escopo de dados por usuário/fornecedor.
2. Error Boundary, botão de relato, fila e alertas.
3. Security gate no CI.
4. Métricas/auditoria de login.
5. Rate limits específicos e Turnstile onde necessário.

### P2 — evolução arquitetural

1. Catálogo de módulos e feature flags.
2. Organizações/`tenant_id` se o produto passar a suportar equipes empresariais.
3. Criptografia de campo para PII caso o modelo de risco/compliance exija proteção além da criptografia automática do D1.
