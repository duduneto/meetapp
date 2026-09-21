# BI Simples

Relacionado: [[00 - Indice de Implementacao]], [[02 - Decisoes de Produto]], [[05 - API e Contratos]], [[07 - Participantes]]

## O que foi implementado

Backend:

- `apps/backend/src/modules/reports.ts`

Frontend:

- `apps/frontend/src/pages/BiPage.tsx`

Endpoint:

- `GET /reports/participant-usage`

## Metrica entregue

Para cada participante, o backend retorna:

- `participantId`
- `name`
- `totalAssignments`
- `lastAssignmentAt`
- `lastAssignmentTitle`

## Filtros

O endpoint aceita filtros opcionais:

- `from`
- `to`

Eles filtram pelo periodo da `MeetingWeek.startAt`.

## UI

A tela mostra uma lista simples com:

- Nome do participante.
- Total de designacoes.
- Ultima parte designada quando existir.

## Relacoes

- Usa os dados de [[06 - Edicao em Lote e Historico]].
- Ajuda a decisao manual de distribuicao de designacoes.
- BI avancado por tipo de parte segue em [[09 - Backlog Futuro]].

