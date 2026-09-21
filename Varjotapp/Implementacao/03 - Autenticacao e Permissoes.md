# Autenticacao e Permissoes

Relacionado: [[00 - Indice de Implementacao]], [[07 - Seguranca e Permissoes]], [[05 - API e Contratos]], [[08 - Usuarios e Settings]]

## O que foi implementado

A autenticacao e a autorizacao ficam em:

- `apps/backend/src/auth/firebase.ts`
- `apps/backend/src/auth/middleware.ts`

O endpoint de sessao fica em:

- `GET /me`

## Fluxo autenticado

1. O backend recebe `Authorization: Bearer ...`.
2. Se `FIREBASE_SERVICE_ACCOUNT_JSON` estiver configurado, o token e validado pelo Firebase Admin.
3. O e-mail autenticado e procurado na tabela `User`.
4. O acesso so segue se o usuario existir e estiver ativo.
5. O backend injeta `req.user` com `id`, `email`, `name`, `role` e `congregationId`.

## Modo desenvolvimento

Quando `FIREBASE_SERVICE_ACCOUNT_JSON` nao esta configurado e o ambiente nao e producao, o backend usa:

- `DEV_AUTH_EMAIL`

Esse fallback permite rodar o app localmente com o admin criado pelo seed.

## Permissoes implementadas

Roles:

- `admin`
- `editor`

Permissoes:

- `admin` e `editor` podem escrever designacoes e gerenciar participantes.
- Apenas `admin` pode gerenciar usuarios e settings.

## Middlewares

- `requireAuth`: exige usuario ativo.
- `requireWrite`: exige role com escrita.
- `requireAdmin`: exige admin.

## Relacoes

- [[08 - Usuarios e Settings]] depende de `requireAdmin`.
- [[06 - Edicao em Lote e Historico]] depende de `requireWrite`.
- [[10 - Pagina Publica e Impressao]] nao usa `User`; usa token anonimo.

