# Portal de Solicitações Internas

Mini-projeto full stack desenvolvido em etapas. O primeiro marco estabelece o monorepositório e valida a comunicação entre frontend e API.

## Pré-requisitos

- Node.js 22.12 ou superior
- pnpm 11.25.0

## Desenvolvimento

```sh
pnpm install
pnpm dev
```

Abra http://localhost:5173. A página consulta `GET /api/health` por meio do proxy do Vite. A API também responde diretamente em http://localhost:3000/api/health.

## Verificações

```sh
pnpm build
pnpm typecheck
pnpm lint
pnpm format:check
```

## Estrutura

- `apps/web`: React, Vite, Ant Design, TanStack Query e Zustand.
- `apps/api`: NestJS.
- `packages/contracts`: esquemas Zod e tipos compartilhados.
- `docs`: documentação técnica, adicionada conforme o projeto avança.

O banco de dados, a autenticação e as funcionalidades de solicitações entram nos próximos marcos.

## Histórico de desenvolvimento

Os commits seguem Conventional Commits e representam incrementos verificáveis. A fundação do monorepositório usa `chore(monorepo)`. Os próximos marcos usarão `feat(database)`, `feat(auth)`, `feat(requests)` e `feat(dashboard)` conforme as funcionalidades forem concluídas; correções isoladas usam `fix(...)`.
