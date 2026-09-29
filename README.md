# Portal de Solicitações Internas

Mini-projeto full stack desenvolvido em etapas. O monorepositório já contém a interface, a API, os contratos compartilhados e a estrutura do banco de dados.

## Pré-requisitos

- Node.js 22.12 ou superior
- pnpm 11.25.0
- PostgreSQL 16 ou Docker Compose para iniciar o banco local

## Desenvolvimento

1. Copie `.env.example` para `.env` na raiz e `apps/api/.env.example` para `apps/api/.env`.
2. Se usar Docker, inicie o banco com `docker compose up -d db`. Ele atende em `127.0.0.1:5433` por padrão, evitando conflito com um PostgreSQL local na porta 5432.
3. Para um PostgreSQL já instalado, crie o banco `portal_solicitacoes`, configure um usuário com permissão para migrations e ajuste `DATABASE_URL` em `apps/api/.env`.
4. Execute, na raiz:

```sh
pnpm install
pnpm --filter @portal/api db:migrate:deploy
pnpm --filter @portal/api db:seed
pnpm dev
```

O seed só funciona fora de `NODE_ENV=production`. Ele prepara as categorias e dois usuários de demonstração de forma repetível: `solicitante` e `atendente`, com as senhas definidas em `apps/api/.env`. Altere as senhas de exemplo antes de compartilhar uma instância acessível a outras pessoas.

Abra http://localhost:5173. A página consulta `GET /api/health` por meio do proxy do Vite. A API também responde diretamente em http://localhost:3000/api/health.

## Verificações

```sh
pnpm build
pnpm typecheck
pnpm lint
pnpm format:check
pnpm --filter @portal/api db:validate
pnpm --filter @portal/api db:status
```

## Estrutura

- `apps/web`: React, Vite, Ant Design, TanStack Query e Zustand.
- `apps/api`: NestJS, schema e migrations Prisma, seed.
- `packages/contracts`: esquemas Zod e tipos compartilhados.
- `docs`: [dicionário de dados](docs/data-dictionary.md) e documentação técnica adicionada conforme o projeto avança.

O script de criação SQL está na migration inicial. Autenticação e funcionalidades de solicitações entram nos próximos marcos.

## Histórico de desenvolvimento

Os commits seguem Conventional Commits e representam incrementos verificáveis. A fundação do monorepositório usa `chore(monorepo)`. Os próximos marcos usarão `feat(database)`, `feat(auth)`, `feat(requests)` e `feat(dashboard)` conforme as funcionalidades forem concluídas; correções isoladas usam `fix(...)`.
