# Setup Local e Validacao

Relacionado: [[00 - Indice de Implementacao]], [[01 - Fundacao do Monorepo]], [[02 - Banco de Dados e Seed]]

## Setup local

Arquivos principais:

- `README.md`
- `apps/backend/.env.example`
- `apps/frontend/.env.example`
- `docker-compose.yml`

Comandos:

```bash
npm install
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
docker compose up -d postgres
npm run prisma:generate --workspace apps/backend
npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma
npm run seed
npm run dev
```

## Portas

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3333`
- Postgres local: `localhost:5433`

O Postgres foi mapeado para `5433` para evitar conflito com bancos locais que ja usam `5432`.

## Validacoes realizadas

Foram executadas:

```bash
npm run typecheck --workspaces
npm run build --workspaces
npx prisma migrate deploy
npm run seed
```

Tambem foi validado no navegador:

- Tela autenticada de designacoes.
- Importacao de semana de exemplo.
- Tabela de meio de semana.
- Link publico direto em modo leitura.

## Observacoes operacionais

- Em desenvolvimento, a autenticacao usa `DEV_AUTH_EMAIL` se o Firebase Admin nao estiver configurado.
- O seed imprime token publico e API key tecnica no momento da execucao.
- `node_modules` e `dist` sao artefatos locais e nao fazem parte do design da feature.

