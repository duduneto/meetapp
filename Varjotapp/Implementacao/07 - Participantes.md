# Participantes

Relacionado: [[00 - Indice de Implementacao]], [[02 - Decisoes de Produto]], [[04 - Modelo de Dados]], [[06 - Frontend e UX]]

## O que foi implementado

Backend:

- `apps/backend/src/modules/participants.ts`

Frontend:

- `apps/frontend/src/pages/ParticipantsPage.tsx`

## Endpoints

- `GET /participants`
- `GET /participants?deleted=true`
- `POST /participants`
- `PUT /participants/:id`
- `DELETE /participants/:id`
- `POST /participants/:id/restore`

## Campos

- `name`
- `gender`
- `phone`
- `whatsapp`
- `deletedAt`

## Regras

- Delete e soft delete: preenche `deletedAt`.
- Restore limpa `deletedAt`.
- A listagem padrao mostra participantes ativos.
- A listagem com `deleted=true` mostra participantes excluidos.
- Participantes excluidos continuam preservados em designacoes antigas.
- Participantes excluidos nao aparecem nas novas selecoes da tabela.

## UI

A tela possui:

- Alternancia entre Ativos e Excluidos.
- Criacao rapida de participante.
- Exclusao de participante ativo.
- Restauracao de participante excluido.

## Relacoes

- [[06 - Edicao em Lote e Historico]] usa participantes ativos para novas designacoes.
- [[09 - BI Simples]] calcula uso por participante.
- [[10 - Pagina Publica e Impressao]] exibe apenas o nome designado.

