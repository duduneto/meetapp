# Visao Geral do Sistema

Relacionado: [[02 - Decisoes de Produto]], [[03 - Arquitetura Tecnica]], [[08 - Plano de Implementacao]]

## Objetivo

O Varjotapp sera um sistema web responsivo para gerenciar designacoes teocraticas de atividades congregacionais das Testemunhas de Jeova.

O sistema deve apoiar uma mudanca gradativa a partir do fluxo atual. A primeira versao nao precisa substituir tudo de uma vez, mas deve entregar um recorte operacional completo para criar/importar semanas, preencher designacoes, consultar participantes, gerar tabelas e imprimir/exportar PDF pelo frontend.

## Stack decidida

- Frontend: React web com TypeScript.
- UI: shadcn com estilos customizados.
- Backend: Node.js com TypeScript e Express.
- Banco: Postgres.
- ORM: Prisma.
- Login: Firebase Authentication.
- Autorizacao: tabela `User` no banco do Varjotapp.
- Idioma da UI: Portugues.
- Idioma do codigo, entidades e banco: Ingles.

## Dominio principal

O sistema gira em torno de:

- `Congregation`: nucleo isolado para dados, usuarios, participantes, reunioes e settings.
- `MeetingWeek`: semana importada/criada, agrupando sempre duas reunioes.
- `Meeting`: uma reuniao de meio de semana e uma reuniao de fim de semana por semana.
- `Participant`: pessoa designavel nas partes.
- `User`: pessoa que acessa e escreve no sistema, separada de participante.
- `Assignment`: vinculo entre participante e parte/slot da reuniao.
- Historico: registro das alteracoes de designacoes e campos livres do fim de semana.

## Escopo do primeiro release

Entram no primeiro release:

- Login com Firebase e validacao contra tabela `User`.
- Congregacao unica na pratica, mas modelada como multi-congregacao.
- Usuarios com roles `admin` e `editor`.
- Cadastro de participantes com soft delete e restauracao.
- Importacao de semana de meio de semana pelo JSON atual do script.
- Criacao automatica da reuniao de fim de semana vazia ao criar/importar a reuniao de meio de semana.
- Navegacao por mes, semanas e tipo de reuniao.
- Tabelas separadas para meio de semana e fim de semana.
- Edicao em lote das tabelas quando o usuario tiver permissao de escrita.
- Historico de alteracoes de designacoes e campos livres.
- Leitura anonima por token em query param.
- PDF gerado no frontend a partir da tabela renderizada.
- BI simples: contagem total de designacoes por participante e ultima designacao por participante, com filtro de periodo opcional.

## Fora do primeiro release

Nao entram no primeiro release:

- UI para criar ou trocar congregacoes.
- Controle de concorrencia entre editores.
- Workflow de rascunho/publicacao.
- Elegibilidade por tipo de parte.
- Normalizacao de telefone/WhatsApp.
- BI avancado por tipo de parte.
- Edicao livre para adicionar/remover/reordenar partes da reuniao de meio de semana.
- Geracao server-side de PDF.

