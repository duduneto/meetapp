---
name: deploy-backend-producao
description: Deploy do backend do varjotapp no servidor de produção Hostinger (srv1088997 / 72.61.32.122) — clone, dependências do workspace, .env, migrations Prisma, build, PM2 e proxy nginx com HTTPS. Use sempre que o pedido envolver subir, atualizar, reiniciar ou expor a API em produção, publicar uma nova versão do backend, mexer no PM2 ou no nginx desse servidor, criar banco/role Postgres lá, ou diagnosticar por que a API de produção está fora do ar — mesmo que o usuário não diga "deploy" com todas as letras (ex.: "sobe essa branch no servidor", "a API caiu", "expõe a porta X", "roda as migrations em prod").
---

# Deploy do backend varjotapp em produção

Este servidor **já hospeda quatro APIs de outros projetos**. O maior risco de qualquer trabalho aqui não é o deploy falhar — é derrubar algo que já funcionava. Por isso o fio condutor desta skill é: **medir antes, mudar pouco, verificar de fora.**

Antes de executar qualquer passo, leia `references/servidor.md` para saber o que já roda na máquina. Depois de qualquer alteração, rode `scripts/verify_deploy.sh`.

## Conexão

```
ssh root@72.61.32.122
```

Acesso por senha (peça ao usuário; nunca grave em arquivo do repo). Não há `sshpass` no macOS por padrão — use um wrapper `expect` lendo a senha de um arquivo `600` no diretório de scratchpad da sessão, para que a senha não apareça no texto de cada comando nem no histórico.

Se for executar muitos comandos, vale propor instalar uma chave SSH — mas isso escreve em `/root/.ssh/authorized_keys`, então peça antes.

## Sequência do deploy

Cada passo abaixo tem uma armadilha associada. Elas estão detalhadas em `references/armadilhas.md` — vale ler antes de começar, porque várias só aparecem depois que o estrago está feito.

### 0. Redeploy? Pule para o fluxo curto

Se `/root/meetapp` já existe, isto é uma atualização, não um deploy novo. O fluxo é:

```bash
scripts/verify_deploy.sh --baseline          # ANTES de tudo
cd /root/meetapp
cp -p apps/backend/.env /root/varjotapp.env.bak.$(date +%Y%m%d-%H%M%S)
GIT_TERMINAL_PROMPT=0 git fetch https://<user>:<token>@github.com/duduneto/meetapp.git main
git log --oneline HEAD..FETCH_HEAD          # o que vem
git diff --stat HEAD FETCH_HEAD             # o que muda
```

O `origin` está sem token (por segurança), então `git pull` sozinho falha em repo privado — autentique no `fetch` e depois `git merge --ff-only FETCH_HEAD`.

Decida pelo diff o que realmente precisa rodar:

| Mudou | Ação |
|---|---|
| `apps/backend/prisma/` | `npx prisma migrate deploy` |
| `package.json` / `package-lock.json` | `npm ci --workspace apps/backend --include-workspace-root=false` |
| qualquer `.ts` | `npm run build` |
| sempre | `pm2 restart varjotapp-api --update-env` + `scripts/verify_deploy.sh` |

Rodar `migrate deploy` mesmo sem mudança em `prisma/` é seguro e barato — responde "No pending migrations to apply". Vale como confirmação explícita quando o usuário pergunta se há migrations.

O `.env` é gitignored e sobrevive ao merge, mas faça o backup mesmo assim e confirme depois que `NODE_ENV=production` continua lá.

**O `.env` do servidor pode ter sido editado por outra pessoa entre um deploy e outro.** Confira os valores reais em vez de assumir os do deploy anterior — `pm2 logs` mostra os boots e denuncia reinícios que não foram seus.

### 1. Clone (deploy novo)

```bash
cd /root
git clone https://<user>:<token>@github.com/duduneto/meetapp.git meetapp
cd meetapp && git remote set-url origin https://github.com/duduneto/meetapp.git
```

