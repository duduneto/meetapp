# Decisoes de Produto

Relacionado: [[01 - Visao Geral do Sistema]], [[06 - Frontend e UX]], [[08 - Plano de Implementacao]]

## Estrategia de migracao

- A mudanca sera gradativa.
- O primeiro release deve cobrir tanto reuniao de meio de semana quanto reuniao de fim de semana.
- O sistema deve conviver com o fluxo atual enquanto passa a centralizar dados estruturados, historico e consultas.

## Navegacao de designacoes

A navegacao principal sera:

1. Meses.
2. Semanas do mes.
3. Opcoes de reuniao da semana:
   - Meio de Semana.
   - Final de Semana.
4. Consulta ao backend e renderizacao da tabela.

O agrupamento por mes sera calculado por `MeetingWeek.startAt`.

A semana deve ser exibida na UI pelo intervalo `startAt` ate `endAt`. O `yearWeek` continua existindo como chave tecnica e para links, mas nao precisa aparecer como destaque principal.

## Criacao de reunioes

- Toda semana sempre tera duas reunioes: `midweek` e `weekend`.
- O fluxo canonico comeca pela criacao/importacao da reuniao de meio de semana.
- Ao criar/importar a reuniao de meio de semana, o backend cria automaticamente a reuniao de fim de semana vazia, usando estrutura fixa padrao.
- A criacao deve acontecer em transacao.

## Reimportacao e idempotencia

- Se o script tentar importar uma semana que ja existe, o backend deve bloquear por padrao.
- A operacao so segue com idempotencia apos uma acao manual explicita.
- Durante a atualizacao manual/idempotente, designacoes existentes nunca devem ser modificadas automaticamente.
- A preservacao de designacoes deve ocorrer por chave tecnica estavel da parte, nao por titulo.

## Chaves tecnicas das partes

As partes devem ter `sectionKey`/`partKey` estavel.

Exemplos para meio de semana:

- `treasures.0`
- `treasures.1`
- `treasures.2`
- `ministery.0`
- `ministery.1`
- `christianLife.0`
- `christianLife.1`
- `president`
- `initial_prayer`
- `final_prayer`
- `indicators`
- `volants`

Titulo, label e texto sao conteudo editavel/importavel; nao devem ser usados como identidade da parte.

## Elegibilidade de participantes

- Na primeira versao, qualquer participante pode ser designado em qualquer parte.
- Nao havera bloqueios por genero, qualificacao ou tipo de parte.
- Participantes com soft delete nao aparecem em novas selecoes, mas continuam preservados nas designacoes antigas.

## Slots e labels

- Partes podem permitir ate 2 participantes.
- Cada designacao usa posicao numerica estavel: `position: 1`, `position: 2`.
- O label exibido e configuravel no slot/parte.
- Exemplos de labels: `Publicador`, `Ajudante`, `Dirigente`, `Leitor`.

## Campos livres do fim de semana

Campos livres nao serao modelados como designacoes:

- `publicTalkTheme`
- `publicSpeakerName`
- `publicSpeakerCongregation`

Esses campos pertencem a reuniao de fim de semana. Eles entram no historico de alteracoes.

## Historico

O historico deve registrar:

- Designacoes de participantes.
- Campos livres do fim de semana.

Campos minimos:

- Quem mudou.
- Quando mudou.
- Valor anterior.
- Valor novo.

Nao havera comentario/motivo obrigatorio.

## Publicacao

- Nao existira rascunho/publicacao no primeiro release.
- Tudo que for salvo e considerado publicado.
- O link anonimo valido deve enxergar imediatamente as alteracoes salvas.

## Participantes

- Participantes possuem `phone` e `whatsapp` como strings livres e opcionais.
- O frontend deve tratar `whatsapp` com optional chaining.
- Delete de participante sera soft delete com `deletedAt`.
- Restaurar participante remove `deletedAt`, deixando `deletedAt = null`.
- A tela de participantes deve ter filtro/aba para ativos e excluidos.

