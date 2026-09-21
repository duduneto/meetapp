# Seguranca e Permissoes

Relacionado: [[03 - Arquitetura Tecnica]], [[05 - API e Contratos]], [[02 - Decisoes de Produto]]

## Autenticacao

- Firebase Authentication valida identidade.
- Backend recebe Firebase ID token.
- Backend consulta a tabela `User`.
- Se o e-mail autenticado nao existir como usuario ativo, o acesso e negado.

## Usuarios e roles

Roles do primeiro release:

- `admin`
- `editor`

Permissoes:

| Acao | Admin | Editor |
| --- | --- | --- |
| Criar/importar reunioes | Sim | Sim |
| Editar designacoes | Sim | Sim |
| Editar campos livres do fim de semana | Sim | Sim |
| Gerenciar participantes | Sim | Sim |
| Gerenciar usuarios | Sim | Nao |
| Gerenciar settings | Sim | Nao |
| Regenerar token anonimo | Sim | Nao |
| Regenerar API key tecnica | Sim | Nao |

## Token anonimo de leitura

- Usado para pagina publica.
- Passado por query param.
- Da acesso de leitura a todas as designacoes da congregacao.
- Pode ser vitalicio e sem expiracao.
- Pode ser revogado/regenerado.
- Armazenar apenas hash no banco.
- Valor puro aparece apenas no momento de geracao/regeneracao.

Exemplo:

```text
/public?token=...
```

## API key tecnica do script

- Separada do token anonimo.
- Usada pelo script de importacao.
- Escopo restrito a criar/importar semanas.
- Nao deve permitir leitura ampla, gestao de usuarios, settings ou designacoes.
- Armazenar apenas hash no banco.
- Valor puro aparece apenas no momento de geracao/regeneracao.
- Admin pode regenerar pela tela de settings.

## Publico anonimo

- Usuario anonimo nao e `User`.
- Usuario anonimo nao pode escrever.
- Usuario anonimo nao deve acessar endpoints autenticados.
- Toda alteracao salva por usuarios autenticados aparece imediatamente na pagina publica.

## Historico

Historico registra alteracoes feitas por usuarios autenticados.

Campos:

- `changedByUserId`
- `changedAt`
- `entityType`
- `entityId`
- `field`
- `previousValue`
- `newValue`

## Consideracoes de privacidade

- O link publico deve expor somente o necessario para consulta das designacoes.
- Cuidado ao incluir telefone/WhatsApp em payloads publicos. Por padrao, a pagina publica deve mostrar apenas os nomes designados, nao dados de contato.
- Participantes deletados continuam aparecendo em designacoes antigas, mas nao devem retornar em listas publicas de participantes.

