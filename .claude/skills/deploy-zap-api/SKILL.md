---
name: deploy-zap-api
description: Deploy e manutenção da zap-api — o gateway WhatsApp (whatsapp-web.js + Puppeteer) que roda em 127.0.0.1:3998 no servidor de produção do varjotapp/meetapp (srv1088997 / 72.61.32.122) e é consumido pelo backend para enviar notificações de participação. Use sempre que o pedido envolver subir, atualizar, reiniciar ou diagnosticar essa API, mexer no processo PM2 `zap-api`, reautenticar o WhatsApp por QR code, investigar por que mensagens não estão sendo enviadas, ou quando o backend do varjotapp retornar erro do gateway — mesmo sem a palavra "deploy" (ex.: "o whatsapp parou de mandar", "preciso ler o QR de novo", "sobe a api do zap", "o /messages está dando 503").
---

# Deploy da zap-api (gateway WhatsApp)

Esta API existe para um único consumidor: o backend do varjotapp chama `POST /messages` nela para disparar notificações de participação. Ela roda **exclusivamente em loopback** — não é, e não deve ser, acessível pela internet.

O servidor é o mesmo do varjotapp e hospeda APIs de outros projetos. Vale a mesma postura da skill irmã `deploy-backend-producao`: **medir antes, mudar pouco, verificar de fora**. Consulte `references/servidor.md` daquela skill para a topologia da máquina.

## O que torna esta API diferente

Três características mudam tudo em relação a um deploy Node comum:

1. **Roda um Chromium de verdade.** `whatsapp-web.js` dirige o WhatsApp Web via Puppeteer. Isso traz dependências de sistema e a armadilha do sandbox como root.
2. **Tem estado que não pode ser perdido.** A sessão autenticada vive em `/root/zap/.wwebjs_auth` (~108M). Apagar isso obriga o usuário a escanear o QR de novo.
3. **Não está no Git.** O projeto vive só na máquina do usuário (`~/Dev/varjota/zap`). Deploy é transferência de arquivos, não `git pull`.

## Estado de referência

| | |
|---|---|
| Diretório | `/root/zap` |
| Processo PM2 | `zap-api` |
| Porta | `127.0.0.1:3998` (loopback apenas) |
| Entrypoint | `src/index.js` (CommonJS, arquivo único) |
| Node | v20.19.5 · whatsapp-web.js 1.34.7 · express 5 |
| Chromium | `/root/.cache/puppeteer/chrome/linux-146.0.7680.31` |
| Sessão | `/root/zap/.wwebjs_auth/session` |

## O acoplamento com o varjotapp

Os dois lados precisam concordar em duas variáveis. No `.env` do backend (`/root/meetapp/apps/backend/.env`):

```
WHATSAPP_API_URL="http://127.0.0.1:3998"
WHATSAPP_API_TOKEN="<mesmo token do zap>"
WHATSAPP_API_TIMEOUT_MS="180000"
```

**O default no código do backend é `http://127.0.0.1:3999`, que é a porta do próprio varjotapp.** Se `WHATSAPP_API_URL` faltar, o backend chama a si mesmo e o erro resultante não aponta para a causa. Confirme a variável antes de investigar qualquer falha de envio.

Para verificar que os tokens batem sem imprimir nenhum deles:

```bash
grep "^WHATSAPP_API_TOKEN" /root/meetapp/apps/backend/.env | sed -E 's/^[^=]+=//; s/"//g' | tr -d '\n' | md5sum
grep "^WHATSAPP_API_TOKEN" /root/zap/.env                  | sed -E 's/^[^=]+=//; s/"//g' | tr -d '\n' | md5sum
```

## Deploy novo

### 1. Empacotar (só o que importa)

Na máquina local, dentro de `~/Dev/varjota/zap`:

```bash
tar czf /tmp/zap.tgz src package.json package-lock.json .env.example README.md
```

Nunca inclua `node_modules`, `.wwebjs_auth` nem `.wwebjs_cache` — são centenas de MB, e a sessão de auth é do ambiente local, não do servidor.

### 2. Transferir por base64

```bash
B64=$(base64 < /tmp/zap.tgz | tr -d '\n')
# remoto:
mkdir -p /root/zap && echo "$B64" | base64 -d > /tmp/zap.tgz
tar xzf /tmp/zap.tgz -C /root/zap && rm -f /tmp/zap.tgz
find /root/zap -name "._*" -delete   # metadata AppleDouble do tar do macOS
chown -R root:root /root/zap
```

O `tar` do macOS injeta arquivos `._*` com xattrs e preserva uid/gid 501:staff. Ambos precisam de limpeza. Confira o `sha256sum` do `src/index.js` nos dois lados.

### 3. `.env`

```
PORT=3998
MESSAGE_DELAY_MIN_MS=7000
MESSAGE_DELAY_MAX_MS=12000
WHATSAPP_API_TOKEN=<token longo, igual ao do backend>
```

`chmod 600`. O processo faz `throw` no boot se `WHATSAPP_API_TOKEN` faltar, e também se o intervalo de delay for inválido (`MAX < MIN`, negativos ou não inteiros) — falha rápido e explícito, o que ajuda.

### 4. Dependências de sistema (só na primeira vez)

