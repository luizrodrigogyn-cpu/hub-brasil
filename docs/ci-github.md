# Proteção de qualidade no GitHub

O workflow **Verificação do Hub Brasil** executa automaticamente em cada envio ou pedido de alteração para a branch `main`:

1. instala as dependências com `npm ci`;
2. rejeita arquivos de configuração do PNPM;
3. executa o lint;
4. compila o site e executa os testes.

## Tornar a verificação obrigatória

No GitHub, abra **Settings → Rules → Rulesets → New branch ruleset** e crie uma regra para `main` com:

- **Require a pull request before merging**;
- **Require status checks to pass**;
- selecione o check **Qualidade**.

Assim, nenhuma mudança chega à branch principal sem a validação automática. A primeira execução só aparecerá depois que estes arquivos forem enviados ao repositório.
