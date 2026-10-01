# Portal de Solicitações Internas

Mini-projeto full stack desenvolvido em etapas. O monorepositório contém a interface, a API, contratos compartilhados, banco de dados e autenticação por sessão.

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

Abra http://localhost:5173 e entre com `solicitante` ou `atendente` usando a senha correspondente de `apps/api/.env`. A página inicial exige sessão ativa e consulta `GET /api/health` por meio do proxy do Vite. A API também responde diretamente em http://localhost:3000/api/health.

## Autenticação

- `POST /api/auth/login`: recebe `username` e `password`, valida o corpo com Zod e devolve os dados públicos do usuário.
- `GET /api/auth/me`: devolve o usuário da sessão ativa; responde `401` sem sessão válida.
- `POST /api/auth/logout`: revoga a sessão atual e remove o cookie.

O token aleatório fica em cookie `HttpOnly`, `SameSite=Strict`, restrito a `/api`, com validade de oito horas. Apenas seu hash SHA-256 é salvo em `sessions`. Em produção, o cookie também recebe `Secure`, portanto a aplicação deve ser servida por HTTPS. Senhas são verificadas com Argon2id. O `SessionGuard` protege as rotas de categorias e solicitações.

## Categorias

`GET /api/categories` lista as categorias em ordem alfabética para usuários autenticados. Ele retorna `id`, `slug` e `name` conforme o contrato compartilhado em `packages/contracts`.

## Solicitações

`POST /api/requests` cria uma solicitação autenticada com `title`, `description` e `categoryId`. A API valida a categoria, usa o usuário da sessão como solicitante e deixa o banco atribuir o código, a data de abertura e o status inicial `OPEN`. O retorno contém esses dados e responde `201`.

`GET /api/requests` lista as solicitações para usuários autenticados, da mais recente para a mais antiga, com código, título, categoria, solicitante, data de abertura e status.

Filtros opcionais em `GET /api/requests`: `title` (busca parcial sem diferenciar maiúsculas), `categoryId`, `status`, `createdFrom` (início inclusivo) e `createdBefore` (fim exclusivo). As datas usam ISO 8601 em UTC, por exemplo `2026-09-30T00:00:00.000Z`.

`GET /api/requests/:id` mostra os detalhes da solicitação, incluindo descrição e última atualização. Um código inválido responde `400`; uma solicitação inexistente responde `404`.

`PATCH /api/requests/:id/status` recebe `{ "status": "OPEN" | "IN_PROGRESS" | "COMPLETED" }`, exige sessão ativa e devolve os detalhes atualizados. O enunciado não restringe a ordem das mudanças de status.

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
- `apps/api`: NestJS, autenticação, schema e migrations Prisma, seed.
- `packages/contracts`: esquemas Zod e tipos compartilhados.
- `docs`: [dicionário de dados](docs/data-dictionary.md) e documentação técnica adicionada conforme o projeto avança.

O script de criação SQL está na migration inicial. A edição, exclusão e acompanhamento das solicitações entram nos próximos incrementos.

## Histórico de desenvolvimento

Os commits seguem Conventional Commits e representam incrementos verificáveis: `chore(monorepo)` para a fundação, `feat(database)` para o banco e `feat(auth)` para login e sessão. Os próximos marcos usarão `feat(requests)` e `feat(dashboard)` conforme as funcionalidades forem concluídas; correções isoladas usam `fix(...)`.
