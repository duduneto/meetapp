# Edicao em Lote e Historico

Relacionado: [[00 - Indice de Implementacao]], [[02 - Decisoes de Produto]], [[05 - API e Contratos]], [[07 - Seguranca e Permissoes]], [[05 - Navegacao e Tabelas de Designacoes]]

## O que foi implementado

Backend:

- `PUT /assignments/:year/:week/:type`
- `apps/backend/src/modules/assignments.ts`

Frontend:

- `apps/frontend/src/components/MeetingTable.tsx`

## Fluxo de edicao

1. A tabela abre em modo leitura.
2. Se `canWrite` for verdadeiro, aparece o botao `Editar`.
3. A UI troca os slots designaveis para selects de participantes ativos.
4. No fim de semana, os campos livres tambem ficam editaveis.
5. O usuario salva tudo em uma unica requisicao.
6. O backend persiste em transacao.
7. O backend registra historico por mudanca.
8. O payload atualizado e retornado para a tela.

## Payload de escrita

O frontend envia:

- `assignments`: lista de `partKey`, `position` e `participantId`.
- `weekendFields`: campos livres do fim de semana, quando aplicavel.

## Regras implementadas

- Requer usuario autenticado.
- Requer role `admin` ou `editor`.
- Participantes com `deletedAt` nao podem ser escolhidos em novas designacoes.
- Remover uma designacao apaga o `Assignment` do slot.
- Alterar uma designacao usa `upsert` por slot.
- Campos livres do fim de semana entram no historico.

## Historico

As alteracoes criam registros em `AuditLog` com:

- `congregationId`
- `changedByUserId`
- `entityType`
- `entityId`
- `field`
- `previousValue`
- `newValue`

## Relacoes

- Usa os slots criados por [[04 - Importacao de Semanas]].
- Respeita permissoes de [[03 - Autenticacao e Permissoes]].
- Alimenta consultas futuras de auditoria alem do escopo inicial.

