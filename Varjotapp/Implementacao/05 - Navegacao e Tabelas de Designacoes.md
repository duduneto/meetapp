# Navegacao e Tabelas de Designacoes

Relacionado: [[00 - Indice de Implementacao]], [[05 - API e Contratos]], [[06 - Frontend e UX]], [[06 - Edicao em Lote e Historico]]

## O que foi implementado

Backend:

- `apps/backend/src/modules/assignments.ts`

Frontend:

- `apps/frontend/src/pages/AssignmentsIndexPage.tsx`
- `apps/frontend/src/pages/AssignmentPage.tsx`
- `apps/frontend/src/components/MeetingTable.tsx`

## Endpoints autenticados

- `GET /assignment-months`
- `GET /assignment-months/:year/:month/weeks`
- `GET /assignments/:year/:week/:type`

## Rotas frontend

- `/app/assignments`
- `/app/assignments/:year/:week/:type`

Tipos aceitos na pratica:

- `midweek`
- `weekend`

## Payload de tabela

O backend entrega um payload pronto para renderizar:

- Dados da reuniao.
- Intervalo da semana.
- Leitura biblica quando houver.
- Campos livres do fim de semana.
- Secoes ordenadas.
- Partes ordenadas.
- Slots ordenados.
- Participante designado ou `null`.
- `canWrite`.

Essa decisao segue o principio de [[05 - API e Contratos]]: o frontend nao reconstrui regras de estrutura.

## Comportamento da UI

A tela de designacoes mostra:

1. Meses disponiveis.
2. Semanas do mes selecionado.
3. Links para Meio de Semana e Final de Semana.
4. Tabela pronta da reuniao.

Slots vazios exibem:

- `Sem Designacao`

## Relacoes

- [[04 - Importacao de Semanas]] cria os dados consumidos por esta feature.
- [[06 - Edicao em Lote e Historico]] altera designacoes dentro desta tabela.
- [[10 - Pagina Publica e Impressao]] reutiliza a tabela em modo somente leitura.