O `set-url` logo após o clone não é opcional: sem ele o token fica gravado em claro no `.git/config` de um servidor de produção. Comandos via SSH não-interativo não entram no `.bash_history`, então o token não persiste em outro lugar.

Apps ficam em `/root/<nome>` por convenção da máquina — siga isso.

### 2. Dependências (é um monorepo npm workspaces)

```bash
cd /root/meetapp
npm ci --workspace apps/backend --include-workspace-root=false
```

O lockfile fica na **raiz**, não em `apps/backend`. Rodar `npm install` de dentro de `apps/backend` faz o npm subir até a raiz do workspace e instalar o frontend junto. O flag `--workspace` é o que mantém o escopo no backend.

O `node_modules` fica **majoritariamente hoisted em `/root/meetapp/node_modules`**, não dentro de `apps/backend`. O hoisting é best-effort: quando há conflito de versão com uma dependência transitiva, o npm instala localmente em `apps/backend/node_modules/`. Foi o caso de `cheerio` e `htmlparser2`. Ou seja, um pacote pode estar instalado e correto sem aparecer na raiz.

Verifique o escopo por `node_modules/react` **não** existir, e a presença de um pacote por `npm ls <pkg> --workspace apps/backend` — nunca por `ls node_modules/<pkg>`, que dá falso negativo (veja armadilha nº 7).

### 3. `.env`

Transfira por base64, nunca por heredoc direto:

```bash
# local
B64=$(base64 < arquivo.env | tr -d '\n')
# remoto
echo "$B64" | base64 -d > /root/meetapp/apps/backend/.env
chmod 600 /root/meetapp/apps/backend/.env
```

O `FIREBASE_SERVICE_ACCOUNT_JSON` contém `\n` que precisam continuar sendo **dois caracteres literais** (`JSON.parse` os converte depois). Qualquer passagem por shell arrisca interpretá-los. Base64 elimina a classe inteira de problemas de quoting. Compare o `sha256sum` dos dois lados.

**`NODE_ENV=production` é obrigatório.** Sem ele a API abre um bypass de autenticação — veja a armadilha nº 1 em `references/armadilhas.md`. Esta é a falha mais séria já encontrada neste deploy.

### 4. Migrations e build

```bash
cd /root/meetapp/apps/backend
npx prisma migrate deploy   # nunca 'migrate dev' em produção
npx prisma generate
npm run build
```

`migrate deploy` só aplica o que existe e não gera arquivos nem reseta nada — é a variante correta para produção. O `prisma generate` já roda no postinstall, mas repetir é barato e evita cliente desatualizado.

### 5. PM2

```bash
pm2 start dist/src/server.js --name varjotapp-api \
  --cwd /root/meetapp/apps/backend --time
pm2 save
```

Dois detalhes que quebram silenciosamente:

- O entrypoint é **`dist/src/server.js`**, não `dist/server.js`. O `tsconfig.json` usa `rootDir: "."` com `include: ["src", "prisma"]`, então o `tsc` preserva a pasta `src/` dentro de `dist/`. Confirme com `ls dist/src/server.js` antes de apontar o PM2.
- O `--cwd` importa porque o `server.ts` faz `import "dotenv/config"`, que lê o `.env` do diretório de trabalho. Sem `--cwd` o processo sobe sem nenhuma variável e falha de formas confusas.

`pm2 save` persiste a lista; o startup systemd já está configurado nesta máquina.

Ao alterar o `.env` depois, reinicie com `pm2 restart <nome> --update-env` — sem esse flag o PM2 reaproveita o ambiente antigo e a mudança não tem efeito.

### 6. Exposição via nginx

O arquivo é `/etc/nginx/sites-enabled/nodeapp`. Faça backup com timestamp e confira o `sha256sum` antes de editar.

Adicione dentro do bloco `listen 443 ssl default_server`:

```nginx
location = /varjotapp {
    return 301 /varjotapp/;
}

location /varjotapp/ {
    proxy_pass         http://127.0.0.1:3999/;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
}
```

