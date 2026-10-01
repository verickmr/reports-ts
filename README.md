# Portal de Solicitações Internas

Mini-projeto full stack desenvolvido em etapas. O monorepositório contém interface React, API NestJS, contratos Zod compartilhados, PostgreSQL e autenticação por sessão.

## Pré-requisitos

- Node.js 22.12 ou superior e pnpm 11.25.0. Caso o pnpm não esteja instalado, instale-o com `npm install --global pnpm@11.25.0` e confirme com `pnpm --version`.
- PostgreSQL 16 ou Docker com Compose para iniciar o banco local.
- Para publicar o build da interface, um servidor estático com proxy reverso e HTTPS, como Nginx.

## Instalação e configuração local

Execute os comandos na raiz do repositório. No PowerShell, crie os arquivos de ambiente e instale as dependências:

```powershell
Copy-Item .env.example .env
Copy-Item apps/api/.env.example apps/api/.env
pnpm install --frozen-lockfile
```

Configure as variáveis antes de iniciar o banco ou a API:

| Arquivo         | Variável                  | Uso e valor de exemplo                                                                                                       |
| --------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `.env`          | `POSTGRES_PASSWORD`       | Senha do usuário `portal` no Compose; exemplo local: `portal_dev_2026`.                                                      |
| `.env`          | `POSTGRES_PORT`           | Porta local do PostgreSQL; padrão `5433`.                                                                                    |
| `apps/api/.env` | `DATABASE_URL`            | Conexão da API e do Prisma; exemplo: `postgresql://portal:portal_dev_2026@127.0.0.1:5433/portal_solicitacoes?schema=public`. |
| `apps/api/.env` | `DEMO_REQUESTER_PASSWORD` | Senha usada pelo seed para `solicitante`; exemplo: `solicitante_demo_2026`.                                                  |
| `apps/api/.env` | `DEMO_AGENT_PASSWORD`     | Senha usada pelo seed para `atendente`; exemplo: `atendente_demo_2026`.                                                      |

Se trocar `POSTGRES_PASSWORD` ou `POSTGRES_PORT`, atualize `DATABASE_URL` com os mesmos dados. Não versione os arquivos `.env`. A API usa a porta `3000` por padrão; a variável de ambiente `PORT` permite alterá-la, mas o proxy de desenvolvimento em `apps/web/vite.config.ts` aponta para `3000`.

Com Docker, inicie somente o PostgreSQL:

```powershell
docker compose up -d --wait db
```

O banco atende em `127.0.0.1:5433` por padrão, evitando conflito com um PostgreSQL local na porta 5432. Se preferir uma instalação própria de PostgreSQL 16, crie o banco `portal_solicitacoes`, configure um usuário com permissão para executar as migrations e ajuste `DATABASE_URL`; nesse caso, não execute o Compose.

Crie as tabelas pelas migrations SQL do Prisma e carregue categorias e usuários de demonstração:

```powershell
pnpm --filter @portal/api db:migrate:deploy
pnpm --filter @portal/api db:seed
```

O seed é repetível e não pode ser executado com `NODE_ENV=production`. Para iniciar API e interface juntas, rode:

```powershell
pnpm dev
```

O Turborepo compila os contratos compartilhados antes de iniciar os dois serviços. Se quiser acompanhar cada processo separadamente, compile os contratos uma vez:

```powershell
pnpm --filter @portal/contracts build
```

Depois, inicie a API em um terminal:

```powershell
pnpm --filter @portal/api dev
```

Em outro terminal, inicie a interface:

```powershell
pnpm --filter @portal/web dev
```

Abra http://localhost:5173. A interface envia `/api` ao backend pela configuração de proxy do Vite; a API também responde diretamente em http://localhost:3000/api/health. Para encerrar o banco local iniciado pelo Compose, use `docker compose down` (sem `-v`, para preservar os dados).

## Acesso de demonstração

| Usuário       | Papel cadastrado | Senha no `.env.example` |
| ------------- | ---------------- | ----------------------- |
| `solicitante` | Solicitante      | `solicitante_demo_2026` |
| `atendente`   | Atendente        | `atendente_demo_2026`   |

Use as senhas efetivas de `apps/api/.env` se tiver alterado os exemplos. O seed atualiza as senhas desses dois usuários quando executado novamente. O campo de papel está persistido, mas ainda não restringe ações: ambos têm as mesmas operações de solicitações. Troque as senhas de exemplo antes de compartilhar uma instância acessível a outras pessoas.

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

`PUT /api/requests/:id` recebe título, descrição e categoria completos. A alteração é permitida apenas enquanto a solicitação está `OPEN`; responde `409` quando já está em atendimento ou concluída.

`DELETE /api/requests/:id` exclui a solicitação apenas se ainda estiver `OPEN` e responde `204`. Para uma solicitação em atendimento ou concluída, responde `409`.

`GET /api/requests/summary` exige sessão ativa e retorna o total de solicitações e a contagem por status (`OPEN`, `IN_PROGRESS`, `COMPLETED`), incluindo zeros quando não há registros.

## Build e deploy de avaliação

No servidor, instale as dependências, configure PostgreSQL e `apps/api/.env` como acima e aplique as migrations. O build gera `apps/api/dist` e `apps/web/dist`:

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @portal/api db:migrate:deploy
```

Se o ambiente de avaliação precisar dos dois usuários de teste, defina senhas próprias em `apps/api/.env` e execute `pnpm --filter @portal/api db:seed` **antes** de ativar `NODE_ENV=production`. Não rode esse seed em um banco corporativo com usuários reais.

Inicie a API como um processo supervisionado, com `DATABASE_URL` configurada. Para uma execução manual no PowerShell:

```powershell
$env:NODE_ENV = 'production'
$env:PORT = '3000'
pnpm --filter @portal/api start
```

Sirva `apps/web/dist` por HTTPS e encaminhe `/api/` à API na mesma origem. Exemplo de bloco Nginx; substitua somente o domínio, os caminhos do certificado e o diretório onde copiou o build:

```nginx
server {
    listen 443 ssl;
    server_name portal.example.com;
    ssl_certificate /etc/letsencrypt/live/portal.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portal.example.com/privkey.pem;

    root /srv/portal-solicitacoes/apps/web/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Abra `https://portal.example.com` e entre com um usuário criado pelo seed. Mantenha a porta `3000` restrita ao proxy. O cookie de sessão recebe `Secure` quando a API roda com `NODE_ENV=production`, portanto o acesso pelo navegador precisa ser HTTPS. O Compose incluído no repositório executa apenas o PostgreSQL; a API e o servidor estático precisam ser mantidos pelo gerenciador de processos do ambiente escolhido. O login Google não está implementado e não exige configuração para esta entrega.

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
- `docs`: [dicionário de dados](docs/data-dictionary.md) e [Memorial Técnico de Desenvolvimento](docs/memorial-tecnico-de-desenvolvimento.md).

O script de criação SQL está na migration inicial.

## Histórico de desenvolvimento

Os commits seguem Conventional Commits e representam incrementos verificáveis: `chore(monorepo)` para a fundação, `feat(database)` para o banco, `feat(auth)` para login e sessão, `feat(requests)` para solicitações e `feat(dashboard)` para indicadores. Correções isoladas usam `fix(...)`.
