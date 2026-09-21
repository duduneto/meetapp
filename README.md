# Varjotapp

Sistema web para gerenciar designacoes congregacionais.

## Setup local

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

O seed cria o usuario `admin@varjotapp.local` e imprime o token publico e a API key tecnica iniciais. Em desenvolvimento, se `FIREBASE_SERVICE_ACCOUNT_JSON` nao estiver configurado, o backend usa `DEV_AUTH_EMAIL`.

## Importar uma reuniao de meio de semana

O backend aceita o JSON legado pelo endpoint autenticado:

```bash
curl --request POST http://localhost:3333/script/import-midweek \
  --header "Content-Type: application/json" \
  --header "x-api-key: SUA_API_KEY_TECNICA" \
  --data-binary @apps/jw_scrapper/example-payload.json
```

A API key tecnica e criada pelo seed ou pode ser regenerada em Settings. A importacao cria a semana, as reunioes de meio e fim de semana e todas as partes designaveis. Uma `ref` ja importada retorna HTTP `409` e nao altera designacoes existentes.

Para importar diretamente da pagina da apostila no WOL, execute `apps/jw_scrapper/script.js` no console do navegador. O script solicita a URL da API e a API key, extrai a reuniao atual e envia o mesmo `POST`. O backend deve incluir a origem do WOL em `SCRIPT_IMPORT_ORIGINS`.

## Scripts

- `npm run dev`: sobe backend e frontend.
- `npm run build --workspaces`: compila backend e frontend.
- `npm run typecheck --workspaces`: checa TypeScript.
- `npm test`: testa a normalizacao do payload de importacao.
- `npm run seed`: cria congregacao, settings, admin e participantes iniciais.
