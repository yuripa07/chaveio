# Code Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove unnecessary/stale comments, fix ambiguous variable names, and correct minor code style issues across the codebase with zero logic changes.

**Architecture:** Pure cleanup — no new files, no logic changes, no new tests. Each task touches one file (or a tightly coupled pair), runs `pnpm test` to confirm no regressions, then commits. All tasks land on branch `chore/code-cleanup` which is PRed to `dev`.

**Tech Stack:** Next.js 16, TypeScript, Vitest, pnpm

**Spec:** `docs/superpowers/specs/2026-04-05-code-cleanup-design.md`

---

### Task 1: Create branch

**Files:** (none modified)

- [ ] **Step 1: Create and switch to branch**

```bash
git checkout -b chore/code-cleanup
```

Expected: `Switched to a new branch 'chore/code-cleanup'`

---

### Task 2: Clean `src/lib/picks-validation.ts`

Remove 7 inline comments that describe what the code does and can become stale.

**Files:**
- Modify: `src/lib/picks-validation.ts`

- [ ] **Step 1: Apply changes**

Replace the file content from line 26 onward (keep the JSDoc block and type definitions at the top untouched). The diff:

```ts
// REMOVE these lines:
// line 30:  const pickMap = new Map<string, string>(); // matchId → pickedItemId
// line 33:  // Build lookup structures
// line 46:  // Required matches: all matches from startRound onward
// line 52:  // Check coverage
// line 61:  // Validate each required pick
// line 86:  // For pre-start feeders: get the actual pick; for pre-start feeders: look up in pickMap
// line 90:  // Feeder picks may come from actual match slots (for rounds before the start round)
```

After editing, lines 28–34 should look like:

```ts
  const startRound = joinedAtRound ?? 1;
  const pickMap = new Map<string, string>();
  for (const p of picks) {
    pickMap.set(p.matchId, p.pickedItemId);
  }

  const matchById = new Map<string, Match & { roundNumber: number }>();
```

Lines 46–50 (after removal of "Required matches" comment):

```ts
  const requiredMatches = rounds
    .filter((r) => r.roundNumber >= startRound)
    .flatMap((r) => r.matches.map((m) => ({ ...m, roundNumber: r.roundNumber })));

  for (const match of requiredMatches) {
```

Lines 61–65 (after removal of "Check coverage" and "Validate each required pick" comments):

```ts
  }

  for (const match of requiredMatches) {
    const pickedItemId = pickMap.get(match.id)!;
```

Lines 86–92 (after removal of the two stale feeder comments):

```ts
      const pick1 = pickMap.get(feeder1.id);
      const pick2 = pickMap.get(feeder2.id);

      const validPredecessors = new Set<string>();
```

- [ ] **Step 2: Run tests**

```bash
pnpm test
```

Expected: all tests pass, no failures.

- [ ] **Step 3: Commit**

```bash
git add src/lib/picks-validation.ts
git commit -m "chore: remove stale inline comments from picks-validation"
```

---

### Task 3: Clean `src/app/api/tournaments/[code]/rankings/route.ts`

Remove one inline comment.

**Files:**
- Modify: `src/app/api/tournaments/[code]/rankings/route.ts`

- [ ] **Step 1: Apply change**

Remove line `// Dense ranking: ties share the same rank` (appears just before the ranking loop). Result:

```ts
  let rank = 1;
  for (let i = 0; i < sorted.length; i++) {
```

- [ ] **Step 2: Run tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tournaments/[code]/rankings/route.ts
git commit -m "chore: remove obvious comment from rankings route"
```

---

### Task 4: Fix `src/app/api/tournaments/route.ts`

Rename `t` → `newTournament`, fix try/catch formatting, remove `/* ignore */`.

**Files:**
- Modify: `src/app/api/tournaments/route.ts`

- [ ] **Step 1: Rename `t` to `newTournament` inside the transaction**

Inside the `$transaction` callback, the variable `t` (result of `tx.tournament.create(...)`) must be renamed to `newTournament` everywhere it appears. There are references on lines: the `create` assignment, then `t.items`, `t.id`, `t.roundNames`, `t.items.find(...)`.

The transaction body's first assignment becomes:
```ts
    const newTournament = await tx.tournament.create({
```

All subsequent uses of `t.` become `newTournament.`:
```ts
      include: { items: { orderBy: { seed: "asc" } } },
    });
    // ...
    const n = newTournament.items.length;
    const numRounds = Math.log2(n);
    const pairs = generateFirstRoundPairs(n);
    let parsedRoundNames: string[] = [];
    try {
      parsedRoundNames = JSON.parse(newTournament.roundNames || "[]");
    } catch {}
    // ...
          tournamentId: newTournament.id,
    // ...
        const item1 = newTournament.items.find((it) => it.seed === seed1)!;
        const item2 = newTournament.items.find((it) => it.seed === seed2)!;
    // ...
          tournamentId: newTournament.id,
    // ...
          tournamentId: newTournament.id,
