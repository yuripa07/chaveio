@AGENTS.md

# Chaveio

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
│   ├── page.tsx                        # Landing: create or join
│   ├── tournament/
│   │   ├── new/page.tsx                # Create tournament form
│   │   └── [code]/
│   │       ├── page.tsx                # Lobby
│   │       ├── bracket/page.tsx        # Fill bracket (pre-start)
│   │       ├── live/page.tsx           # Creator resolves matches
│   │       └── results/page.tsx        # Leaderboard + round summary
│   └── api/
│       ├── tournaments/route.ts        # POST create
│       ├── tournaments/[code]/
│       │   ├── route.ts                # GET state
│       │   ├── join/route.ts           # POST join
│       │   ├── start/route.ts          # POST start (creator)
│       │   └── matches/[id]/winner/route.ts  # POST set winner (creator)
│       └── picks/route.ts              # GET/POST picks
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

**Status enums (stored as strings):**
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

## Frontend Best Practices (Vercel React)

See `docs/frontend-conventions.md` for detailed rules. Summary:

1. **No waterfalls** -- Use `Promise.all()` for parallel fetches (already done in bracket/results)
2. **Dynamic imports** -- Use `next/dynamic` for BracketView on secondary views
3. **useMemo for derived data** -- `itemMap`, `augmentRounds`, `readOnlyRounds`
4. **No inline components** -- Extract IIFEs and inline component definitions
5. **Derive state during render** -- Don't use useEffect to sync derived state
6. **Functional setState** -- Always use `setState(prev => ...)` when depending on previous state
7. **localStorage try-catch** -- Wrap all localStorage access in try-catch
8. **Extract shared components** -- Spinner, SVG icons used across pages
9. **AbortController on polling** -- Cancel in-flight requests on unmount

## Backend Best Practices (API Routes)

See `docs/backend-conventions.md` for detailed rules. Summary:

1. **Start promises early** -- `req.json()` and auth can begin in parallel
2. **Use Set for lookups** -- Convert arrays to Set when checking membership
3. **Combine iterations** -- Single loop instead of multiple filter/map chains
4. **Consistent error handling** -- auth try-catch pattern with AuthError
