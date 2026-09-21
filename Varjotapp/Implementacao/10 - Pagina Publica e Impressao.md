# Pagina Publica e Impressao

Relacionado: [[00 - Indice de Implementacao]], [[07 - Seguranca e Permissoes]], [[05 - API e Contratos]], [[06 - Frontend e UX]], [[05 - Navegacao e Tabelas de Designacoes]]

## O que foi implementado

Backend publico:

- `apps/backend/src/modules/publicRoutes.ts`

Frontend publico:

- `apps/frontend/src/pages/PublicPage.tsx`

Tabela compartilhada:

- `apps/frontend/src/components/MeetingTable.tsx`

## Endpoints publicos

- `GET /public/assignment-months?token=...`
- `GET /public/assignment-months/:year/:month/weeks?token=...`
- `GET /public/assignments/:year/:week/:type?token=...`

## Link direto implementado

Frontend:

```text
/public?token=...&year=2026&week=27&type=midweek
```

A pagina publica exige link direto com `year`, `week` e `type` nesta primeira implementacao.

## Regras

- O token anonimo e comparado contra hash em `CongregationSettings`.
- Usuario publico nao e `User`.
- O payload publico retorna `canWrite: false`.
- A tabela publica nao mostra botao de editar.
- Dados de contato de participantes nao sao expostos na tabela publica.

## Impressao/PDF

A impressao foi implementada no frontend com:

- Botao de imprimir.
- `window.print()`.
- CSS `@media print`.

Isso prepara a geracao de PDF pelo navegador a partir da tabela renderizada, conforme [[06 - Frontend e UX]].

## Relacoes

- Usa o token gerenciado em [[08 - Usuarios e Settings]].
- Reutiliza o payload de tabela de [[05 - Navegacao e Tabelas de Designacoes]].
- Recebe alteracoes imediatamente apos [[06 - Edicao em Lote e Historico]] salvar.

