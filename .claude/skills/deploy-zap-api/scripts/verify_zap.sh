#!/usr/bin/env bash
# Verificação da zap-api (gateway WhatsApp).
#
# Precisa rodar NO SERVIDOR: a API é loopback, então os testes locais só
# funcionam de dentro. O teste de vazamento, ao contrário, precisa vir de fora —
# ele está no fim e é pulado automaticamente quando executado no servidor.
#
# Uso:
#   ./verify_zap.sh              # no servidor: funcional + isolamento local
#   ./verify_zap.sh --external   # na máquina local: só checa se a porta vazou

set -uo pipefail

PORT="${PORT:-3998}"
HOST_PUB="${HOST_PUB:-72.61.32.122}"
DOMAIN="${DOMAIN:-https://srv1088997.hstgr.cloud}"
ZAP_DIR="${ZAP_DIR:-/root/zap}"

fail=0
ok()   { printf '  \033[32mok\033[0m    %-44s %s\n' "$1" "${2:-}"; }
bad()  { printf '  \033[31mFALHA\033[0m %-44s %s\n' "$1" "${2:-}"; fail=$((fail + 1)); }
warn() { printf '  \033[33maviso\033[0m %-44s %s\n' "$1" "${2:-}"; }

# ---------- modo externo: roda da máquina local ----------
if [ "${1:-}" = "--external" ]; then
  echo "== A porta $PORT vazou para a internet? =="
  code=$(curl -s -o /dev/null -m 8 -w '%{http_code}' "http://$HOST_PUB:$PORT/health" 2>/dev/null)
  # 000 = conexão recusada/timeout, que é exatamente o esperado
  [ "$code" = "000" ] && ok "porta $PORT inacessivel de fora" "(connection refused)" \
                      || bad "porta $PORT RESPONDEU de fora" "HTTP $code — corrija o bind para 127.0.0.1"
  code=$(curl -s -o /dev/null -m 8 -w '%{http_code}' "$DOMAIN/zap/" 2>/dev/null)
  [ "$code" = "404" ] && ok "sem rota /zap no nginx" "404" \
                      || warn "$DOMAIN/zap/ respondeu" "HTTP $code — a API nao deve ter proxy"
  echo
  [ "$fail" -eq 0 ] && echo -e "\033[32mIsolamento confirmado.\033[0m" || echo -e "\033[31m$fail falha(s).\033[0m"
  exit "$fail"
fi

# ---------- modo servidor ----------
echo "== Processo =="
if pm2 describe zap-api >/dev/null 2>&1; then
  status=$(pm2 jlist 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s).find(x=>x.name==="zap-api");console.log(p?p.pm2_env.status:"ausente")})' 2>/dev/null || echo "?")
  [ "$status" = "online" ] && ok "pm2 zap-api" "online" || bad "pm2 zap-api" "status=$status"
else
  bad "pm2 zap-api" "processo nao registrado"
fi

echo
echo "== Bind (invariante: so loopback) =="
bind=$(ss -lntp 2>/dev/null | grep ":$PORT " | awk '{print $4}' | head -1)
case "$bind" in
  127.0.0.1:*) ok "escuta apenas em loopback" "$bind" ;;
  "")          bad "nada escutando na porta $PORT" "processo caiu?" ;;
  *)           bad "BIND EXPOSTO" "$bind — deveria ser 127.0.0.1:$PORT" ;;
esac

echo
echo "== Health =="
body=$(curl -s -m 10 "http://127.0.0.1:$PORT/health" 2>/dev/null)
code=$(curl -s -o /dev/null -m 10 -w '%{http_code}' "http://127.0.0.1:$PORT/health" 2>/dev/null)
case "$code" in
  200) ok "WhatsApp autenticado e pronto" "$body" ;;
  503) warn "processo vivo, WhatsApp NAO autenticado" "$body"
       echo "        -> escaneie o QR: pm2 logs zap-api --lines 40" ;;
  *)   bad "health nao respondeu" "HTTP $code" ;;
esac

echo
echo "== Autenticacao do /messages =="
for h in "" "Authorization: Bearer token-errado"; do
  if [ -z "$h" ]; then label="sem token"; args=(); else label="token invalido"; args=(-H "$h"); fi
  code=$(curl -s -o /dev/null -m 10 -w '%{http_code}' -X POST "http://127.0.0.1:$PORT/messages" \
    "${args[@]}" -H 'Content-Type: application/json' -d '{}' 2>/dev/null)
  [ "$code" = "401" ] && ok "$label rejeitado" "401" || bad "$label" "HTTP $code (esperado 401)"
done

echo
echo "== Estado persistente (nao pode sumir) =="
if [ -d "$ZAP_DIR/.wwebjs_auth/session" ]; then
  ok "sessao do WhatsApp presente" "$(du -sh "$ZAP_DIR/.wwebjs_auth" 2>/dev/null | cut -f1)"
else
  warn "sem .wwebjs_auth/session" "sera necessario escanear o QR"
fi
[ -f "$ZAP_DIR/.env" ] && ok ".env presente" "$(stat -c %a "$ZAP_DIR/.env" 2>/dev/null)" \
                       || bad ".env ausente" "o processo nao sobe sem WHATSAPP_API_TOKEN"

echo
echo "== Acoplamento com o backend varjotapp =="
BE=/root/meetapp/apps/backend/.env
if [ -f "$BE" ]; then
  url=$(grep '^WHATSAPP_API_URL' "$BE" | cut -d= -f2- | tr -d '"')
  if [ -z "$url" ]; then
    bad "WHATSAPP_API_URL ausente no backend" "ele chamaria a si mesmo (default :3999)"
  elif echo "$url" | grep -q ":$PORT"; then
    ok "WHATSAPP_API_URL aponta para a zap" "$url"
  else
    bad "WHATSAPP_API_URL com porta errada" "$url — esperado :$PORT"
  fi
  a=$(grep '^WHATSAPP_API_TOKEN' "$BE"          | sed -E 's/^[^=]+=//; s/"//g' | tr -d '\n' | md5sum | cut -c1-12)
  b=$(grep '^WHATSAPP_API_TOKEN' "$ZAP_DIR/.env" | sed -E 's/^[^=]+=//; s/"//g' | tr -d '\n' | md5sum | cut -c1-12)
  [ "$a" = "$b" ] && ok "tokens batem nos dois .env" "(md5 $a)" \
                  || bad "TOKENS DIFERENTES" "backend=$a zap=$b — o backend levara 401"
else
  warn "backend nao encontrado em $BE" "pulando checagem de acoplamento"
fi

echo
if [ "$fail" -eq 0 ]; then
  echo -e "\033[32mTudo verificado.\033[0m"
  echo "Rode tambem, da sua maquina local: ./verify_zap.sh --external"
else
  echo -e "\033[31m$fail verificacao(oes) falharam.\033[0m"
fi
exit "$fail"
