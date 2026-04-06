# Design: Reordenação de itens no lobby via drag-and-drop

**Data:** 2026-04-06  
**Status:** Aprovado

---

## Visão geral

O criador do torneio poderá reordenar os itens do chaveamento na sala de espera (lobby), antes de iniciar o torneio. A ordem dos itens determina os seeds, que por sua vez determinam as disputas da rodada 1. A reordenação usa drag-and-drop com efeito visual suave ("cola").

---

## Contexto

Hoje os seeds são atribuídos na ordem em que os itens foram digitados no formulário de criação. O bracket é gerado na criação via `generateFirstRoundPairs(n)`, que usa `seedPositions(n)` para parear seeds. O criador não tinha como ajustar isso após criar o torneio.

---

## Regras de negócio

- Somente o criador pode reordenar.
- Reordenação só é possível enquanto o torneio está em status `LOBBY`.
- **Bloqueado** se qualquer participante tiver `hasSubmittedPicks = true`. Nenhuma exceção.
- Cada soltura do drag salva automaticamente (sem botão de confirmar).
- Participantes não-criadores não veem a interface de drag.

---

## API

### `PATCH /api/tournaments/[code]/items/order`

**Auth:** `requireCreator`

**Body:**
```json
{ "itemIds": ["id1", "id2", "id3", "id4"] }
```
Lista completa de IDs na nova ordem desejada (seed = posição + 1).

**Validações (em sequência):**
1. Token válido e pertence ao criador → 401/403
2. Torneio em status `LOBBY` → 409 se não
3. Nenhum participante com `hasSubmittedPicks = true` → 409 se houver
4. `itemIds` contém exatamente os IDs dos itens do torneio, sem duplicatas → 400 se inválido

**Efeitos (em transação):**
1. Atualiza `seed` de cada `TournamentItem` (posição na lista, 1-indexed)
2. Recalcula os `MatchSlot`s da rodada 1:
   - `generateFirstRoundPairs(n)` retorna os pares de seeds (estrutura invariante)
   - Para cada par `[seed1, seed2]`, encontra os itens com esses seeds novos
   - Atualiza `MatchSlot.itemId` de cada slot da rodada 1

**Resposta:** `{ success: true }` (200)

---

## Frontend

### Lobby — lista de itens (somente criador em LOBBY)

**Dependência nova:** `@dnd-kit/core` + `@dnd-kit/sortable`

**Quando drag habilitado** (criador + LOBBY + sem palpites enviados):
- Ícone `GripVertical` (lucide-react) à esquerda de cada item como handle exclusivo
- Lista envolvida em `SortableContext` com estratégia `verticalListSortingStrategy`
- Durante drag: item original fica com `opacity-40` no lugar; `DragOverlay` renderiza cópia flutuante com `shadow-lg + scale(1.02)` para o efeito de "cola"
- `onDragEnd`: aplica nova ordem ao estado local (otimista), chama `PATCH` em background
- Erro na chamada: reverte array para ordem anterior + exibe `ErrorAlert`

**Quando drag bloqueado** (algum participante com palpites enviados):
- Handles (`GripVertical`) não renderizados
- Nota abaixo da lista: _"Reordenação bloqueada — um ou mais participantes já enviaram palpites."_

**Quando não é criador:**
- Lista exibida como hoje, sem handles

---

## Testes

### Integração (`tests/integration/`)

Novo arquivo `tests/integration/item-reorder.test.ts`:

| Cenário | Esperado |
|---------|----------|
| Criador reordena com sucesso | 200, seeds e slots atualizados |
| Sem token | 401 |
| Token de participante não-criador | 403 |
| Torneio em status `ACTIVE` | 409 |
| Torneio em status `FINISHED` | 409 |
| Participante com `hasSubmittedPicks = true` | 409 |
| `itemIds` com ID inexistente | 400 |
| `itemIds` com IDs duplicados | 400 |
| `itemIds` com tamanho errado | 400 |

### Unitário (se extraída função de lib)

Se a lógica de cálculo dos novos slots for extraída para `src/lib/`, cobrir com testes unitários em `tests/unit/`.

---

## Fluxo de dados

```
[Criador solta item]
       ↓
onDragEnd → recalcula array local
       ↓
setState otimista (instantâneo)
       ↓
PATCH /api/tournaments/[code]/items/order
       ↓
    sucesso? → nada (estado já correto)
    erro?    → reverte estado + ErrorAlert
```

---

## Fora do escopo

- Reordenação durante ou após o torneio iniciar
- Reordenação por participantes não-criadores
- Preview ao vivo das disputas enquanto arrasta
- Desfazer/refazer
