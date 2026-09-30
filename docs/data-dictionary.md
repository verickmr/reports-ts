# Dicionário de dados

O banco usa PostgreSQL 16. A migration inicial está em `apps/api/prisma/migrations/20260929160000_initial/migration.sql`. Datas são armazenadas com fuso (`TIMESTAMPTZ`) em UTC; a interface apresentará e filtrará os dias em `America/Sao_Paulo`.

## `users`

| Coluna          | Tipo           | Regra                                                  |
| --------------- | -------------- | ------------------------------------------------------ |
| `id`            | UUID           | Chave primária; gerada pela aplicação.                 |
| `username`      | VARCHAR(80)    | Obrigatório e único; usado no login.                   |
| `name`          | VARCHAR(120)   | Nome de exibição obrigatório.                          |
| `password_hash` | VARCHAR(255)   | Hash Argon2id; nunca armazena a senha em texto.        |
| `google_sub`    | VARCHAR(255)   | Opcional e único; identifica a conta Google vinculada. |
| `role`          | `UserRole`     | `REQUESTER` ou `AGENT`; padrão `REQUESTER`.            |
| `created_at`    | TIMESTAMPTZ(3) | Preenchido ao criar o usuário.                         |

O vínculo com Google usa o `sub` da identidade verificada. Ele só poderá ser associado a um usuário já cadastrado; não haverá criação automática de contas por este fluxo.

## `categories`

| Coluna | Tipo        | Regra                                                   |
| ------ | ----------- | ------------------------------------------------------- |
| `id`   | SERIAL      | Chave primária.                                         |
| `slug` | VARCHAR(40) | Obrigatório e único; identificador estável para o seed. |
| `name` | VARCHAR(80) | Nome exibido na interface.                              |

O seed cria TI, RH, Compras, Financeiro e Infraestrutura.

## `requests`

| Coluna         | Tipo            | Regra                                                          |
| -------------- | --------------- | -------------------------------------------------------------- |
| `id`           | SERIAL          | Chave primária e código público da solicitação.                |
| `title`        | VARCHAR(150)    | Título obrigatório.                                            |
| `description`  | TEXT            | Descrição obrigatória.                                         |
| `status`       | `RequestStatus` | `OPEN`, `IN_PROGRESS` ou `COMPLETED`; padrão `OPEN`.           |
| `category_id`  | INTEGER         | Categoria obrigatória; chave estrangeira para `categories.id`. |
| `requester_id` | UUID            | Solicitante obrigatório; chave estrangeira para `users.id`.    |
| `created_at`   | TIMESTAMPTZ(3)  | Data de abertura.                                              |
| `updated_at`   | TIMESTAMPTZ(3)  | Atualizada pelo Prisma em alterações.                          |

As duas chaves estrangeiras restringem a exclusão de usuários e categorias com solicitações. Índices apoiam a listagem por solicitante, status e categoria, cada um combinado com a data de abertura. A regra de transição de status será aplicada na API, não pelo enum do banco.

## `sessions`

| Coluna       | Tipo           | Regra                                                                   |
| ------------ | -------------- | ----------------------------------------------------------------------- |
| `id`         | UUID           | Chave primária; gerada pela aplicação.                                  |
| `token_hash` | CHAR(64)       | Hash único do token de sessão.                                          |
| `user_id`    | UUID           | Chave estrangeira para `users.id`; sessões são removidas com o usuário. |
| `expires_at` | TIMESTAMPTZ(3) | Limite de validade da sessão.                                           |
| `created_at` | TIMESTAMPTZ(3) | Data de criação.                                                        |

Índices em `user_id` e `expires_at` apoiam consulta e limpeza de sessões. O token em texto não é persistido no banco; `token_hash` guarda seu SHA-256. A API rejeita sessões após `expires_at` e remove a sessão no logout.
