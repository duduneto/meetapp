# Topologia do servidor de produção

Levantado em 21/09/2026. Trate como ponto de partida, não como verdade eterna — confirme com os comandos de inspeção antes de agir.

## Máquina

| | |
|---|---|
| Host | `srv1088997` (Hostinger) |
| IP | `72.61.32.122` |
| Acesso | `ssh root@72.61.32.122`, senha |
| SO | Ubuntu 25.04, kernel 6.14 |
| Disco | 96G (~24% usado) |
| RAM | 7.8Gi |
| Domínio | `srv1088997.hstgr.cloud` (hostname genérico da Hostinger, cert Let's Encrypt válido) |

Load average costuma aparecer alto (~3.5) por causa do container `trusting_leavitt` — veja "Docker" abaixo.

## Toolchain

`git 2.48`, `node v20.19.5`, `npm 10.8.2`, `yarn 1.22`, `psql 17.7` (client no host).
**Não há** `pnpm` nem `bun`.

## Aplicações (PM2, todas em fork mode, user root)

| Nome | Porta | Diretório | Observação |
|---|---|---|---|
| `api` | 3333 | `/root/nns-backend-monolith` | monolito; é o alvo do `location /` no nginx |
| `chat` | 3001 | `/root/nns-chat-ms` | WebSocket via `/socket.io/` |
| `ans` | — | `/root/nns-ans-consult` | |
| `notification` | — | `/root/nns-notification-ms` | |
| `varjotapp-api` | 3999 | `/root/meetapp/apps/backend` | este projeto |

Convenção da máquina: código em `/root/<nome-do-projeto>`, processo gerenciado por PM2 com startup systemd já configurado. `pm2 save` depois de qualquer mudança na lista.

## nginx

Arquivo único: `/etc/nginx/sites-enabled/nodeapp` (mais `denied_ips.conf`).

Três blocos `server`:
- `listen 80` + `listen 8080 default_server` → `location /` → `127.0.0.1:3333`
- `listen 443 ssl default_server` → é onde o trabalho acontece

Dentro do bloco 443:
- `ssl_certificate /etc/letsencrypt/live/srv1088997.hstgr.cloud/fullchain.pem`
- `location /socket.io/` → `127.0.0.1:3001` (chat, com headers de Upgrade)
- `location = /varjotapp` + `location /varjotapp/` → `127.0.0.1:3999/` (este projeto)
- `location /` → `127.0.0.1:3333` (monolito, com `add_header X-Meu-Nginx "Sim"`)

`server_name` é `_` em todos — não há virtual hosting por domínio. Qualquer rota nova é um prefixo de path no mesmo host.

Só existem locations de **prefixo simples**. Isso é o que torna o roteamento previsível (vence o prefixo mais longo). Reconfirme com `grep -nE "location\s+(~|=|\^~)"` antes de assumir.

## Postgres

**Só existe uma instância funcional**: container `opmebox-db`.

| | |
|---|---|
| Imagem | `postgres` (roda PG 18.0) |
| Porta | `0.0.0.0:5432` → 5432 (exposta à internet) |
| Volume | `pgdata` |
| Restart | `always` |
| Superuser | `nns` (era o único role antes deste deploy) |

Databases: `ans` (808MB), `ans_v2` (1.2GB), `ans_v3` (888MB), `ans-v3` (8MB), `opmebox` (1.8GB), e agora `varjotapp`.

### O database do varjotapp

Criado com role dedicado, não reusando o superuser `nns`:

```sql
CREATE ROLE varjotapp LOGIN PASSWORD '<gerada>';
CREATE DATABASE varjotapp OWNER varjotapp ENCODING 'UTF8';
ALTER SCHEMA public OWNER TO varjotapp;
```

Conexão a partir do host: `postgresql://varjotapp:<senha>@localhost:5432/varjotapp?schema=public`.
Atenção: o `.env.example` do repo diz **5433**, que está errado para esta máquina.

O role `varjotapp` não enxerga tabela alguma dos outros databases, mas *consegue abrir conexão* neles porque o `CONNECT` do `PUBLIC` é o padrão do Postgres. Fechar isso exige `REVOKE CONNECT ON DATABASE <outro> FROM PUBLIC`, o que mexe em bancos de terceiros — peça autorização.

Gere senha URL-safe (só alfanumérico) para não precisar de percent-encoding na `DATABASE_URL`.

## Docker

| Container | O que é |
|---|---|
| `opmebox-db` | o Postgres real |
| `nns-chat-ms-mongo-1` | MongoDB 7 do chat |
| `trusting_leavitt` | **não é um servidor Postgres** |

`trusting_leavitt` aparece como `postgres:18` e `Up 5 weeks`, o que engana. `docker top` revela que o único processo é um `createdb -h localhost -p 5432 -U postgres ans_v2` preso desde 11/08/2026, tentando conectar num servidor que não existe dentro do próprio container. Acumulou ~4 dias de tempo de CPU e é a explicação mais provável do load alto da máquina.

Não tem volume próprio de dados relevante e está com `restart: no`, então é descartável — mas é container de produção alheio, então confirme antes de remover.

**Lição de método:** `docker ps` mostrando `postgres:18 / Up` não prova que há um Postgres servindo. Confirme com `docker top` ou tentando conectar de fato.
