# Usuarios e Settings

Relacionado: [[00 - Indice de Implementacao]], [[07 - Seguranca e Permissoes]], [[03 - Autenticacao e Permissoes]], [[02 - Banco de Dados e Seed]]

## O que foi implementado

Backend:

- `apps/backend/src/modules/users.ts`
- `apps/backend/src/modules/settings.ts`

Frontend:

- `apps/frontend/src/pages/UsersPage.tsx`
- `apps/frontend/src/pages/SettingsPage.tsx`

## Usuarios

Endpoints admin:

- `GET /users`
- `POST /users`
- `PUT /users/:id`

Campos:

- `email`
- `name`
- `role`
- `active`

Roles suportados:

- `admin`
- `editor`

## Settings

Endpoints admin:

- `GET /settings`
- `PUT /settings`
- `POST /settings/anonymous-token/regenerate`
- `POST /settings/script-api-key/regenerate`

Campos editaveis:

- Nome da congregacao.
- Timezone.
- Dia padrao de meio de semana.
- Dia padrao de fim de semana.

## Segredos

A regeneracao retorna o valor puro somente na resposta da requisicao:

- Token anonimo.
- API key tecnica.

No banco, ficam apenas hashes.

## Relacoes

- [[03 - Autenticacao e Permissoes]] usa usuarios ativos para autorizar acesso.
- [[04 - Importacao de Semanas]] usa API key tecnica.
- [[10 - Pagina Publica e Impressao]] usa token anonimo.

