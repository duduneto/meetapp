# Fundacao do Monorepo

Relacionado: [[00 - Indice de Implementacao]], [[03 - Arquitetura Tecnica]], [[08 - Plano de Implementacao]]

## O que foi implementado

Foi criada uma estrutura de monorepo com workspaces npm:

- `apps/backend`: API Express em TypeScript.
- `apps/frontend`: app React em TypeScript com Vite.
- `docker-compose.yml`: Postgres local.
- `package.json`: scripts compartilhados para dev, build, typecheck e seed.
- `README.md`: setup local.

## Backend

O backend fica em `apps/backend` e usa:

- Express.
- Prisma Client.
- Firebase Admin SDK.
- Zod para validacao de payloads.
- Dotenv para configuracao local.

Entrada principal:

- `apps/backend/src/server.ts`

Modulos conectados no servidor:

- [[03 - Autenticacao e Permissoes]]
- [[04 - Importacao de Semanas]]
- [[05 - Navegacao e Tabelas de Designacoes]]
- [[07 - Participantes]]
- [[08 - Usuarios e Settings]]
- [[09 - BI Simples]]
- [[10 - Pagina Publica e Impressao]]

## Frontend

O frontend fica em `apps/frontend` e usa:

- React.
- React Router.
- Vite.
- Lucide React para icones.
- CSS customizado em `apps/frontend/src/styles.css`.

Entrada principal:

- `apps/frontend/src/main.tsx`

Layout principal:

- `apps/frontend/src/components/AppShell.tsx`

## Observacao

O plano citava shadcn como base visual. A implementacao inicial criou componentes proprios com CSS customizado e lucide icons, mantendo a UI em portugues e responsiva. Uma futura iteracao pode introduzir shadcn sem mudar os contratos de backend.

