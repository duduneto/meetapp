# Importacao de Semanas

Relacionado: [[00 - Indice de Implementacao]], [[05 - API e Contratos]], [[02 - Decisoes de Produto]], [[02 - Banco de Dados e Seed]]

## O que foi implementado

A importacao tecnica fica em:

- `apps/backend/src/modules/scriptImport.ts`
- `apps/backend/src/modules/meetingStructures.ts`

Endpoint:

- `POST /script/import-midweek`

Autenticacao:

- Header `x-api-key`.
- Comparacao contra `scriptApiKeyHash` em `CongregationSettings`.

## Fluxo

1. O backend valida a API key tecnica.
2. O payload legado e aceito com `ref`, `year`, `yearWeek`, `startAt`, `endAt`, `bibleReading`, `songs`, `treasures`, `ministery` e `christianLife`.
3. Se `ref` ja existir para a congregacao, a importacao retorna conflito.
4. Em uma transacao, o backend cria:
   - `MeetingWeek`.
   - `Meeting` tipo `midweek`.
   - `Meeting` tipo `weekend`.
   - Estrutura relacional de secoes, partes e slots para o meio de semana.
   - Estrutura padrao de fim de semana.
5. O payload original fica salvo em `rawSourcePayload`.

## Estrutura de meio de semana

O JSON legado do scraper e normalizado assim:

- `treasures.sections` vira a secao `treasures`, com uma vaga por parte.
- `ministery.sections` vira a secao `ministery`, com vagas de `Publicador` e `Ajudante`.
- `christianLife.sections` vira a secao `christianLife`; a ultima parte recebe vagas de `Dirigente` e `Leitor`.
- Abertura e encerramento recebem as partes fixas `president`, `initial_prayer`, `indicators`, `volants` e `final_prayer`.
- `songs` permanece no payload original e e devolvido na tabela de Designacoes.

O campo legado `month` e zero-based. O backend calcula o mes canonico (1 a 12) usando `startAt`, portanto uma semana iniciada em outubro e listada como mes `10` mesmo quando o JSON traz `month: 9`.

Se o payload trouxer `sections`, a estrutura importada usa:

- `sectionKey`
- `title`
- `parts`
- `partKey`
- `slots`

Se nao trouxer nem `sections` nem os grupos legados, o backend cria uma estrutura padrao inicial.

## Uso pelo scraper

`apps/jw_scrapper/script.js` extrai a semana aberta no WOL e envia o resultado para `POST /script/import-midweek`. A URL da API fica salva no `localStorage`; a API key e solicitada a cada execucao e nao e persistida.

Para permitir a chamada do navegador, configure a origem separadamente:

```dotenv
SCRIPT_IMPORT_ORIGINS="https://wol.jw.org"
```

Mais de uma origem pode ser informada, separada por virgula.

## Estrutura de fim de semana

A estrutura padrao criada inclui:

- Abertura.
- Discurso publico.
- Estudo de A Sentinela.

Campos livres como tema e orador ficam na propria `Meeting`, conforme [[02 - Decisoes de Produto]].

## Ponto ainda conceitual

O endpoint:

- `POST /script/import-midweek/:ref/confirm-update`

foi deixado como `501`. O bloqueio de duplicidade ja existe; a atualizacao idempotente manual ainda precisa ser detalhada e implementada em uma proxima iteracao.

Relacionado ao backlog: [[09 - Backlog Futuro]].