```

The transaction return changes from:
```ts
    return { t, participant };
```
to:
```ts
    return { newTournament, participant };
```

After the transaction, update the two uses of `tournament.t`:
```ts
  const token = await signToken({
    participantId: tournament.participant.id,
    tournamentId: tournament.newTournament.id,
    isCreator: true,
  });
```

- [ ] **Step 2: Fix try/catch formatting and remove `/* ignore */`**

The single-line try/catch:
```ts
    let parsedRoundNames: string[] = [];
    try { parsedRoundNames = JSON.parse(t.roundNames || "[]"); } catch { /* ignore */ }
```

Becomes (already updated with the rename from Step 1):
```ts
    let parsedRoundNames: string[] = [];
    try {
      parsedRoundNames = JSON.parse(newTournament.roundNames || "[]");
    } catch {}
```

- [ ] **Step 3: Run tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tournaments/route.ts
git commit -m "chore: rename t to newTournament, fix try/catch formatting"
```

---

### Task 5: Clean `src/app/api/tournaments/[code]/join/route.ts`

Inline the `hasSubmittedPicks` variable.

**Files:**
- Modify: `src/app/api/tournaments/[code]/join/route.ts`

- [ ] **Step 1: Apply change**

Remove:
```ts
  const hasSubmittedPicks = false;
```

And update the `prisma.participant.create` call — change:
```ts
      hasSubmittedPicks,
```
to:
```ts
      hasSubmittedPicks: false,
```

- [ ] **Step 2: Run tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tournaments/[code]/join/route.ts
git commit -m "chore: inline hasSubmittedPicks literal in join route"
```

---

### Task 6: Clean `src/app/tournament/[code]/bracket/page.tsx`

Remove 3 inline comments, split 2 variable declarations.

**Files:**
- Modify: `src/app/tournament/[code]/bracket/page.tsx`

- [ ] **Step 1: Remove comments**

Remove these lines:
- `// Initial load — redirect if no token` (before the first `useEffect`)
- `// Poll while active` (before the `usePolling` call)
- `// Derived state` (before the `me` derivation)

- [ ] **Step 2: Split multiple declarations**

Change:
```ts
    let picked = 0, eligible = 0;
```
to:
```ts
    let picked = 0;
    let eligible = 0;
```

- [ ] **Step 3: Run tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/tournament/[code]/bracket/page.tsx
git commit -m "chore: remove comments and split declarations in bracket page"
```

---

### Task 7: Fix `src/app/tournament/[code]/live/page.tsx`

Remove 1 comment, fix wrong status constant, remove JSX comment.

**Files:**
- Modify: `src/app/tournament/[code]/live/page.tsx`

- [ ] **Step 1: Remove inline comment**

Remove:
```ts
  // Initial load + redirect non-creators
```
(appears just before the second `useEffect`)

- [ ] **Step 2: Fix wrong status constant**

Add `RoundStatus` to the import from `@/constants/tournament`:
```ts
import { TournamentStatus, RoundStatus } from "@/constants/tournament";
```

Change:
```ts
  const activeRound = state.rounds.find((r) => r.status === TournamentStatus.ACTIVE);
```
to:
```ts
  const activeRound = state.rounds.find((r) => r.status === RoundStatus.ACTIVE);
