# Hub Brasil

Marketplace gratuito para descoberta de fornecedores, produtos, eventos e
conteúdo do mercado de rastreamento veicular.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

## Produção

O projeto é publicado como um Cloudflare Worker. As configurações de produção
ficam em `wrangler.jsonc`:

- D1: binding `DB`
- R2: binding `PRODUCT_IMAGES`
- autenticação: Clerk por código de e-mail

Antes do primeiro deploy, configure no Worker:

- `CLERK_PUBLISHABLE_KEY` (variável normal)
- `CLERK_SECRET_KEY` (segredo)
- `CLERK_AUTHORIZED_PARTIES=https://hub.niviontech.com.br`
- `ADMIN_EMAILS` (e-mails dos gestores, separados por vírgula)

Nunca inclua a chave secreta do Clerk em arquivos versionados.

## Autenticação

O login é feito pelo Clerk com código enviado por e-mail. A compatibilidade com
as rotas internas existentes foi mantida em `app/chatgpt-auth.ts`; apesar do
nome histórico do arquivo, ele usa somente a identidade do Clerk.

O painel `/admin` exige duas barreiras:

- e-mail do usuário presente em `ADMIN_EMAILS`;
- segundo fator, quando disponível no Clerk; e proteção adicional do Cloudflare
  Access a ser vinculada ao Worker publicado.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes
- `npm run deploy`: gerar o Worker e publicar na Cloudflare

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
