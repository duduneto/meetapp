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

O seed cria o usuario administrativo e imprime o token publico e a API key tecnica iniciais. Em desenvolvimento, se `FIREBASE_SERVICE_ACCOUNT_JSON` nao estiver configurado, o backend usa `DEV_AUTH_EMAIL`; esse usuario tambem precisa ter `role=admin`.

## Login administrativo com Google

O frontend usa Firebase Authentication no projeto `ze-cong`. Configure as variaveis `VITE_FIREBASE_*`, habilite o provedor Google e autorize os dominios do frontend no console do Firebase. O backend deve receber `FIREBASE_SERVICE_ACCOUNT_JSON` de uma service account desse mesmo projeto.

Cada administrador precisa ter o UID exibido em Firebase Authentication salvo em `User.firebaseUid`. O UID do Firebase nao substitui o `User.id` do PostgreSQL. O acesso exige simultaneamente:

- ID Token valido emitido pelo provedor Google;
- e-mail verificado;
- `firebaseUid` correspondente;
- usuario ativo com `role=admin`.

### Bypass do login Google em desenvolvimento

Para trabalhar local sem passar pelo popup do Google, defina no `apps/frontend/.env`:

```
VITE_DEV_AUTH_BYPASS="true"
```

Com a flag ligada o frontend nao inicializa o fluxo do Firebase: ele chama `/me` sem `Authorization`, e o backend responde com a identidade de `DEV_AUTH_EMAIL` / `DEV_AUTH_UID` (fallback que so existe quando `NODE_ENV !== "production"`). Esse e-mail precisa existir em `User` com `active=true` e `role=admin` — o seed ja cria esse registro usando `SEED_ADMIN_EMAIL`.

O bypass depende tambem de `import.meta.env.DEV`, entao ele e eliminado em qualquer build de producao mesmo que a variavel fique `true` por engano. Reinicie o `vite` depois de alterar o `.env`.

Para o primeiro administrador, defina `SEED_ADMIN_EMAIL` e `SEED_ADMIN_FIREBASE_UID` antes de executar o seed, ou atualize o registro existente diretamente no banco. Contas sem o vinculo de UID nao conseguem acessar `/app`.

Links de confirmacao de participacao usam JWT HS256. Configure `PARTICIPATION_JWT_SECRET` com um segredo aleatorio de pelo menos 32 caracteres e `PARTICIPATION_APP_URL` com a URL publica da tela de confirmacao.

Links publicos de reunioes tambem usam JWT HS256, gerenciados em **Settings > Links publicos**. Configure `PUBLIC_SHARE_JWT_SECRET` com outro segredo aleatorio de pelo menos 32 caracteres e `PUBLIC_APP_URL` com a URL da rota publica (por exemplo, `https://varjotapp.com/public`). O administrador pode definir a expiracao, escolher o token padrao e revogar tokens; uma revogacao invalida imediatamente todos os links emitidos por aquele token.

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

## Criar participantes em lote

Administradores podem criar ate 500 participantes por requisicao. O mesmo numero e salvo em `phone` e `whatsapp`; `gender` fica nulo. A operacao inteira e revertida se qualquer item for invalido.

```bash
curl --request POST http://localhost:3333/participants/bulk \
  --header "Authorization: Bearer FIREBASE_ID_TOKEN" \
  --header "Content-Type: application/json" \
  --data '[
    {"name":"Adriana Oliveira","phone":"5585987210607"},
    {"name":"Airton Lima","phone":"5585999607053"}
  ]'
```

A resposta HTTP `201` contem `createdCount` e a lista de participantes criados.

## Scripts

- `npm run dev`: sobe backend e frontend.
- `npm run build --workspaces`: compila backend e frontend.
- `npm run typecheck --workspaces`: checa TypeScript.
- `npm test`: testa a normalizacao do payload de importacao.
- `npm run seed`: cria congregacao, settings, admin e participantes iniciais.