```

- [ ] **Step 3: Remove JSX section comment**

Remove `{/* Confirmation dialog */}` (the JSX comment just before the `{pendingWinner && (` block).

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/tournament/[code]/live/page.tsx
git commit -m "chore: fix RoundStatus constant and remove comments in live page"
```

---

### Task 8: Clean `src/app/tournament/[code]/results/page.tsx`

Remove JSX section comments, split variable declarations.

**Files:**
- Modify: `src/app/tournament/[code]/results/page.tsx`

- [ ] **Step 1: Split multiple declarations**

Change:
```ts
  let myTotalPoints = 0, resolvedCount = 0, correctCount = 0;
```
to:
```ts
  let myTotalPoints = 0;
  let resolvedCount = 0;
  let correctCount = 0;
```

- [ ] **Step 2: Remove JSX section comments**

Remove these 4 JSX comments:
- `{/* Score card */}`
- `{/* Rankings */}`
- `{/* Picks breakdown */}`
- `{/* Bracket */}`

- [ ] **Step 3: Run tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/tournament/[code]/results/page.tsx
git commit -m "chore: split declarations and remove JSX comments in results page"
```

---

### Task 9: Clean `src/app/tournament/[code]/page.tsx`

Remove 2 comments, rename `v` → `prev`.

**Files:**
- Modify: `src/app/tournament/[code]/page.tsx`

- [ ] **Step 1: Remove comments**

Remove:
- `/* ── Join screen (not yet authenticated) ── */` (appears before the `if (!token)` return block)
- The three JSX section comments: `{/* Invite code banner */}`, `{/* Participants */}`, `{/* Items */}`

- [ ] **Step 2: Rename `v` → `prev` in the password toggle**

Change:
```ts
              onClick={() => setShowPassword((v) => !v)}
```
to:
```ts
              onClick={() => setShowPassword((prev) => !prev)}
```

- [ ] **Step 3: Run tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/tournament/[code]/page.tsx
git commit -m "chore: remove comments and rename v to prev in lobby page"
```

---

### Task 10: Clean `src/app/tournament/new/page.tsx`

Rename `v` → `prev` in the password toggle.

**Files:**
- Modify: `src/app/tournament/new/page.tsx`

- [ ] **Step 1: Apply change**

Change:
```ts
              onClick={() => setShowPassword((v) => !v)}
```
to:
```ts
              onClick={() => setShowPassword((prev) => !prev)}
```

- [ ] **Step 2: Run tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/tournament/new/page.tsx
git commit -m "chore: rename v to prev in new tournament page"
```

---

### Task 11: Clean `src/app/page.tsx`

Remove 3 JSX section comments (keep the 3 non-obvious behavior comments).

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Remove JSX section comments**

Remove:
- `{/* Brand */}` (before the brand `<div>`)
- `{/* Actions */}` (before the actions `<div>`)
- `{/* Progress bar */}` (the JSX comment inside the code input block)

**Do NOT remove:**
- `// No 'g' flag — avoids stale lastIndex when calling .test() repeatedly`
- `// Enforce max length here too (mobile keyboards can bypass the 'maxLength' attr)`
- `// Network issue — let the lobby page handle it`

- [ ] **Step 2: Run tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "chore: remove structural JSX comments from home page"
```

---

### Task 12: Clean `src/components/bracket-view.tsx`

Remove 2 JSX section comments (keep the 4 SVG connector comments).

**Files:**
- Modify: `src/components/bracket-view.tsx`

- [ ] **Step 1: Remove JSX section comments**

Remove:
- `{/* Column header */}` (before the column header `<div>`)
- `{/* Matches */}` (before the matches `<div>`)

**Do NOT remove** (explain non-obvious absolute positioning):
- `{/* Right connector */}`
- `{/* Left vertical bar joining feeder pair */}`
- `{/* Left horizontal stub */}`
- `{/* Match card */}`

- [ ] **Step 2: Run tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/bracket-view.tsx
git commit -m "chore: remove structural JSX comments from bracket-view"
```

---

### Task 13: Final verification and PR

- [ ] **Step 1: Run full test suite one final time**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: build completes with no errors.

- [ ] **Step 3: Push branch**

```bash
git push -u origin chore/code-cleanup
```

- [ ] **Step 4: Open PR**

```bash
gh pr create \
  --base dev \
  --title "chore: code cleanup — comments, variable names, style" \
  --body "$(cat <<'EOF'
## Summary

- Remove stale/structural JSX section comments across all pages and bracket-view
- Remove obvious inline comments in picks-validation, rankings route
- Rename `t` → `newTournament` in tournament creation transaction (was `tournament.t.id`)
- Rename `v` → `prev` in password toggle callbacks
- Inline `hasSubmittedPicks: false` literal in join route
- Fix `TournamentStatus.ACTIVE` → `RoundStatus.ACTIVE` for round status check in live page
- Split multiple `let` declarations onto separate lines
- Format inline try/catch block and remove `/* ignore */` from empty catch

Zero logic changes. All tests pass.

## Test plan

- [x] `pnpm test` passes after every individual task commit
- [x] `pnpm build` passes on final task

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/picks-validation.ts` | Remove 7 inline comments |
| `src/app/api/tournaments/[code]/rankings/route.ts` | Remove 1 comment |
| `src/app/api/tournaments/route.ts` | Rename `t` → `newTournament`, fix try/catch |
| `src/app/api/tournaments/[code]/join/route.ts` | Inline `hasSubmittedPicks` |
| `src/app/tournament/[code]/bracket/page.tsx` | Remove 3 comments, split declarations |
| `src/app/tournament/[code]/live/page.tsx` | Remove comment, fix `RoundStatus`, remove JSX comment |
| `src/app/tournament/[code]/results/page.tsx` | Remove 4 JSX comments, split declarations |
| `src/app/tournament/[code]/page.tsx` | Remove 4 comments, rename `v` → `prev` |
| `src/app/tournament/new/page.tsx` | Rename `v` → `prev` |
| `src/app/page.tsx` | Remove 3 JSX comments |
| `src/components/bracket-view.tsx` | Remove 2 JSX comments |
