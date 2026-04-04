<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Chaveio — Agent Reference

March Madness-style bracket prediction app for team bonding events. Before each tournament starts, every participant fills in the full bracket. Picks are private until each round is resolved by the creator. Points are awarded automatically.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styles | Tailwind CSS 4 |
| Database | SQLite (dev) / PostgreSQL Neon (prod) |
| ORM | Prisma 7 |
| Auth | JWT per tournament via `jose` — name + password, no global account |
| Tests | Vitest |
| Hosting | Vercel |
| CI | GitHub Actions |
| Package manager | **pnpm** (never npm) |

## Commands

```bash
pnpm dev          # start dev server
pnpm test         # run unit tests (vitest)
pnpm test:watch   # vitest watch mode
pnpm build        # production build
pnpm lint         # eslint

pnpm prisma migrate dev --name <name>   # create + apply migration
pnpm prisma generate                    # regenerate Prisma client
pnpm prisma studio                      # open DB GUI
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                        # Root layout (server component)
│   ├── page.tsx                          # Landing: create or join
│   ├── globals.css                       # Tailwind global styles
│   ├── tournament/
│   │   ├── new/page.tsx                  # Create tournament form
│   │   └── [code]/
│   │       ├── page.tsx                  # Lobby
│   │       ├── bracket/page.tsx          # Fill bracket (pre-start)
│   │       ├── live/page.tsx             # Creator resolves matches
│   │       └── results/page.tsx          # Leaderboard + round summary
│   └── api/
│       ├── tournaments/route.ts          # POST create
│       ├── tournaments/[code]/
│       │   ├── route.ts                  # GET state
│       │   ├── join/route.ts             # POST join
│       │   ├── start/route.ts            # POST start (creator)
│       │   └── matches/[id]/winner/route.ts  # POST set winner (creator)
│       └── picks/route.ts               # GET/POST picks
├── lib/
│   ├── points.ts            # computeRoundPoints, computeMaxPoints
│   ├── bracket.ts           # seedPositions, generateFirstRoundPairs, getNextRoundSlot
│   ├── codes.ts             # generateCode (6-char uppercase, no ambiguous chars)
│   ├── db.ts                # PrismaClient singleton
│   ├── auth.ts              # signToken, verifyToken, requireParticipant, requireCreator
│   ├── picks-validation.ts  # validateBracketPicks
│   └── token-client.ts      # Client-side JWT decode (no verification)
├── components/
│   └── BracketView.tsx      # Reusable bracket visualization component
└── generated/
    └── prisma/              # auto-generated, gitignored

tests/
├── unit/
│   ├── points.test.ts
│   ├── bracket.test.ts
│   ├── codes.test.ts
│   └── picks-validation.test.ts
└── integration/
    ├── fixtures.ts
    ├── globalSetup.ts
    ├── helpers.ts
    ├── tournaments.test.ts
    ├── picks.test.ts
    ├── lifecycle.test.ts
    └── late-joiner.test.ts
```

## Database Models

`Tournament` -> `TournamentItem[]`, `Participant[]`, `Round[]`, `Match[]`
`Round` -> `Match[]` (has pre-computed `pointValue`)
`Match` -> `MatchSlot[]` (2 slots per match), `Pick[]`
`Pick` -> belongs to `Participant` + `Match`; `isCorrect` is null until match resolves

**Status enums:**
- Tournament: `LOBBY` | `ACTIVE` | `FINISHED`
- Round: `PENDING` | `ACTIVE` | `COMPLETE`
- Match: `PENDING` | `COMPLETE`

## Scoring Rules (non-obvious)

Items must be a power of 2 (4, 8, 16, 32).

For N items and `totalRounds = log2(N)`:
- Rounds 1 to (totalRounds - 1): `pointValue = 2^(roundNumber - 1)`
- **Final round: `pointValue = N`** (breaks geometric progression intentionally)

Example for 16 items: 1 -> 2 -> 4 -> **16** pts; max score = **40 pts**

See `src/lib/points.ts` for implementation.

## Bracket Seeding

`seedPositions(n)` returns seeds in bracket order using alternating complement pairing:
- n=4 -> `[1, 4, 3, 2]` (matches: 1v4, 3v2)
- n=8 -> `[1, 8, 5, 4, 3, 6, 7, 2]`

When match M resolves, the winner advances to:
- `matchIndex = Math.floor((M - 1) / 2)`
- `slotPosition = M % 2 === 1 ? 1 : 2`

See `src/lib/bracket.ts` for implementation.

## Auth

JWT payload: `{ participantId, tournamentId, isCreator }`
Signed with `JWT_SECRET` env var. Stored in `localStorage` on the client.
Header: `Authorization: Bearer <token>`

