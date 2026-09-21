# Plano de Implementacao

Relacionado: [[01 - Visao Geral do Sistema]], [[03 - Arquitetura Tecnica]], [[04 - Modelo de Dados]], [[05 - API e Contratos]], [[06 - Frontend e UX]], [[07 - Seguranca e Permissoes]]

## Principio de entrega

Implementar em fatias verticais pequenas, mantendo a migracao gradativa. Cada fase deve deixar o sistema mais usavel, mesmo que ainda simples.

## Fase 1 - Fundacao do projeto

Objetivo: criar a base tecnica para backend, frontend e banco.

Tarefas:

- Criar monorepo ou estrutura inicial com apps `frontend` e `backend`.
- Configurar TypeScript nos dois lados.
- Configurar React, shadcn e estilos base.
- Configurar Express.
- Configurar Prisma e Postgres.
- Criar `.env` separados para backend e frontend.
- Criar seed inicial de `Congregation`, `CongregationSettings` e primeiro `admin`.

Referencias:

- [[01 - Visao Geral do Sistema]]
- [[03 - Arquitetura Tecnica]]

## Fase 2 - Modelo de dados e autenticacao

Objetivo: permitir login e autorizacao por usuario do banco.

Tarefas:

- Criar models Prisma principais.
- Implementar validacao Firebase no backend.
- Implementar middleware de usuario ativo.
- Implementar roles `admin` e `editor`.
- Implementar endpoint `GET /me`.
- Criar tela/login e layout autenticado.

Referencias:

- [[04 - Modelo de Dados]]
- [[07 - Seguranca e Permissoes]]

## Fase 3 - Participantes

Objetivo: cadastrar e gerenciar participantes antes de montar designacoes.

Tarefas:

- Implementar CRUD de participantes.
- Implementar soft delete com `deletedAt`.
- Implementar restauracao.
- Criar tela de participantes com ativos e excluidos.
- Garantir que participantes deletados nao aparecem em novas selecoes.

Referencias:

- [[02 - Decisoes de Produto]]
- [[06 - Frontend e UX]]

## Fase 4 - Importacao e estrutura de semana

Objetivo: transformar o JSON atual do script em dados relacionais.

Tarefas:

- Criar endpoint tecnico com API key hash.
- Receber o JSON atual do script.
- Criar `MeetingWeek`.
- Criar `Meeting` de meio de semana.
- Criar automaticamente `Meeting` de fim de semana vazia.
- Normalizar secoes, partes e slots.
- Salvar `rawSourcePayload`.
- Bloquear importacao duplicada por padrao.
- Preparar fluxo manual de confirmacao para atualizacao idempotente sem modificar designacoes.

Referencias:

- [[04 - Modelo de Dados]]
- [[05 - API e Contratos]]
- [[07 - Seguranca e Permissoes]]

## Fase 5 - Navegacao de designacoes

Objetivo: permitir navegar por mes, semana e tipo de reuniao.

Tarefas:

- Implementar endpoints de meses.
- Implementar endpoints de semanas por mes.
- Criar tela de meses.
- Criar tela de semanas.
- Criar rotas autenticadas por `year/week/type`.
- Criar pagina publica com `token` em query param.
- Suportar links publicos diretos por `year`, `week` e `type`.

Referencias:

- [[02 - Decisoes de Produto]]
- [[05 - API e Contratos]]
- [[06 - Frontend e UX]]

## Fase 6 - Tabelas de reuniao

Objetivo: renderizar as escalas a partir de payload pronto do backend.

Tarefas:

- Implementar payload de tabela para meio de semana.
- Implementar payload de tabela para fim de semana.
- Criar `MidweekMeetingTable`.
- Criar `WeekendMeetingTable`.
- Criar componentes compartilhados menores.
- Exibir `Sem Designacao` em slots vazios.
- Garantir que pagina publica seja somente leitura.

Referencias:

- [[05 - API e Contratos]]
- [[06 - Frontend e UX]]

## Fase 7 - Edicao em lote e historico

Objetivo: permitir alterar designacoes e campos livres com auditoria.

Tarefas:

- Exibir botao `Editar` para usuarios com permissao de escrita.
- Alternar tabela para modo editavel.
- Alterar designacoes em lote.
- Alterar campos livres do fim de semana em lote.
- Salvar em uma unica requisicao.
- Persistir em transacao.
- Registrar historico por campo/designacao alterada.
- Recarregar payload atualizado apos salvar.

Referencias:

- [[02 - Decisoes de Produto]]
- [[05 - API e Contratos]]
- [[06 - Frontend e UX]]

## Fase 8 - Usuarios e settings

Objetivo: permitir operacao sem acesso manual ao banco.

Tarefas:

- Criar tela de usuarios para `admin`.
- Criar/editar usuarios `admin` e `editor`.
- Criar tela de settings.
- Editar `name`, `timezone`, `midweekDefaultWeekday` e `weekendDefaultWeekday`.
- Regenerar token anonimo.
- Regenerar API key tecnica.
- Mostrar segredo puro somente no momento da geracao/regeneracao.

Referencias:

- [[04 - Modelo de Dados]]
- [[07 - Seguranca e Permissoes]]

## Fase 9 - BI simples

Objetivo: entregar consultas basicas para distribuicao melhor das designacoes.

Tarefas:

- Criar endpoint de uso por participante.
- Calcular total de designacoes por participante.
- Calcular ultima designacao por participante.
- Permitir filtro por periodo opcional.
- Criar tela de BI.

Referencias:

- [[02 - Decisoes de Produto]]
- [[05 - API e Contratos]]

## Fase 10 - PDF no frontend

Objetivo: imprimir/exportar a tabela visualizada.

Tarefas:

- Implementar modo de impressao/exportacao no frontend.
- Usar a tabela renderizada como fonte do PDF.
- Ajustar estilos para papel.
- Testar meio de semana e fim de semana.
- Garantir layout responsivo sem quebrar a experiencia mobile.

Referencias:

- [[06 - Frontend e UX]]

## Marcos de validacao

- Usuario autenticado consegue entrar e ver seu role.
- Admin consegue criar editor.
- Editor consegue importar semana via script/API key.
- Ao importar meio de semana, fim de semana vazia e criada automaticamente.
- UI mostra mes, semanas e os dois tipos de reuniao.
- Usuario com escrita edita tabela em lote e salva.
- Historico registra alteracoes.
- Link anonimo por query param abre as designacoes em modo leitura.
- PDF gerado no frontend reflete a tabela exibida.

