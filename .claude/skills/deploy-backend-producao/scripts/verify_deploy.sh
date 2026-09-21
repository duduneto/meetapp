#!/usr/bin/env bash
# Verificação pós-deploy do varjotapp-api.
#
# Roda DE FORA do servidor de propósito: curl em 127.0.0.1 de dentro da máquina
# não exercita proxy, TLS nem firewall, e foi justamente por testar de fora que
# o bypass de autenticação apareceu.
#
# Uso:
#   ./verify_deploy.sh                 # verificação completa
#   ./verify_deploy.sh --baseline      # só o baseline das APIs existentes
#                                      # (rode ANTES de mexer no nginx)

set -uo pipefail

DOMAIN="${DOMAIN:-https://srv1088997.hstgr.cloud}"
PREFIX="${PREFIX:-/varjotapp}"
DIRECT="${DIRECT:-http://72.61.32.122:3999}"

# Precisa bater com FRONTEND_ORIGIN do .env no servidor. Se divergir, o teste de
# CORS acusa falha sem haver problema algum — foi o que aconteceu quando o projeto
# migrou de ze-cong para varjotapp. Confira antes de tratar como regressao:
#   grep ^FRONTEND_ORIGIN /root/meetapp/apps/backend/.env
FRONT_ORIGIN="${FRONT_ORIGIN:-https://varjotapp.web.app}"

fail=0

code() { curl -s -o /dev/null -m 10 -w '%{http_code}' "$1" 2>/dev/null || echo "ERR"; }

check() { # descrição, url, esperado
  local got; got=$(code "$2")
  if [ "$got" = "$3" ]; then
    printf '  \033[32mok\033[0m   %-42s %s\n' "$1" "$got"
  else
    printf '  \033[31mFALHA\033[0m %-42s %s (esperado %s)\n' "$1" "$got" "$3"
    fail=$((fail + 1))
  fi
}

echo "== Baseline das APIs existentes (nao podem mudar) =="
check "monolito /"            "$DOMAIN/"            404
check "monolito /health"      "$DOMAIN/health"      200
check "monolito /api"         "$DOMAIN/api"         404
check "monolito /login"       "$DOMAIN/login"       404
check "chat /socket.io/"      "$DOMAIN/socket.io/?EIO=4&transport=polling" 200

if [ "${1:-}" = "--baseline" ]; then
  echo
  echo "Baseline coletado. Guarde para comparar depois da mudanca."
  exit 0
fi

echo
echo "== varjotapp-api via HTTPS =="
check "health"                "$DOMAIN$PREFIX/health" 200
check "redirect sem barra"    "$DOMAIN$PREFIX"        301

echo
echo "== Autenticacao (o item mais critico) =="
# 200 aqui significa que NODE_ENV=production nao esta valendo e a API esta
# aberta ao mundo como admin. Ver armadilha 1 em references/armadilhas.md.
check "/users sem token"      "$DOMAIN$PREFIX/users"  401
check "/me sem token"         "$DOMAIN$PREFIX/me"     401
check "/users porta direta"   "$DIRECT/users"         401

tok=$(curl -s -o /dev/null -m 10 -w '%{http_code}' \
  -H 'Authorization: Bearer token.invalido.aqui' "$DOMAIN$PREFIX/users" 2>/dev/null)
if [ "$tok" = "401" ]; then
  printf '  \033[32mok\033[0m   %-42s %s\n' "/users com token invalido" "$tok"
else
  printf '  \033[31mFALHA\033[0m %-42s %s (esperado 401)\n' "/users com token invalido" "$tok"
  fail=$((fail + 1))
fi

echo
echo "== CORS (origin esperado: $FRONT_ORIGIN) =="
origin_ok=$(curl -s -i -m 10 "$DOMAIN$PREFIX/health" \
  -H "Origin: $FRONT_ORIGIN" 2>/dev/null | grep -ci 'access-control-allow-origin')
origin_bad=$(curl -s -i -m 10 "$DOMAIN$PREFIX/health" \
  -H 'Origin: https://evil.example.com' 2>/dev/null | grep -ci 'access-control-allow-origin')

if [ "$origin_ok" -ge 1 ]; then
  printf '  \033[32mok\033[0m   %-42s presente\n' "origin autorizado recebe header"
else
  printf '  \033[31mFALHA\033[0m %-42s ausente\n' "origin autorizado recebe header"
  fail=$((fail + 1))
fi

if [ "$origin_bad" -eq 0 ]; then
  printf '  \033[32mok\033[0m   %-42s ausente\n' "origin nao autorizado bloqueado"
else
  printf '  \033[31mFALHA\033[0m %-42s presente\n' "origin nao autorizado bloqueado"
  fail=$((fail + 1))
fi

echo
echo "== PM2 (requer SSH; execute no servidor) =="
echo "  pm2 list   -> os 5 processos devem estar 'online' e sem restarts novos"
echo "  pm2 logs varjotapp-api --lines 20 --nostream"

echo
if [ "$fail" -eq 0 ]; then
  echo -e "\033[32mTudo verificado.\033[0m"
else
  echo -e "\033[31m$fail verificacao(oes) falharam.\033[0m"
  echo "Se a falha foi em autenticacao, trate como incidente: a API pode estar"
  echo "aberta como admin. Ver references/armadilhas.md secao 1."
fi
exit "$fail"
