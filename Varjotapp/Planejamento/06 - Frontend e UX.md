# Frontend e UX

Relacionado: [[02 - Decisoes de Produto]], [[05 - API e Contratos]], [[08 - Plano de Implementacao]]

## Principios

- UI em Portugues.
- Codigo e entidades em Ingles.
- Interface responsiva, incluindo mobile.
- shadcn como base, com estilos customizados.
- Componentizacao forte para reuso.
- Telas funcionais desde o primeiro acesso, sem landing page.

## Navegacao autenticada

Telas do primeiro release:

- Designacoes.
- Participantes.
- BI.
- Usuarios.
- Settings.

Historico aparece no contexto da reuniao ou participante; nao havera tela global dedicada no primeiro release.

## Fluxo de designacoes

1. Usuario abre Designacoes.
2. Sistema mostra meses.
3. Usuario clica em um mes.
4. Sistema mostra as semanas daquele mes.
5. Usuario clica em uma semana.
6. Sistema mostra opcoes:
   - Meio de Semana.
   - Final de Semana.
7. Usuario escolhe o tipo de reuniao.
8. Frontend consulta API e renderiza a tabela.

## Rotas autenticadas

Usar combinacao publica tambem na area autenticada:

```text
/app/assignments/2026/44/midweek
/app/assignments/2026/44/weekend
```

O backend resolve internamente para `MeetingWeek` e `Meeting`.

## Rotas publicas

Pagina publica com token em query param:

```text
/public?token=...
```

Links diretos:

```text
/public?token=...&year=2026&week=44&type=midweek
/public?token=...&year=2026&week=44&type=weekend
```

Sem `year`, `week` e `type`, a pagina publica abre a navegacao normal por mes e semana.

## Tabelas

Havera duas tabelas principais:

- `MidweekMeetingTable`
- `WeekendMeetingTable`

Elas podem compartilhar subcomponentes:

- `MeetingTableHeader`
- `AssignmentRow`
- `AssignmentSlot`
- `EmptyAssignment`
- `EditableParticipantSelect`
- `PrintableMeetingTable`

Nao forcar uma unica tabela generica para os dois tipos de reuniao, porque os layouts e campos possuem diferencas reais.

## Edicao

Comportamento:

- A tabela abre em modo leitura.
- Se o usuario logado tiver permissao de escrita, exibir botao `Editar` no topo.
- Ao clicar em `Editar`, a tabela entra em modo editavel.
- Usuario altera designacoes e, no fim de semana, campos livres.
- Usuario clica em `Salvar`.
- Frontend envia alteracoes em lote.
- Backend persiste, registra historico e retorna payload atualizado.
- Frontend volta para modo visualizacao com os dados recarregados.

Nao se preocupar com race condition no primeiro release.

## Participantes

Tela deve permitir:

- Listar participantes ativos.
- Criar participante.
- Editar participante.
- Excluir participante com soft delete.
- Ver aba/filtro de excluidos.
- Restaurar participante excluido.

Campos:

- Nome.
- Genero.
- Telefone.
- WhatsApp.

Telefone e WhatsApp sao strings livres. O uso do WhatsApp deve considerar que o valor pode nao existir.

## BI

Primeira versao:

- Contagem total de designacoes por participante.
- Ultima designacao de cada participante.
- Filtro de periodo opcional.

## PDF

- PDF sera gerado no frontend.
- A fonte do PDF e a mesma tabela renderizada.
- A tabela de impressao deve manter layout limpo e proximo dos exemplos existentes.
- O backend nao gera PDF no primeiro release.

## Estados vazios

Estados importantes:

- Mes sem semanas.
- Semana sem designacoes preenchidas.
- Slot sem designacao: exibir `Sem Designacao`.
- Participante deletado usado em designacao antiga: manter exibicao do nome.
- Token publico invalido: exibir tela simples de link invalido.