**A barra final em `http://127.0.0.1:3999/` é o que faz funcionar.** Com ela o nginx remove o prefixo e entrega `/users` ao Express. Sem ela o backend recebe `/varjotapp/users` e devolve 404 em tudo — as rotas são montadas na raiz, sem prefixo `/api`.

Antes de assumir que o `location` novo não afeta os outros: o nginx resolve por **prefixo mais longo, não por ordem** — mas um `location` regex (`~`) teria precedência sobre qualquer prefixo. Confirme que não existe nenhum com `grep -nE "location\s+(~|=|\^~)"`. Hoje o arquivo só tem prefixos simples.

Sempre:

```bash
nginx -t && systemctl reload nginx
```

O `reload` é graceful (workers antigos terminam as requisições em curso) e uma config inválida é recusada sem derrubar o que está no ar. O risco real é uma edição sintaticamente válida mas semanticamente errada — por isso o baseline do passo seguinte.

### 7. Verificação

```bash
scripts/verify_deploy.sh
```

Colete o baseline das APIs existentes **antes** de mexer no nginx, para poder comparar depois. O script cobre isso, mais: health da API nova, `401` nas rotas autenticadas, integridade das rotas da API antiga e do `/socket.io/` do chat, e status do PM2.

Teste sempre **de fora do servidor**. `curl` no `127.0.0.1` de dentro da máquina não prova que o proxy, o TLS e o firewall estão corretos.

## Frontend

```
VITE_API_URL="https://srv1088997.hstgr.cloud/varjotapp"
```

Sem barra final — o client faz `fetch(\`${API_URL}${path}\`)` com `path` já começando em `/`.

O Vite substitui `import.meta.env` em **tempo de build**. Mudar a variável não basta: é preciso rebuildar e refazer o deploy no Firebase Hosting.

O `FRONTEND_ORIGIN` do backend precisa bater com o origin real (`https://ze-cong.web.app`), senão o CORS bloqueia. Valide com um preflight `OPTIONS` real, e confirme que um origin não autorizado **não** recebe `Access-Control-Allow-Origin`.

## Postura em produção

O que guia as decisões aqui, em ordem:

1. **Levante o terreno antes de agir.** Duas descobertas que mudaram o plano vieram de inspeção read-only: o container que parecia um Postgres e não era, e a ausência de `location` regex no nginx. Ambas teriam virado incidente se fossem suposição.
2. **Separe o que é aditivo do que é destrutivo.** Criar database, role ou processo PM2 novo é reversível e pode seguir. Reiniciar serviço alheio, rodar `npm audit fix`, `REVOKE` em banco de terceiro ou editar nginx compartilhado precisa de aval explícito — mesmo que pareça óbvio.
3. **Pare o sangramento primeiro.** Diante de exposição ativa de segurança que você acabou de criar, corrija na hora e relate em seguida, sinalizando que a decisão pode ser revertida. Esperar resposta com uma API admin aberta ao mundo é o pior dos caminhos.
4. **Relate o que não fez.** Pendências conhecidas valem mais para o usuário do que um relatório que só lista sucessos.

## Segurança: pendências conhecidas da máquina

Levantadas durante o deploy, **não corrigidas** (dependem de decisão do usuário). Vale reapresentar sempre que voltar a esse servidor:

| Item | Situação |
|---|---|
| `ufw` | inativo |
| Postgres `opmebox-db` | publicado em `0.0.0.0:5432`, alcançável da internet |
| Porta 3999 | aberta ao mundo; com o proxy HTTPS pronto, bastaria `127.0.0.1` |
| `DEV_AUTH_EMAIL` no `.env` | inofensivo com `NODE_ENV=production`, mas rearma o bypass se alguém remover a variável |
| Container `trusting_leavitt` | processo preso desde ago/2026 consumindo CPU; provável causa do load alto |

Credenciais que o usuário colar no chat (PAT do GitHub, service account do Firebase) ficam no histórico da conversa — recomende rotação ao final.
