@AGENTS.md

# Chaveio

March Madness-style bracket prediction app for team bonding events. Before each tournament starts, every participant fills in the full bracket. Picks are private until each round is resolved by the creator. Points are awarded automatically.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styles | Tailwind CSS |
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
│   ├── points.ts     # computeRoundPoints, computeMaxPoints
│   ├── bracket.ts    # seedPositions, generateFirstRoundPairs, getNextRoundSlot
│   ├── codes.ts      # generateCode (6-char uppercase, no ambiguous chars)
│   ├── db.ts         # PrismaClient singleton
│   └── auth.ts       # signToken, verifyToken, requireParticipant, requireCreator
└── generated/
    └── prisma/       # auto-generated, gitignored

tests/
├── unit/
│   ├── points.test.ts
│   ├── bracket.test.ts
│   └── codes.test.ts
└── integration/      # phase 2+
```

## Database Models

`Tournament` → `TournamentItem[]`, `Participant[]`, `Round[]`, `Match[]`  
`Round` → `Match[]` (has pre-computed `pointValue`)  
`Match` → `MatchSlot[]` (2 slots per match), `Pick[]`  
`Pick` → belongs to `Participant` + `Match`; `isCorrect` is null until match resolves  

**Status enums (stored as strings in SQLite):**
- Tournament: `LOBBY` | `ACTIVE` | `FINISHED`
- Round: `PENDING` | `ACTIVE` | `COMPLETE`
- Match: `PENDING` | `COMPLETE`

## Scoring Rules (non-obvious)

Items must be a power of 2 (4, 8, 16, 32).

For N items and `totalRounds = log2(N)`:
- Rounds 1 to (totalRounds - 1): `pointValue = 2^(roundNumber - 1)`
- **Final round: `pointValue = N`** (breaks geometric progression intentionally)

Example for 16 items: 1 → 2 → 4 → **16** pts; max score = **40 pts**

See `src/lib/points.ts` for implementation.

## Bracket Seeding

`seedPositions(n)` returns seeds in bracket order using alternating complement pairing:
- n=4 → `[1, 4, 3, 2]` (matches: 1v4, 3v2)
- n=8 → `[1, 8, 5, 4, 3, 6, 7, 2]`

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
| POST | `/api/tournaments` | — | Create tournament, returns creator token |
| GET | `/api/tournaments/[code]` | Token | Tournament state (picks filtered to own) |
| POST | `/api/tournaments/[code]/join` | — | Join tournament, returns token |
| POST | `/api/tournaments/[code]/start` | Creator | Generate rounds/matches, activate round 1 |
| POST | `/api/tournaments/[code]/matches/[id]/winner` | Creator | Set winner, score picks, advance bracket |
| POST | `/api/picks` | Token | Upsert all picks (atomic transaction) |
| GET | `/api/picks` | Token | Return own picks |

## Implementation Phases

- [x] **Phase 1** — Project setup, Prisma schema, TDD algorithms (points, bracket, codes)
- [ ] **Phase 2** — Create/join APIs + picks API + landing/lobby/bracket UI
- [ ] **Phase 3** — Start/winner APIs + live UI + leaderboard
- [ ] **Phase 4** — Visual bracket component + mobile polish
- [ ] **Phase 5** — Deploy to Neon + Vercel, CI green

## Conventions

- All git commit messages in **English**
- TDD: write tests before implementation for `src/lib/**` and `src/app/api/**`
- Minimum 80% coverage on `src/lib/**` and `src/app/api/**`
- No `npm` — always `pnpm`
- Prisma client is at `@/generated/prisma` (not `@prisma/client`)
