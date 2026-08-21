# Backup e recuperação do banco D1

O Hub Brasil combina duas camadas de proteção:

1. **Time Travel do Cloudflare D1** para recuperação rápida dentro da janela do plano.
2. **Exportação diária em SQL pelo GitHub Actions** para manter cópias portáveis por 90 dias.

## Configuração inicial

No repositório GitHub, abra **Settings → Secrets and variables → Actions** e crie estes segredos:

- `CLOUDFLARE_ACCOUNT_ID`: identificador da conta Cloudflare que possui o banco D1.
- `CLOUDFLARE_API_TOKEN`: token com a menor permissão possível para leitura/exportação do D1 `hub-brasil-db`.

Depois, abra **Actions → Backup diário do D1 → Run workflow**. Confirme que o artefato SQL foi criado antes de depender da agenda automática.

## Aplicar mudanças de banco antes do deploy

As migrações do projeto não são aplicadas automaticamente pelo deploy. Antes de publicar esta versão, execute uma única vez, a partir de uma máquina autenticada na conta Cloudflare:

```bash
npx wrangler d1 execute hub-brasil-db --remote --file=drizzle/0016_founder_slots_and_audit_metadata.sql
```

Em seguida, confirme que a tabela `founder_member_slots` possui exatamente 15 linhas. Essa ordem evita que uma publicação intermediária fique sem o controle de vagas de Membro Fundador.

## Restauração

1. Pare e avalie a causa do incidente.
2. Prefira o Time Travel do D1 para voltar a um horário específico dentro da janela disponível.
3. Para uma cópia histórica, baixe o artefato SQL do GitHub Actions e restaure primeiro em um banco de teste.
4. Só restaure a produção após validação e registre a decisão na auditoria administrativa.

O backup do D1 não inclui imagens de produtos, pois elas vivem no bucket R2 separado. Elas devem ter uma política própria de retenção antes de qualquer exclusão em massa.
