# Lobby Item Drag-and-Drop Reordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow tournament creators to reorder bracket items via drag-and-drop in the lobby (status `LOBBY`), which updates seeds and round-1 match slots in the database.

**Architecture:** New `PATCH /api/tournaments/[code]/items/order` endpoint validates auth, status, and picks, then updates seeds + round-1 slots in a transaction. The lobby page uses `@dnd-kit` to render a sortable list for the creator, with optimistic updates and automatic revert on error. Non-creators see the existing static list.

**Tech Stack:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

**Spec:** `docs/superpowers/specs/2026-04-06-lobby-item-reorder-design.md`

---

### Task 1: Install @dnd-kit dependencies

**Files:**
- Modify: `package.json` (pnpm adds automatically)
- Modify: `package-lock.json` (npm --package-lock-only)

- [ ] **Step 1: Install packages**

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: packages added to `dependencies` in `package.json`, `pnpm-lock.yaml` updated.

- [ ] **Step 2: Sync package-lock.json for CI**

```bash
npm install --package-lock-only
```

Expected: `package-lock.json` updated without installing to `node_modules`.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml package-lock.json
git commit -m "chore: add @dnd-kit dependencies for drag-and-drop"
```

---

### Task 2: API endpoint — PATCH /api/tournaments/[code]/items/order (TDD)

**Files:**
- Create: `src/app/api/tournaments/[code]/items/order/route.ts`
- Modify: `tests/integration/fixtures.ts` (add `reorderItems` helper)
- Create: `tests/integration/item-reorder.test.ts`

- [ ] **Step 1: Add `reorderItems` fixture to `tests/integration/fixtures.ts`**

Add at the end of the file (after the `getRankings` export):

```ts
export async function reorderItems(
  code: string,
  token: string | null,
  itemIds: string[]
) {
  const { PATCH } = await import(
    "@/app/api/tournaments/[code]/items/order/route"
  );
  return PATCH(
    req("PATCH", `/api/tournaments/${code}/items/order`, { itemIds }, token),
    { params: Promise.resolve({ code }) }
  );
}
```

- [ ] **Step 2: Write `tests/integration/item-reorder.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { testPrisma, resetDb } from "./helpers";
import {
  createTournament,
  joinTournament,
  getTournament,
  startTournament,
  submitFullBracketPicks,
  reorderItems,
} from "./fixtures";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

async function setupTournament() {
  const createRes = await createTournament({
    name: "Reorder Test",
    items: ["Alpha", "Bravo", "Charlie", "Delta"],
  });
  const { code, token } = await createRes.json();
  const stateRes = await getTournament(code, token);
  const { items } = await stateRes.json();
  return { code, token, items };
}