Use `requireParticipant(req)` or `requireCreator(req)` from `src/lib/auth.ts` in API routes. Both throw `AuthError` (with HTTP status) on failure.

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/tournaments` | -- | Create tournament, returns creator token |
| GET | `/api/tournaments/[code]` | Token | Tournament state (picks filtered to own) |
| POST | `/api/tournaments/[code]/join` | -- | Join tournament, returns token |
| POST | `/api/tournaments/[code]/start` | Creator | Activate round 1, set status ACTIVE |
| POST | `/api/tournaments/[code]/matches/[id]/winner` | Creator | Set winner, score picks, advance bracket |
| POST | `/api/picks` | Token | Upsert all picks (atomic transaction) |
| GET | `/api/picks` | Token | Return own picks |

## Implementation Phases

- [x] **Phase 1** -- Project setup, Prisma schema, TDD algorithms (points, bracket, codes)
- [x] **Phase 2** -- Create/join APIs + picks API + landing/lobby/bracket UI
- [x] **Phase 3** -- Start/winner APIs + live UI + leaderboard
- [ ] **Phase 4** -- Visual bracket component + mobile polish
- [ ] **Phase 5** -- Deploy to Neon + Vercel, CI green

## Conventions

- All git commit messages in **English**
- TDD: write tests before implementation for `src/lib/**` and `src/app/api/**`
- Minimum 80% coverage on `src/lib/**` and `src/app/api/**`
- No `npm` -- always `pnpm`
- Prisma client is at `@/generated/prisma` (not `@prisma/client`)
- UI strings in **pt-BR** (Portuguese Brazil)

---

# Performance & Best Practices Guide

This section documents the Vercel React best practices to follow when writing or refactoring code in this project. Rules are grouped by priority (CRITICAL > HIGH > MEDIUM).

## 1. Eliminating Waterfalls (CRITICAL)

### async-parallel: Use Promise.all() for independent operations

All API routes and client-side fetch calls with independent operations must use `Promise.all()`.

```typescript
// WRONG: sequential (3 round trips)
const user = await fetchUser()
const posts = await fetchPosts()

// RIGHT: parallel (1 round trip)
const [user, posts] = await Promise.all([fetchUser(), fetchPosts()])
```

**Current status:** bracket/page.tsx and results/page.tsx already use `Promise.all` for parallel fetches. Good.

### async-api-routes: Start promises early, await late

In API routes, start independent operations immediately even before awaiting others.

```typescript
// RIGHT: auth and config start immediately
export async function GET(request: Request) {
  const sessionPromise = auth()
  const configPromise = fetchConfig()
  const session = await sessionPromise
  const [config, data] = await Promise.all([configPromise, fetchData(session.user.id)])
  return Response.json({ data, config })
}
```

**Current violations:**
- `POST /api/tournaments` -- `bcrypt.hash` and code generation run sequentially. Hash can start while code is being generated.
- `POST /api/tournaments/[code]/matches/[id]/winner` -- `requireCreator`, `req.json()`, and match lookup are sequential when `req.json()` could start immediately.

### async-suspense-boundaries: Use Suspense to stream content

Not currently applicable since all pages are `"use client"`. When converting to Server Components, wrap async children in `<Suspense>`.

## 2. Bundle Size Optimization (CRITICAL)

### bundle-dynamic-imports: Use next/dynamic for heavy components

`BracketView` is a relatively complex component with SVG rendering. It should be dynamically imported on pages where it's not needed on initial render.

```typescript
import dynamic from 'next/dynamic'
const BracketView = dynamic(() => import('@/components/BracketView'), {
  loading: () => <BracketSkeleton />,
})
```

**Apply to:** `live/page.tsx` (bracket section at bottom), `results/page.tsx` (bracket section at bottom).

### bundle-barrel-imports: Import directly, avoid barrel files

No barrel files (`index.ts`) currently exist -- keep it that way. Always import from specific files.

## 3. Server-Side Performance (HIGH)

### server-serialization: Minimize data passed to client components

The GET `/api/tournaments/[code]` endpoint returns ALL nested data (items, participants, rounds with all matches and slots). For large brackets (32 items), this is a significant payload.

**Refactor:** Consider field selection or response shaping to reduce payload size.

### server-no-shared-module-state: No mutable module-level state

`src/lib/db.ts` uses module-level `globalThis` for the Prisma singleton. This is correct and expected for database clients.

**Rule:** Never add other mutable module-level variables in API route files or lib files used in RSC context.

## 4. Client-Side Data Fetching (MEDIUM-HIGH)

### client-localstorage-schema: Version and minimize localStorage data

Currently storing full JWT tokens as `chaveio_token_${code}` with no versioning or error handling.

**Refactor needed:**
```typescript
// Wrap localStorage access in try-catch
function getToken(code: string): string | null {
  try {
    return localStorage.getItem(`chaveio_token_${code}`)
  } catch {
    return null
  }
}

function setToken(code: string, token: string): void {
  try {
    localStorage.setItem(`chaveio_token_${code}`, token)
  } catch {}
}
```

**Apply across:** Every page that reads/writes localStorage (lobby, bracket, live, results, new).

### Polling cleanup

All polling intervals must:
1. Clear on unmount (already done via `return () => clearInterval`)
2. Use AbortController on fetch to cancel in-flight requests on unmount
3. Stop polling when tab is not visible (Page Visibility API)

## 5. Re-render Optimization (MEDIUM)

### rerender-no-inline-components: Don't define components inside components

**Current violation in `tournament/[code]/page.tsx` (lobby):**
```typescript
// Line 256: IIFE inside JSX creates new closure each render
{tournament.status === "LOBBY" && (() => { ... })()}
```
Extract this to a named component.

### rerender-derived-state-no-effect: Derive state during render, not effects

**Current violation in `tournament/new/page.tsx`:**
```typescript
// useEffect to sync roundNames with numRounds -- should derive instead
useEffect(() => {
  if (numRounds === null) return;
  setRoundNames(prev => { ... });
}, [numRounds]);
```
This can be replaced with derived computation during render.

### rerender-functional-setstate: Use functional setState

Already done well in most places (e.g., `setItems(prev => ...)` in new tournament). Verify all callbacks that update state based on previous state use the functional form.

### rerender-memo: Extract expensive work into memoized components

**BracketView** receives new object references every render:
- `itemMap` is `Object.fromEntries(...)` recomputed each render
- `augmentRounds(...)` creates new round objects each render
- `readOnlyRounds` creates a new `Set` each render

**Refactor:** Wrap these computations in `useMemo`:
```typescript
const itemMap = useMemo(
  () => Object.fromEntries(state.items.map(it => [it.id, it])),
  [state.items]
)
```

### rerender-lazy-state-init: Lazy state initialization

**Current violation in every page reading localStorage:**
```typescript
// In useEffect, not useState -- but token could use lazy init
const [token, setToken] = useState<string | null>(null)
// Then in useEffect: const stored = localStorage.getItem(...)
```
Since localStorage read happens in useEffect (correct for SSR), this is acceptable. No change needed.

## 6. Rendering Performance (MEDIUM)

### rendering-conditional-render: Use ternary, not && for safety

When conditions can be `0`, `NaN`, or falsy non-boolean, use ternary. Current code uses `&&` safely with boolean conditions -- acceptable.

### Shared UI components to extract

The `Spinner` component is duplicated in 4 files (bracket, live, results, lobby). Extract to `src/components/Spinner.tsx`.

SVG icons (checkmark, error, warning) are also duplicated. Consider extracting common icons.

## 7. JavaScript Performance (LOW-MEDIUM)

### js-set-map-lookups: Use Set/Map for O(1) lookups

**Current violation in `POST /api/picks`:**
```typescript
// Line 62-63: Array.includes for completed match IDs -- O(n) per check
const completedMatchIds = tournament.rounds
  .flatMap(r => r.matches)
  .filter(m => m.status === "COMPLETE")
  .map(m => m.id)
const attemptedOnComplete = picks.filter(p => completedMatchIds.includes(p.matchId))
```
Convert `completedMatchIds` to a `Set` for O(1) lookups.

### js-combine-iterations: Combine multiple array iterations

**Current violation in `results/page.tsx`:**
```typescript
// Lines 79-81: Three separate iterations over myPicks
const myTotalPoints = myPicks.reduce((s, p) => s + p.pointsEarned, 0)
const resolvedCount = myPicks.filter(p => p.isCorrect !== null).length
const correctCount = myPicks.filter(p => p.isCorrect).length
```
Combine into a single loop.

**Current violation in `bracket/page.tsx`:**
```typescript
// Lines 212-220: Complex nested iterations for pickedCount and eligibleCount
```
Simplify into a single pass.

---

# Refactoring Checklist

Priority order for refactoring (CRITICAL first):

## CRITICAL
- [ ] **API routes: parallelize independent operations** -- `POST /api/tournaments` (hash + code gen), `POST .../winner` (auth + body parse)
- [ ] **Dynamic import BracketView** on live and results pages

## HIGH
- [ ] **Extract shared components** -- Spinner, common SVG icons
- [ ] **Wrap localStorage in try-catch** helpers across all pages
- [ ] **Add AbortController** to polling fetches for cleanup on unmount

## MEDIUM
- [ ] **useMemo for expensive derived values** -- `itemMap`, `augmentRounds`, `readOnlyRounds` in bracket/page.tsx
- [ ] **Remove inline IIFE** in lobby page (extract to component)
- [ ] **Replace useEffect for roundNames sync** in new/page.tsx with derived computation
- [ ] **Use Set for completedMatchIds** in picks route
- [ ] **Combine array iterations** in results/page.tsx (totalPoints + resolved + correct in one loop)
- [ ] **Simplify pickedCount/eligibleCount** computation in bracket/page.tsx
