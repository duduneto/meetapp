# Banco de Dados e Seed

Relacionado: [[00 - Indice de Implementacao]], [[04 - Modelo de Dados]], [[03 - Arquitetura Tecnica]], [[11 - Setup Local e Validacao]]

## O que foi implementado

Foi criado o schema Prisma em:

- `apps/backend/prisma/schema.prisma`

Foi criada a migration inicial em:

- `apps/backend/prisma/migrations/20260630160000_init/migration.sql`

Foi criado o seed inicial em:

- `apps/backend/prisma/seed.ts`

## Entidades criadas

O banco implementa as entidades descritas em [[04 - Modelo de Dados]]:

- `Congregation`
- `CongregationSettings`
- `User`
- `Participant`
- `MeetingWeek`
- `Meeting`
- `MeetingSection`
- `MeetingPart`
- `MeetingPartSlot`
- `Assignment`
- `AuditLog`

## Regras importantes no schema

- `MeetingWeek` e unica por `congregationId + ref`.
- `MeetingWeek` tambem e unica por `congregationId + year + yearWeek`.
- `Meeting` e unica por `meetingWeekId + type`.
- `MeetingSection` usa `sectionKey` estavel por reuniao.
- `MeetingPart` usa `partKey` estavel por secao.
- `MeetingPartSlot` usa `position` estavel por parte.
- `Assignment` garante no maximo uma designacao por slot.
- `Participant.deletedAt` habilita soft delete.

## Seed inicial

O seed cria:

- Congregacao inicial.
- Settings iniciais.
- Usuario admin `admin@varjotapp.local`.
- Participantes de exemplo.
- Token publico inicial.
- API key tecnica inicial.

Os segredos puros sao impressos no momento do seed. Os hashes ficam em `CongregationSettings`, conforme [[07 - Seguranca e Permissoes]].

## Relacoes

- [[03 - Autenticacao e Permissoes]] usa `User` e `CongregationSettings`.
- [[04 - Importacao de Semanas]] cria `MeetingWeek`, `Meeting`, secoes, partes e slots.
- [[06 - Edicao em Lote e Historico]] grava `Assignment` e `AuditLog`.
- [[09 - BI Simples]] consulta `Participant` e `Assignment`.