describe("PATCH /api/tournaments/[code]/items/order", () => {
  it("reorders items: updates seeds and round-1 match slots", async () => {
    const { code, token, items } = await setupTournament();

    // Reverse the item order
    const reversedIds: string[] = [...items]
      .reverse()
      .map((i: { id: string }) => i.id);

    const res = await reorderItems(code, token, reversedIds);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    // Seeds should reflect new positions
    const updatedItems = await testPrisma.tournamentItem.findMany({
      where: { tournament: { code } },
      orderBy: { seed: "asc" },
    });
    expect(updatedItems.map((i) => i.id)).toEqual(reversedIds);

    // Round-1 slots must match generateFirstRoundPairs(4) = [[1,4],[3,2]]
    // After reverse: reversedIds[0]=seed1, reversedIds[1]=seed2, reversedIds[2]=seed3, reversedIds[3]=seed4
    // Match 1: seed1 (reversedIds[0]) vs seed4 (reversedIds[3])
    // Match 2: seed3 (reversedIds[2]) vs seed2 (reversedIds[1])
    const round1Matches = await testPrisma.match.findMany({
      where: { round: { roundNumber: 1, tournament: { code } } },
      include: { slots: { orderBy: { position: "asc" } } },
      orderBy: { matchNumber: "asc" },
    });

    expect(round1Matches[0].slots[0].itemId).toBe(reversedIds[0]); // seed 1
    expect(round1Matches[0].slots[1].itemId).toBe(reversedIds[3]); // seed 4
    expect(round1Matches[1].slots[0].itemId).toBe(reversedIds[2]); // seed 3
    expect(round1Matches[1].slots[1].itemId).toBe(reversedIds[1]); // seed 2
  });

  it("returns 401 without a token", async () => {
    const { code, items } = await setupTournament();
    const ids = items.map((i: { id: string }) => i.id);
    const res = await reorderItems(code, null, ids);
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-creator participant", async () => {
    const { code, items } = await setupTournament();
    const joinRes = await joinTournament(code, {
      displayName: "Bob",
      password: "pass123",
    });
    const { token: participantToken } = await joinRes.json();

    const ids = items.map((i: { id: string }) => i.id);
    const res = await reorderItems(code, participantToken, ids);
    expect(res.status).toBe(403);
  });

  it("returns 409 when tournament is not in LOBBY (ACTIVE)", async () => {
    const { code, token, items } = await setupTournament();

    // Creator submits picks so the tournament can start
    await submitFullBracketPicks(token, code);
    await startTournament(code, token);

    const ids = items.map((i: { id: string }) => i.id);
    const res = await reorderItems(code, token, ids);
    expect(res.status).toBe(409);
  });

  it("returns 409 when a participant has submitted picks", async () => {
    const { code, token, items } = await setupTournament();

    const joinRes = await joinTournament(code, {
      displayName: "Bob",
      password: "pass123",
    });
    const { token: participantToken } = await joinRes.json();
    await submitFullBracketPicks(participantToken, code);

    const ids = items.map((i: { id: string }) => i.id);
    const res = await reorderItems(code, token, ids);
    expect(res.status).toBe(409);
  });

  it("returns 400 for itemIds with wrong length", async () => {
    const { code, token, items } = await setupTournament();
    const shortIds = items.slice(0, 3).map((i: { id: string }) => i.id);
    const res = await reorderItems(code, token, shortIds);
    expect(res.status).toBe(400);
  });

  it("returns 400 for duplicate itemIds", async () => {
    const { code, token, items } = await setupTournament();
    const ids = items.map((i: { id: string }) => i.id);
    const dupIds = [ids[0], ids[0], ids[1], ids[2]];
    const res = await reorderItems(code, token, dupIds);
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unknown itemId", async () => {
    const { code, token, items } = await setupTournament();
    const ids = items.map((i: { id: string }) => i.id);
    ids[0] = "00000000-0000-0000-0000-000000000000";
    const res = await reorderItems(code, token, ids);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail (route not found)**

```bash
pnpm test tests/integration/item-reorder.test.ts
```

Expected: all tests fail with module-not-found or similar error.

- [ ] **Step 4: Create `src/app/api/tournaments/[code]/items/order/route.ts`**

```ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleRequest } from "@/lib/api-utils";
import { generateFirstRoundPairs } from "@/lib/bracket";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const [authResult, { code }] = await Promise.all([
    handleRequest<{ itemIds: string[] }>(req, "creator", { parseBody: true }),
    params,
  ]);
  if (!authResult.ok) return authResult.response;

  const { payload, body } = authResult;
  const { itemIds } = body;

  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return Response.json(
      { error: "itemIds must be a non-empty array" },
      { status: 400 }
    );
  }

  if (new Set(itemIds).size !== itemIds.length) {
    return Response.json(
      { error: "itemIds must not contain duplicates" },
      { status: 400 }
    );
  }

  const tournament = await prisma.tournament.findUnique({
    where: { code },
    include: {
      items: true,
      participants: { select: { hasSubmittedPicks: true } },
      rounds: {
        where: { roundNumber: 1 },
        include: {
          matches: {
            include: { slots: true },
            orderBy: { matchNumber: "asc" },
          },
        },
      },
    },
  });

  if (!tournament || tournament.id !== payload.tournamentId) {
    return Response.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (tournament.status !== "LOBBY") {
    return Response.json(
      { error: "Tournament has already started" },
      { status: 409 }
    );
  }

  if (tournament.participants.some((p) => p.hasSubmittedPicks)) {
    return Response.json(
      { error: "Cannot reorder: a participant has already submitted picks" },
      { status: 409 }
    );
  }

  const tournamentItemIds = new Set(tournament.items.map((i) => i.id));
  if (
    itemIds.length !== tournamentItemIds.size ||
    !itemIds.every((id) => tournamentItemIds.has(id))
  ) {
    return Response.json(
      { error: "itemIds must match the tournament items exactly" },
      { status: 400 }
    );
  }

  const n = tournament.items.length;
  const pairs = generateFirstRoundPairs(n);
  const round1 = tournament.rounds[0];

  await prisma.$transaction(async (tx) => {
    // Update each item's seed to its new position
    await Promise.all(
      itemIds.map((itemId, index) =>
        tx.tournamentItem.update({
          where: { id: itemId },
          data: { seed: index + 1 },
        })
      )
    );

    // Build new seed → itemId lookup
    const seedToItemId = new Map<number, string>(
      itemIds.map((itemId, index) => [index + 1, itemId])
    );

    // Update round-1 match slots to reflect new seeding
    await Promise.all(
      pairs.map(([seed1, seed2], i) => {
        const match = round1.matches[i];
        const slot1 = match.slots.find((s) => s.position === 1)!;
        const slot2 = match.slots.find((s) => s.position === 2)!;
        return Promise.all([
          tx.matchSlot.update({
            where: { id: slot1.id },
            data: { itemId: seedToItemId.get(seed1)! },
          }),
          tx.matchSlot.update({
            where: { id: slot2.id },
            data: { itemId: seedToItemId.get(seed2)! },
          }),
        ]);
      })
    );
  });

  return Response.json({ success: true });
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
pnpm test tests/integration/item-reorder.test.ts
```

Expected: all 8 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/tournaments/[code]/items/order/route.ts \
        tests/integration/fixtures.ts \
        tests/integration/item-reorder.test.ts
git commit -m "feat: add PATCH /api/tournaments/[code]/items/order endpoint"
```

---

### Task 3: Create SortableBracketItem component

**Files:**
- Create: `src/components/sortable-bracket-item.tsx`

- [ ] **Step 1: Create `src/components/sortable-bracket-item.tsx`**

```tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { TournamentItem } from "@/types/tournament";

interface Props {
  item: TournamentItem;
  index: number;
}

export function SortableBracketItem({ item, index }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 text-sm ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-zinc-300 hover:text-zinc-500 active:cursor-grabbing"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xxs font-bold text-zinc-500">
        {index + 1}
      </span>
      <span className="text-zinc-700">{item.name}</span>
    </li>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sortable-bracket-item.tsx
git commit -m "feat: add SortableBracketItem component with drag handle"
```

---

### Task 4: Integrate drag-and-drop into the lobby page

**Files:**
- Modify: `src/app/tournament/[code]/page.tsx`

The items section of the lobby page (the card titled "Chaveamento") needs to become a sortable list for the creator. Non-creator users see the existing static list unchanged.

- [ ] **Step 1: Update imports at the top of `src/app/tournament/[code]/page.tsx`**

Replace:
```ts
import { use, useEffect, useState, useCallback } from "react";
```
With:
```ts
import { use, useEffect, useRef, useState, useCallback } from "react";
```

Add `GripVertical` to the **existing** lucide-react import (do not create a second import):
```ts
import { User, Lock, LogIn, CheckCircle2, Hash, Trophy, Copy, Check, Eye, EyeOff, ChevronLeft, GripVertical } from "lucide-react";
```

Then add new imports after all existing import lines:
```ts
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { SortableBracketItem } from "@/components/sortable-bracket-item";
import type { TournamentItem } from "@/types/tournament";
```

Note: `GripVertical` is only used inside `DragOverlay` (the floating copy during drag). `SortableBracketItem` uses its own `GripVertical` internally.

- [ ] **Step 2: Add drag-and-drop state and handlers inside the `TournamentLobby` component**

Add after the existing `const [copied, setCopied] = useState(false);` line:

```ts
const [localItems, setLocalItems] = useState<TournamentItem[]>([]);
const [activeItemId, setActiveItemId] = useState<string | null>(null);
const [reorderError, setReorderError] = useState("");
const itemsInitialized = useRef(false);

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
);
```

- [ ] **Step 3: Add initialization effect and drag handlers**

Add after the `handleCopyCode` function (before the first `if (!token)` return):

```ts
// Initialize localItems once when tournamentData first loads
useEffect(() => {
  if (tournamentData?.items && !itemsInitialized.current) {
    setLocalItems(tournamentData.items);
    itemsInitialized.current = true;
  }
}, [tournamentData]); // eslint-disable-line react-hooks/exhaustive-deps

function handleDragStart(event: DragStartEvent) {
  setActiveItemId(event.active.id as string);
}

async function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  setActiveItemId(null);

  if (!over || active.id === over.id) return;

  const oldIndex = localItems.findIndex((i) => i.id === active.id);
  const newIndex = localItems.findIndex((i) => i.id === over.id);
  const previousItems = localItems;
  const newItems = arrayMove(localItems, oldIndex, newIndex);

  setLocalItems(newItems);
  setReorderError("");

  try {
    const res = await fetch(`/api/tournaments/${code}/items/order`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token!}`,
      },
      body: JSON.stringify({ itemIds: newItems.map((i) => i.id) }),
    });
    if (!res.ok) {
      const body = await res.json();
      setLocalItems(previousItems);
      setReorderError(body.error ?? "Erro ao reordenar");
    }
  } catch {
    setLocalItems(previousItems);
    setReorderError("Erro de rede ao reordenar");
  }
}
```

- [ ] **Step 4: Replace the items card in the lobby render**

Locate this block (inside the `return` statement, after `if (!tournamentData) return <LobbyPageSkeleton />;`):

```tsx
const { tournament, participants, items } = tournamentData;
```

Add a derived variable right after it:

```tsx
const hasAnyPicksSubmitted = participants.some((p) => p.hasSubmittedPicks);
const canReorder =
  isCreator &&
  tournament.status === TournamentStatus.LOBBY &&
  !hasAnyPicksSubmitted;
const activeItem = activeItemId
  ? localItems.find((i) => i.id === activeItemId)
  : null;
```

Then locate the items card `<div>` (the one with `<Trophy className="h-3.5 w-3.5" />` and `Chaveamento · {items.length} itens`). Replace the entire card with:

```tsx
<div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
  <h2 className="mb-3 flex items-center gap-1.5 text-xxs font-semibold uppercase tracking-wider text-zinc-400">
    <Trophy className="h-3.5 w-3.5" />
    Chaveamento · {items.length} itens
  </h2>

  {canReorder ? (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={localItems.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-1.5">
          {localItems.map((item, index) => (
            <SortableBracketItem key={item.id} item={item} index={index} />
          ))}
        </ul>
      </SortableContext>

      <DragOverlay>
        {activeItem && (
          <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 shadow-lg scale-[1.02] text-sm">
            <GripVertical className="h-4 w-4 text-zinc-300" />
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xxs font-bold text-zinc-500">
              {localItems.indexOf(activeItem) + 1}
            </span>
            <span className="text-zinc-700">{activeItem.name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  ) : (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-2 text-sm">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xxs font-bold text-zinc-500">
            {item.seed}
          </span>
          <span className="text-zinc-700">{item.name}</span>
        </li>
      ))}
    </ul>
  )}

  {isCreator && hasAnyPicksSubmitted && (
    <p className="mt-2 text-xs text-zinc-400">
      Reordenação bloqueada — um ou mais participantes já enviaram palpites.
    </p>
  )}

  {reorderError && (
    <p className="mt-2 text-xs text-red-500">{reorderError}</p>
  )}
</div>
```

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
pnpm test
```

Expected: all existing tests pass plus the 8 new item-reorder tests.

- [ ] **Step 6: Commit**

```bash
git add src/app/tournament/[code]/page.tsx
git commit -m "feat: add drag-and-drop item reordering in lobby for creators"
```

---

### Task 5: Update AGENTS.md and open PR

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Add the new API route to the API Routes table in AGENTS.md**

In the API Routes table, add after the `POST /api/tournaments/[code]/start` row:

```
| PATCH | `/api/tournaments/[code]/items/order` | Creator | Reorder bracket items (seeds + round-1 slots); blocked if any picks submitted |
```

- [ ] **Step 2: Add the new component to the Project Structure in AGENTS.md**

In the `components/` section of the Project Structure, add after `sortable-bracket-item.tsx` doesn't exist yet — add it alphabetically near the bottom:

```
│   ├── sortable-bracket-item.tsx  # Drag-and-drop sortable item row (lobby, creator only)
```

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: document new reorder endpoint and SortableBracketItem component"
```

- [ ] **Step 4: Push branch and open PR to dev**

```bash
git push -u origin feature/lobby-item-reorder
gh pr create \
  --base dev \
  --title "feat: drag-and-drop item reordering in lobby" \
  --body "$(cat <<'EOF'
## Summary
- Adds `PATCH /api/tournaments/[code]/items/order` endpoint that updates item seeds and regenerates round-1 match slots
- Creator can reorder bracket items via drag-and-drop in the lobby before the tournament starts
- Reordering is blocked (409) if any participant has submitted picks
- Optimistic updates with automatic revert on error

## Test plan
- [ ] Run `pnpm test tests/integration/item-reorder.test.ts` — all 8 tests pass
- [ ] Run `pnpm test` — no regressions
- [ ] Create a tournament and confirm items list in lobby shows drag handles (creator view)
- [ ] Drag an item to a new position and confirm it persists after page reload
- [ ] Join as a second participant, submit picks — confirm drag handles disappear and blocked message appears
- [ ] Confirm non-creator view shows static list without handles

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL printed to console. Verify it targets `dev` branch.