O Puppeteer baixa o próprio Chromium no `npm ci`, mas o Ubuntu precisa das bibliotecas gráficas:

```bash
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y --no-install-recommends \
  ca-certificates fonts-liberation libasound2t64 libatk-bridge2.0-0t64 libatk1.0-0t64 \
  libcairo2 libcups2t64 libdbus-1-3 libdrm2 libexpat1 libgbm1 libglib2.0-0t64 \
  libgtk-3-0t64 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 \
  libx11-6 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxkbcommon0 libxrandr2
```

No Ubuntu 24.04+ vários pacotes ganharam sufixo `t64` (`libasound2t64`, `libatk1.0-0t64`). Usar o nome antigo faz o apt falhar.

Valide que o browser sobe de fato antes de seguir — é mais rápido que descobrir pelo log do PM2:

```bash
CHROME=/root/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome
$CHROME --headless --no-sandbox --disable-gpu --dump-dom about:blank
```

Deve imprimir `<html>...` e sair com 0. Erros de DBus/UPower no stderr são ruído normal em servidor headless.

### 5. Instalar e subir

```bash
cd /root/zap && npm ci && npm run check
pm2 start src/index.js --name zap-api --cwd /root/zap --time
pm2 save
```

O `--cwd` é obrigatório: `dotenv` lê o `.env` do diretório de trabalho, e o `LocalAuth` grava `.wwebjs_auth` lá também. Sem ele, a sessão vai para o lugar errado e o QR é pedido a cada restart.

### 6. Autenticar o WhatsApp

O QR sai no stdout do processo e **expira em cerca de 1 minuto**, renovando em seguida. Peça ao usuário para escanear — isto é dele, não seu:

```bash
pm2 logs zap-api --lines 40
```

WhatsApp → Aparelhos conectados → Conectar aparelho. Depois disso a sessão persiste em `.wwebjs_auth` e sobrevive a restarts.

### 7. Verificar

```bash
scripts/verify_zap.sh
```

## Redeploy (atualização de código)

O caso comum. O ponto central é **preservar estado**:

```bash
# transferir apenas src/ (ou o arquivo alterado) por base64
# NÃO tocar em: /root/zap/.env, /root/zap/.wwebjs_auth
cd /root/zap && npm run check
pm2 restart zap-api --update-env
scripts/verify_zap.sh
```

Rode `npm ci` somente se o `package.json` tiver mudado. Se a sessão for preservada, o `/health` volta a 200 sozinho em alguns segundos, sem novo QR.

## Semântica do `/health` — importa para diagnóstico

```
200 {"ok":true,"whatsappReady":true}    processo vivo E WhatsApp autenticado
503 {"ok":false,"whatsappReady":false}  processo vivo, WhatsApp NÃO autenticado
sem resposta                            processo morto
```

Um **503 não significa que o deploy falhou** — significa que o WhatsApp precisa ser (re)autenticado por QR. É o estado normal logo após o primeiro start. Distinguir esses três casos evita investigar a coisa errada.

`POST /messages` responde 401 sem token válido (comparação com `timingSafeEqual`, resistente a timing attack).

## Armadilhas

**1. Chromium recusa rodar como root sem `--no-sandbox`.** Todo processo PM2 desta máquina roda como root, então o boot falha com:

```
Running as root without --no-sandbox is not supported
```

O `src/index.js` já resolve isso passando args ao Puppeteer, com `PUPPETEER_ARGS` como escape:

```js
puppeteer: {
    args: (process.env.PUPPETEER_ARGS ?? '--no-sandbox,--disable-setuid-sandbox')
        .split(',').map((a) => a.trim()).filter(Boolean)
}
```

Isso reduz o isolamento do Chromium. É aceitável aqui porque ele só renderiza o WhatsApp Web e a API é loopback — mas se um dia o processo passar a rodar com usuário comum, remova a flag via `PUPPETEER_ARGS`.

**2. `.wwebjs_auth` é estado insubstituível.** Não está no pacote de deploy, não tem backup automático, e perdê-lo custa uma ação manual do usuário (escanear o QR). Qualquer limpeza em `/root/zap` precisa excluir esse diretório explicitamente. Vale o mesmo para `rm -rf` de "reinstalação limpa".

**3. `WHATSAPP_API_URL` ausente faz o backend chamar a si mesmo** (default 3999 = porta do varjotapp). Primeiro item a checar quando o envio falha.

**4. Nomes de pacote `t64` no Ubuntu 24.04+.** Ver passo 4.

**5. Arquivos `._*` e uid 501:staff** vindos do `tar` do macOS. Ver passo 2.

**6. Edite o código no repo local primeiro.** Como não há Git, uma correção feita direto no servidor some no próximo deploy. O fluxo correto é editar `~/Dev/varjota/zap/src/index.js`, validar com `node --check`, e só então transferir.

## Escopo de rede — invariante a preservar

A API **não pode** ser exposta publicamente. Hoje isso está garantido no código (`app.listen(port, '127.0.0.1')`), não por firewall — o `ufw` da máquina está inativo.

Portanto: **nunca adicione um `location` no nginx apontando para 3998**, e nunca troque o bind para `0.0.0.0`. O `verify_zap.sh` testa isso de fora e falha se a porta vazar.
