# Migrações aplicadas antes da esteira Sites

As alterações abaixo já estavam presentes no banco de produção antes de a
publicação passar a ser controlada pela esteira Sites. Por isso, os arquivos SQL
correspondentes não devem ser reaplicados:

- `0014_private_conversations`: tabelas e índices de conversas privadas;
- `0015_supplier_website`: coluna `website` em `leads`;
- `0016_founder_slots_and_audit_metadata`: metadados de moderação, vagas de
  membros fundadores e configuração do limite inicial.

O estado final dessas estruturas permanece descrito em `db/schema.ts` e no
snapshot mais recente do Drizzle. A migração `0017` contém somente as colunas
novas ainda ausentes no banco de produção.
