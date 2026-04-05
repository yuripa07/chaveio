# Code Cleanup — Design Spec
**Date:** 2026-04-05  
**Branch:** `chore/code-cleanup`  
**Target PR:** → `dev`

## Objective

Remove unnecessary/stale comments, fix ambiguous variable names, and correct minor code style issues across the codebase. Zero logic changes — all tests must pass unchanged.

---

## Section 1 — Comments to Remove

### Keep (explain WHY or non-obvious behavior)
- JSDoc blocks on all `lib/` functions (bracket, points, picks-validation) — document algorithms
- `// No 'g' flag — avoids stale lastIndex` in `page.tsx`
- `// Enforce max length here too (mobile keyboards...)` in `page.tsx`
- `// Network issue — let the lobby page handle it` in `page.tsx`
- `// Generate bracket at creation so participants can predict before start` in `tournaments/route.ts`
- `// Block updates to already-scored picks` and `// Block new registrations...` in API routes
- `// Start hash immediately, generate code in parallel` in `tournaments/route.ts`
- `// Round 1 matches with seeded slots` and `// Empty matches for rounds 2+` in `tournaments/route.ts`
- `// Determine joinedAtRound for late joiners` in `join/route.ts`

### Remove (describe WHAT, can become stale)

**`src/lib/picks-validation.ts`**
- `// Build lookup structures`
- `// Required matches: all matches from startRound onward`
- `// Check coverage`
- `// Validate each required pick`
- `// matchId → pickedItemId` (inline Map type annotation)
- `// For pre-start feeders: get the actual pick; for pre-start feeders: look up in pickMap` (confusing duplicate)
- `// Feeder picks may come from actual match slots (for rounds before the start round)`

**`src/app/api/tournaments/[code]/rankings/route.ts`**
- `// Dense ranking: ties share the same rank`

**`src/app/tournament/[code]/bracket/page.tsx`**
- `// Derived state`
- `// Initial load — redirect if no token`
- `// Poll while active`

**`src/app/tournament/[code]/live/page.tsx`**
- `// Initial load + redirect non-creators`

**`src/app/tournament/[code]/page.tsx`**
- `/* ── Join screen (not yet authenticated) ── */`

**`src/app/api/tournaments/route.ts`**
- `/* ignore */` inside empty catch block

**JSX section labels (all files)**
- `{/* Invite code banner */}`, `{/* Participants */}`, `{/* Items */}` — `[code]/page.tsx`
- `{/* Score card */}`, `{/* Rankings */}`, `{/* Picks breakdown */}`, `{/* Bracket */}` — `results/page.tsx`
- `{/* Confirmation dialog */}` — `live/page.tsx`
- `{/* Brand */}`, `{/* Actions */}`, `{/* Progress bar */}` — `app/page.tsx`
- `{/* Column header */}`, `{/* Matches */}` — `bracket-view.tsx`

---

## Section 2 — Variable Naming

| File | Before | After | Reason |
|------|--------|-------|--------|
| `src/app/api/tournaments/route.ts` | `t` (tournament inside tx) | `newTournament` | `tournament.t.id` is confusing when outer var is also `tournament` |
| `src/app/api/tournaments/route.ts` | `{ t, participant }` (tx return) | `{ newTournament, participant }` | Follows from above |
| `src/app/tournament/[code]/page.tsx` | `(v) => !v` | `(prev) => !prev` | `v` is meaningless; `prev` is the React convention |
| `src/app/tournament/new/page.tsx` | `(v) => !v` | `(prev) => !prev` | Same |
| `src/app/api/tournaments/[code]/join/route.ts` | `const hasSubmittedPicks = false` | inline `false` | Single-use literal variable adds no value |

---

## Section 3 — Code Style

**Wrong constant for round status** (`src/app/tournament/[code]/live/page.tsx`):
```ts
// before
state.rounds.find((r) => r.status === TournamentStatus.ACTIVE)
// after
state.rounds.find((r) => r.status === RoundStatus.ACTIVE)
```
Add `RoundStatus` to imports. `TournamentStatus.ACTIVE === RoundStatus.ACTIVE === "ACTIVE"` today, but using the wrong domain constant is a silent maintenance hazard.

**Multiple declarations per line** → split:
- `let picked = 0, eligible = 0;` in `bracket/page.tsx`
- `let myTotalPoints = 0, resolvedCount = 0, correctCount = 0;` in `results/page.tsx`

**Inline try/catch formatting** in `tournaments/route.ts`:
```ts
// before (single line with /* ignore */)
try { parsedRoundNames = JSON.parse(t.roundNames || "[]"); } catch { /* ignore */ }

// after (standard formatting, empty catch)
try {
  parsedRoundNames = JSON.parse(newTournament.roundNames || "[]");
} catch {}
```

---

## Out of Scope

- Logic changes of any kind
- `// eslint-disable-line react-hooks/exhaustive-deps` in `[code]/page.tsx` — intentional, touches hook behavior
- SVG connector comments in `bracket-view.tsx` (`{/* Right connector */}`, `{/* Left vertical bar */}`, `{/* Left horizontal stub */}`, `{/* Match card */}`) — kept because they describe non-obvious absolute positioning logic

---

## Verification

After all changes: `pnpm test` must pass with no regressions.
