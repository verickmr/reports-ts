# Dicionário de dados

O banco usa PostgreSQL 16. A migration inicial está em `apps/api/prisma/migrations/20260929160000_initial/migration.sql`. Datas são armazenadas com fuso (`TIMESTAMPTZ`) em UTC; a interface apresenta datas no fuso local do navegador e converte os dias filtrados em limites ISO enviados à API.

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

O login Google usa o `sub` da identidade verificada como identificador estável. No primeiro acesso, cria um usuário `REQUESTER` com nome de exibição baseado no e-mail verificado e senha aleatória inacessível ao usuário; nos acessos seguintes, reutiliza a mesma conta. Um e-mail igual ao de uma conta local não vincula as contas automaticamente. O vínculo explícito (`LINK`) permanece reservado no esquema, sem rota ativa.

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

As duas chaves estrangeiras restringem a exclusão de usuários e categorias com solicitações. Índices apoiam a listagem por solicitante, status e categoria, cada um combinado com a data de abertura. A API valida os três valores de status permitidos; o enunciado não define uma ordem obrigatória de transição.

## `sessions`

| Coluna       | Tipo           | Regra                                                                   |
| ------------ | -------------- | ----------------------------------------------------------------------- |
| `id`         | UUID           | Chave primária; gerada pela aplicação.                                  |
| `token_hash` | CHAR(64)       | Hash único do token de sessão.                                          |
| `user_id`    | UUID           | Chave estrangeira para `users.id`; sessões são removidas com o usuário. |
| `expires_at` | TIMESTAMPTZ(3) | Limite de validade da sessão.                                           |
| `created_at` | TIMESTAMPTZ(3) | Data de criação.                                                        |

Índices em `user_id` e `expires_at` apoiam consulta e limpeza de sessões. O token em texto não é persistido no banco; `token_hash` guarda seu SHA-256. A API rejeita sessões após `expires_at` e remove a sessão no logout.

## `google_auth_attempts`

| Coluna          | Tipo                | Regra                                                         |
| --------------- | ------------------- | ------------------------------------------------------------- |
| `state_hash`    | CHAR(64)            | Chave primária; hash do `state` enviado ao Google.            |
| `purpose`       | `GoogleAuthPurpose` | `LINK` vincula uma conta; `LOGIN` inicia uma sessão.          |
| `session_id`    | UUID                | Sessão existente obrigatória para `LINK`; nula para `LOGIN`.  |
| `code_verifier` | VARCHAR(128)        | Verificador PKCE temporário, usado apenas na troca do código. |
| `nonce`         | VARCHAR(64)         | Valor aleatório usado na validação da resposta de identidade. |
| `expires_at`    | TIMESTAMPTZ(3)      | Prazo curto da tentativa, validado na API.                    |
| `created_at`    | TIMESTAMPTZ(3)      | Data de criação.                                              |

Uma tentativa de vínculo depende da sessão local e é removida se essa sessão for encerrada. A migração impede `LINK` sem sessão e `LOGIN` com sessão. O retorno do Google consome tentativas `LOGIN` uma única vez e rejeita tentativas expiradas. Ao iniciar um novo login Google, a API remove tentativas expiradas de qualquer finalidade e preserva as ativas; o fluxo `LINK` ainda não está disponível.
