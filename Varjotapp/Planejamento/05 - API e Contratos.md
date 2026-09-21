# API e Contratos

Relacionado: [[03 - Arquitetura Tecnica]], [[04 - Modelo de Dados]], [[06 - Frontend e UX]], [[07 - Seguranca e Permissoes]]

## Principios

- Backend entrega payloads prontos para renderizar tabelas.
- Frontend nao deve reconstruir regras de estrutura.
- API deve separar endpoints autenticados, endpoints publicos e endpoint tecnico do script.
- Todas as respostas devem respeitar a congregacao do usuario/token/chave.

## Autenticacao e sessao

### `GET /me`

Retorna usuario autenticado e permissoes.

Entrada:

- Firebase ID token no header.

Saida sugerida:

```json
{
  "user": {
    "id": "user-id",
    "email": "admin@example.com",
    "name": "Admin",
    "role": "admin",
    "congregationId": "congregation-id"
  },
  "permissions": {
    "canWriteAssignments": true,
    "canManageUsers": true,
    "canManageSettings": true
  }
}
```

## Navegacao de designacoes

### `GET /assignment-months`

Lista meses com semanas disponiveis, agrupados por `MeetingWeek.startAt`.

### `GET /assignment-months/:year/:month/weeks`

Lista semanas do mes.

Cada item deve trazer:

- `year`
- `yearWeek`
- `startAt`
- `endAt`
- `hasMidweek`
- `hasWeekend`

Como toda semana deve ter ambas as reunioes, `hasMidweek` e `hasWeekend` tendem a ser verdadeiros, mas podem ajudar em validacoes.

### `GET /assignments/:year/:week/:type`

Retorna payload pronto para renderizar uma tabela.

`type`:

- `midweek`
- `weekend`

Saida para meio de semana:

```json
{
  "meeting": {
    "type": "midweek",
    "year": 2026,
    "week": 44,
    "startAt": "2026-10-26T03:00:00.000Z",
    "endAt": "2026-11-01T03:00:00.000Z",
    "bibleReading": "JEREMIAS 47-48"
  },
  "table": {
    "songs": {
      "initial": "Cantico 125",
      "transitional": "Cantico 158",
      "last": "Cantico 54"
    },
    "sections": []
  },
  "canWrite": true
}
```

Saida para fim de semana:

```json
{
  "meeting": {
    "type": "weekend",
    "year": 2026,
    "week": 44,
    "startAt": "2026-10-26T03:00:00.000Z",
    "endAt": "2026-11-01T03:00:00.000Z",
    "publicTalkTheme": "Tema",
    "publicSpeakerName": "Nome",
    "publicSpeakerCongregation": "Congregacao"
  },
  "table": {
    "sections": []
  },
  "canWrite": true
}
```

## Edicao em lote

### `PUT /assignments/:year/:week/:type`

Usado quando o usuario clica em `Editar`, altera a tabela e clica em `Salvar`.

Regras:

- Requer role `admin` ou `editor`.
- Salvar em transacao.
- Registrar historico por designacao/campo livre alterado.
- Recarregar o payload atualizado apos salvar.
- Nao precisa validar concorrencia no primeiro release.

Payload conceitual:

```json
{
  "assignments": [
    {
      "partKey": "ministery.0",
      "position": 1,
      "participantId": "participant-id"
    }
  ],
  "weekendFields": {
    "publicTalkTheme": "Tema",
    "publicSpeakerName": "Nome",
    "publicSpeakerCongregation": "Congregacao"
  }
}
```

## Importacao pelo script

### `POST /script/import-midweek`

Recebe o JSON atual do script.

Autenticacao:

- API key tecnica da congregacao.
- A chave deve ser comparada por hash.

Regras:

- Criar `MeetingWeek`.
- Criar `Meeting` de tipo `midweek`.
- Criar automaticamente `Meeting` de tipo `weekend` vazia.
- Normalizar estrutura relacional a partir do JSON atual.
- Salvar `rawSourcePayload`.
- Se a semana ja existir, bloquear por padrao.

### `POST /script/import-midweek/:ref/confirm-update`

Endpoint conceitual para acao manual de idempotencia.

Regras:

- Atualizar dados importados sem modificar designacoes existentes.
- Preservar por chave tecnica estavel.
- Registrar alteracoes relevantes se afetarem campos auditados.

## Participantes

Endpoints sugeridos:

- `GET /participants`
- `POST /participants`
- `PUT /participants/:id`
- `DELETE /participants/:id`
- `POST /participants/:id/restore`

Regras:

- Delete preenche `deletedAt`.
- Restore define `deletedAt = null`.
- Listagem deve permitir filtro de excluidos.

## BI simples

### `GET /reports/participant-usage`

Metrica inicial:

- Total de designacoes por participante.
- Ultima designacao por participante.
- Filtro de periodo opcional.

## Usuarios e settings

Endpoints admin:

- `GET /users`
- `POST /users`
- `PUT /users/:id`
- `GET /settings`
- `PUT /settings`
- `POST /settings/anonymous-token/regenerate`
- `POST /settings/script-api-key/regenerate`

## API publica

### `GET /public/assignment-months?token=...`

Lista meses publicos.

### `GET /public/assignment-months/:year/:month/weeks?token=...`

Lista semanas publicas.

### `GET /public/assignments/:year/:week/:type?token=...`

Retorna a tabela em modo leitura.

Tambem deve suportar abertura direta pelo frontend:

```text
/public?token=...&year=2026&week=44&type=midweek
/public?token=...&year=2026&week=44&type=weekend
```

