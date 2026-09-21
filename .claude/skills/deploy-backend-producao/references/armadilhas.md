# Armadilhas encontradas neste deploy

Cada item aconteceu de fato em 21/09/2026. A ordem é por gravidade.

## Índice

1. [`NODE_ENV` ausente abre bypass de autenticação](#1)
2. [Barra final no `proxy_pass`](#2)
3. [Entrypoint é `dist/src/server.js`](#3)
4. [PM2 sem `--cwd` sobe sem `.env`](#4)
5. [`npm install` dentro do workspace instala o monorepo inteiro](#5)
6. [Segredos com `\n` através de shell](#6)
7. [`require.resolve` mente sobre pacotes com `exports`](#7)
8. [`psql -c` é uma transação implícita](#8)
9. [Quoting através de expect → ssh → docker → psql](#9)
10. [Container que parece Postgres e não é](#10)
11. [Locations regex no nginx invertem a precedência](#11)
12. [`VITE_*` é build-time](#12)

---

<a id="1"></a>
## 1. `NODE_ENV` ausente abre bypass de autenticação

**A mais grave. Verifique sempre, em todo deploy.**

`apps/backend/src/auth/firebase.ts` termina assim:

```js
if (process.env.NODE_ENV !== "production") {
    return {
        email: process.env.DEV_AUTH_EMAIL ?? "admin@varjotapp.local",
        development: true
    };   // retorna identidade válida SEM verificar token
}
```

O `.env` de produção fornecido não definia `NODE_ENV`. Como `undefined !== "production"`, o fallback ativou e **toda requisição sem token passou a ser autenticada como o admin de `DEV_AUTH_EMAIL`**.

Efeito real: qualquer pessoa na internet tinha acesso admin completo — ler e escrever designações, participantes, usuários e configurações. Comprovado com `curl` externo sem credencial nenhuma, retornando dados de usuário.

Ficou exposto ~14 minutos, desde o `pm2 start` (a porta 3999 já era pública, pois o `ufw` está inativo) até a correção.

**Correção:** `NODE_ENV=production` no `.env` e `pm2 restart <nome> --update-env`.

**Como verificar, sempre de fora do servidor:**

```bash
curl -s -o /dev/null -w '%{http_code}' https://srv1088997.hstgr.cloud/varjotapp/users
# precisa ser 401, nunca 200
```

Um `200` numa rota autenticada, sem header `Authorization`, é incidente de segurança — não um deploy bem-sucedido.

O sintoma engana: no primeiro teste `/users` devolveu `403`, o que parecia auth funcionando. Era só o usuário ainda não existir no banco. Depois que a migration `init` populou o admin, virou `200`. **Um `403` não confirma que a autenticação funciona** — teste depois das migrations.

---

<a id="2"></a>
## 2. Barra final no `proxy_pass`

```nginx
proxy_pass http://127.0.0.1:3999/;   # com barra: nginx remove o prefixo
proxy_pass http://127.0.0.1:3999;    # sem barra: backend recebe /varjotapp/users
```

As rotas do Express são montadas na raiz (`/health`, `/me`, `/users`), sem prefixo `/api`. Sem a barra, tudo vira 404 e o sintoma parece "a API não subiu".

Um `location = /varjotapp { return 301 /varjotapp/; }` fecha a aresta do path sem barra, que cairia no `location /` e iria para a API errada.

---

<a id="3"></a>
## 3. Entrypoint é `dist/src/server.js`

O `tsconfig.json` do backend usa:

```json
{ "rootDir": ".", "outDir": "dist", "include": ["src", "prisma"] }
```

Com `rootDir: "."`, o `tsc` preserva a estrutura: a saída é `dist/src/server.js` e `dist/prisma/seed.js`. Apontar o PM2 para `dist/server.js` falha com "module not found".

Confirme com `ls dist/` antes de escrever o comando do PM2. Não assuma — `rootDir` varia entre projetos.

---

<a id="4"></a>
## 4. PM2 sem `--cwd` sobe sem `.env`

`src/server.ts` começa com `import "dotenv/config"`, que lê o `.env` do **diretório de trabalho do processo**. O PM2 herda o cwd de quem chamou, não o diretório do script.

```bash
pm2 start dist/src/server.js --name varjotapp-api --cwd /root/meetapp/apps/backend
```

Sem `--cwd`, o processo sobe sem `DATABASE_URL`, sem `NODE_ENV` (reabrindo a armadilha nº 1) e falha de formas difíceis de diagnosticar.

Correlato: ao editar o `.env` depois, use `pm2 restart <nome> --update-env`. Sem o flag o PM2 reaproveita o ambiente antigo e a alteração não tem efeito nenhum — o processo reinicia e nada muda.

---

<a id="5"></a>
## 5. `npm install` dentro do workspace instala o monorepo inteiro

O repo é npm workspaces (`apps/backend` + `apps/frontend`) com o lockfile na raiz. Rodar `npm install` de dentro de `apps/backend` faz o npm subir até a raiz do workspace e instalar **os dois apps**.

```bash
cd /root/meetapp
npm ci --workspace apps/backend --include-workspace-root=false
```

`npm ci` é preferível a `install` em produção: respeita o lockfile exatamente e não o reescreve.

O `node_modules` fica **hoisted na raiz** do monorepo, não em `apps/backend`. Isso é correto e o backend resolve tudo normalmente — mas surpreende quem espera o `node_modules` ao lado do `package.json`.

Verifique o escopo assim: `[ -d node_modules/react ]` deve ser falso.

---

<a id="6"></a>
## 6. Segredos com `\n` através de shell

`FIREBASE_SERVICE_ACCOUNT_JSON` carrega a chave privada com `\n` que precisam chegar como **dois caracteres literais** — o `JSON.parse` no `firebase.ts` é quem os converte em quebras reais. Qualquer heredoc, `echo` ou `sed` no caminho arrisca interpretá-los, e o erro só aparece na hora em que o Firebase rejeita a credencial.

Base64 remove a classe inteira de problemas:

```bash
B64=$(base64 < arquivo.env | tr -d '\n')          # local
echo "$B64" | base64 -d > .../.env && chmod 600   # remoto
```

Valide dos dois lados com `sha256sum` e confirme o parse antes de subir:

```js
JSON.parse(valor).private_key.startsWith("-----BEGIN PRIVATE KEY-----")  // true
JSON.parse(valor).private_key.split("\n").length                          // 29
```

---

<a id="7"></a>
## 7. `require.resolve` mente sobre pacotes com `exports`

Verificar instalação com `require.resolve("pacote/package.json")` produz **falso negativo** em pacotes modernos: o campo `exports` do `package.json` pode não expor o subpath `./package.json`. Foi o que aconteceu com `firebase-admin@12`, que estava perfeitamente instalado.

Use `npm ls --workspace <ws> --depth=0`, que lê a árvore real, ou tente o import de verdade.

Lição mais ampla: quando um teste de sanidade acusa problema, desconfie do teste antes de desconfiar do sistema.

---

<a id="8"></a>
## 8. `psql -c` é uma transação implícita

`psql -c 'A; B; C'` roda tudo numa única transação. Se `B` falhar, `A` é revertido junto — mesmo que já tenha reportado `CREATE TABLE`.

Aconteceu ao testar permissões: o `CREATE TABLE _probe` pareceu ter deixado lixo no banco, mas o rollback já havia limpado. Um `DROP TABLE IF EXISTS` de confirmação mostrou "does not exist, skipping".

Útil saber nos dois sentidos: erros no meio não deixam estado parcial, mas sucessos reportados também não significam que persistiram.

---

<a id="9"></a>
## 9. Quoting através de expect → ssh → docker → psql

Quatro camadas de shell entre o teclado e o SQL. Aspas simples e duplas são reinterpretadas em cada uma, e o Postgres trata `"texto"` como **identificador**, não string — daí erros do tipo `column "ok" does not exist` que parecem bug de banco e são só quoting.

Para SQL não trivial, escreva um arquivo e pipe:

```bash
cat > /tmp/init.sql <<'SQL'
CREATE ROLE ...;
SQL
cat /tmp/init.sql | docker exec -i opmebox-db psql -U nns -d postgres -v ON_ERROR_STOP=1 -f -
shred -u /tmp/init.sql
```

`ON_ERROR_STOP=1` evita que um erro no meio passe despercebido. Apague o arquivo se ele contiver senha.

---

<a id="10"></a>
## 10. Container que parece Postgres e não é

`docker ps` mostrava `trusting_leavitt / postgres:18 / Up 5 weeks`. Parecia um segundo banco disponível. Era um `createdb` preso há cinco semanas, sem servidor algum rodando dentro.

Revelado por `docker top <container>`, que mostrou o único processo. `docker ps` informa que o container está de pé, não que o serviço esperado está servindo.

Nomes auto-gerados (`trusting_leavitt`, `vibrant_hopper`) indicam `docker run` avulso em vez de compose — sinal de container ad-hoc, que merece verificação extra antes de ser tratado como infraestrutura.

---

<a id="11"></a>
## 11. Locations regex no nginx invertem a precedência

A regra usual é "prefixo mais longo vence", o que torna seguro adicionar `location /varjotapp/` ao lado de `location /`. Mas um `location ~ ...` (regex) tem precedência sobre qualquer prefixo e pode capturar a rota antes.

Confirme antes de concluir que a mudança é isolada:

```bash
grep -nE "location\s+(~|=|\^~)" /etc/nginx/sites-enabled/nodeapp
```

Neste servidor não há nenhum, o que torna o comportamento previsível. Se um dia houver, a análise muda.

---

<a id="12"></a>
## 12. `VITE_*` é build-time

O Vite substitui `import.meta.env.VITE_*` no bundle durante o build. Alterar a variável no ambiente não muda nada num frontend já publicado — é preciso rebuildar e refazer o deploy no Firebase Hosting.

Vale dizer isso ao usuário junto com a URL nova, senão ele testa, não funciona, e o problema parece ser do backend.

---

## Método que pegou esses problemas

- **Baseline antes de mexer.** Registrar `/`, `/health`, `/api`, `/login` da API existente *antes* do reload do nginx é o que permitiu afirmar depois que nada quebrou. Sem baseline, "parece que está ok" é chute.
- **Testar de fora.** `curl` no `127.0.0.1` de dentro do servidor não exercita proxy, TLS nem firewall. O bypass de autenticação só ficou evidente numa chamada externa.
- **Desconfiar de resultado bom demais.** `/users` respondendo `200` era mais suspeito do que um erro — e foi puxar esse fio que revelou a falha grave.
- **Não confiar no primeiro sinal.** O `403` inicial, o falso negativo do `require.resolve` e o `X-Meu-Nginx` "ausente" (que era só `add_header` não se aplicando a respostas 404) foram três leituras erradas que a verificação seguinte corrigiu.
