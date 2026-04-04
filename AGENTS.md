<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Chaveio

March Madness-style bracket prediction app for team bonding events. Participants predict the full bracket before the tournament starts. Picks are private until each round is resolved by the creator. Points are awarded automatically.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styles | Tailwind CSS 4 |
| Database | SQLite (dev) / PostgreSQL Neon (prod) |
| ORM | Prisma 7 |
| Auth | JWT per tournament via `jose` (HS256, 30d expiry) |
| Password hashing | bcryptjs (10 rounds) |
| Icons | lucide-react |
| Class merging | tailwind-merge (`cn()` helper) |
| Tests | Vitest |
| Hosting | Vercel |
| CI | GitHub Actions |
| Package manager | **pnpm** (never npm) |

No state management library — all state is local React hooks + localStorage + polling.

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
│   ├── icon.tsx                          # App icon
│   ├── globals.css                       # Tailwind global styles
│   ├── tournament/
│   │   ├── new/page.tsx                  # Create tournament form
│   │   └── [code]/
│   │       ├── page.tsx                  # Lobby / join screen
│   │       ├── bracket/page.tsx          # Fill bracket (pre-start) / view bracket (active)
│   │       ├── live/page.tsx             # Creator resolves matches
│   │       └── results/page.tsx          # Leaderboard + bracket view
│   └── api/
│       ├── tournaments/route.ts          # POST create
│       └── tournaments/[code]/
│           ├── route.ts                  # GET tournament state
│           ├── check/route.ts            # GET exists? (public, no auth)
│           ├── join/route.ts             # POST join
│           ├── start/route.ts            # POST start (creator)
│           ├── rankings/route.ts         # GET leaderboard (dense ranking)
│           └── matches/[id]/
│               └── winner/route.ts       # POST set winner (creator)
│       └── picks/route.ts               # GET/POST picks
├── lib/
│   ├── auth.ts              # signToken, verifyToken, requireParticipant, requireCreator, AuthError
│   ├── bracket.ts           # seedPositions, generateFirstRoundPairs, getNextRoundSlot, getFeederMatches
│   ├── cn.ts                # cn() — twMerge wrapper
│   ├── codes.ts             # generateCode (6-char, no ambiguous: 0OI1)
│   ├── db.ts                # PrismaClient singleton (globalThis pattern)
│   ├── picks-validation.ts  # validateBracketPicks (cascade rules)
│   ├── points.ts            # computeRoundPoints, computeMaxPoints
│   ├── token-client.ts      # decodeTokenPayload (client-side, no verify)
│   └── token-storage.ts     # getStoredToken, setStoredToken (try-catch wrappers)
├── components/
│   ├── BracketView.tsx       # SVG bracket visualization (pick/predict/view modes)
│   ├── back-link.tsx         # Back navigation arrow
│   ├── error-alert.tsx       # Red error banner
│   ├── form-field.tsx        # Labeled input wrapper
│   ├── info-banner.tsx       # Info/warning banner (type: info|warning)
│   ├── lobby-cta.tsx         # Lobby call-to-action (submit/start/waiting)
│   ├── page-spinner.tsx      # Full-page loading (PageSpinner + PageSkeleton)
│   ├── pulse-dot.tsx         # Animated status dot
│   ├── rankings-table.tsx    # Leaderboard table (highlights current user)
│   ├── score-stat.tsx        # Score display card
│   ├── spinner.tsx           # Inline spinner (sm/md/lg)
│   └── tournament-header.tsx # Sticky header with code/name/back
├── constants/
│   ├── auth.ts               # JWT_EXPIRY = "30d"
│   ├── bracket-layout.ts     # SVG dimensions (BRACKET_BASE_HEIGHT, COLUMN_WIDTH, etc.)
│   ├── styles.ts             # Reusable Tailwind classes (INPUT_CLASS, PRIMARY_BUTTON_CLASS)
│   └── tournament.ts         # Statuses, VALID_SIZES, poll intervals (3s/5s/4s)
├── types/
│   └── tournament.ts         # TypeScript interfaces (TournamentState, RankEntry, etc.)
└── generated/
    └── prisma/               # Auto-generated, gitignored

tests/
├── unit/
│   ├── bracket.test.ts
│   ├── codes.test.ts
│   ├── picks-validation.test.ts
│   └── points.test.ts
└── integration/
    ├── fixtures.ts           # Route call helpers (createTournament, joinTournament, etc.)
    ├── globalSetup.ts        # Test DB setup + migrations
    ├── helpers.ts            # req() helper, test utilities
    ├── tournaments.test.ts
    ├── picks.test.ts
    ├── lifecycle.test.ts     # Full tournament lifecycle end-to-end
    ├── late-joiner.test.ts
    └── rankings.test.ts

docs/
├── frontend-conventions.md   # Frontend patterns and rules
└── backend-conventions.md    # Backend patterns and rules
```

## Database Models

8 models with cascading deletes on `tournamentId`:

| Model | Key Fields | Relations |
|-------|-----------|-----------|
| `Tournament` | `code` (unique), `status`, `roundNames` (JSON) | 1->N: items, participants, matches, rounds |
| `TournamentItem` | `name`, `seed` (1-indexed) | N->1: tournament; 1->N: matchSlots, picks |
| `Participant` | `displayName`, `passwordHash`, `isCreator`, `hasSubmittedPicks`, `joinedAtRound` | N->1: tournament; 1->N: picks |
| `Round` | `roundNumber` (1-indexed), `status`, `pointValue` | N->1: tournament; 1->N: matches |
| `Match` | `matchNumber`, `status`, `winnerId` (nullable) | N->1: tournament, round; 1->N: slots, picks |
| `MatchSlot` | `position` (1 or 2), `itemId` | N->1: match, item; unique (matchId, position) |
| `Pick` | `pickedItemId`, `isCorrect` (nullable), `pointsEarned` | N->1: participant, match, item; unique (participantId, matchId) |

**Status enums (stored as strings):**
- Tournament: `LOBBY` -> `ACTIVE` -> `FINISHED`
- Round: `PENDING` -> `ACTIVE` -> `COMPLETE`
- Match: `PENDING` -> `COMPLETE`

## Auth

JWT payload: `{ participantId, tournamentId, isCreator }`
Signed with `JWT_SECRET` env var (HS256). Stored in `localStorage` on client.
Header: `Authorization: Bearer <token>`

- `requireParticipant(req)` — verifies token, returns payload. Throws `AuthError`.
- `requireCreator(req)` — same + checks `isCreator`. Throws `AuthError`.
- `AuthError(message, status)` — custom error with HTTP status code.

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/tournaments` | -- | Create tournament + bracket, return `{ code, token }` |
| GET | `/api/tournaments/[code]` | Token | Full tournament state (items, participants, rounds/matches/slots) |
| GET | `/api/tournaments/[code]/check` | -- | Public existence check `{ exists, status }` |
| POST | `/api/tournaments/[code]/join` | -- | Join (password auth), return `{ token }` |
| POST | `/api/tournaments/[code]/start` | Creator | Activate round 1, set tournament ACTIVE |
| GET | `/api/tournaments/[code]/rankings` | Token | Leaderboard with dense ranking |
| POST | `/api/tournaments/[code]/matches/[id]/winner` | Creator | Set winner, score picks, advance bracket |
| POST | `/api/picks` | Token | Upsert all picks (atomic transaction) |
| GET | `/api/picks` | Token | Return own picks |

## Scoring Rules

Items must be a power of 2 (4, 8, 16, 32). For N items and `totalRounds = log2(N)`:
- Rounds 1 to (totalRounds - 1): `pointValue = 2^(roundNumber - 1)`
- **Final round: `pointValue = N`** (breaks geometric progression intentionally)

Example for 16 items: 1 -> 2 -> 4 -> **16** pts; max = **40 pts**

## Bracket Logic

**Seeding** (`seedPositions(n)`): alternating complement pairing.
- n=4 -> `[1, 4, 3, 2]` (matches: 1v4, 3v2)
- n=8 -> `[1, 8, 5, 4, 3, 6, 7, 2]`

**Advancement** (`getNextRoundSlot(matchNumber)`):
- `matchIndex = Math.floor((M - 1) / 2)`, `slotPosition = M % 2 === 1 ? 1 : 2`

**Bracket is created at tournament creation** (not at start). This allows picks before the tournament starts.

**Pick validation** (`validateBracketPicks`): R1 picks must match actual slots. Later rounds must cascade from feeder matches. Late joiners (joinedAtRound != null) only pick from their round onward.

---

## Conventions

### General
- Git commit messages in **English**
- UI strings in **pt-BR** (Portuguese Brazil)
- No `npm` — always **pnpm**
- Prisma client import: `@/generated/prisma` (not `@prisma/client`)
- No barrel files (`index.ts`) — always import from specific files
- No mutable module-level state (except Prisma singleton in `db.ts`)
- **Always update CLAUDE.md/AGENTS.md and docs/ when new patterns or structures are introduced**

### TDD Workflow
- Write tests **before** implementation for `src/lib/**` and `src/app/api/**`
- Unit tests: pure functions in `tests/unit/` (vitest, node environment)
- Integration tests: direct route handler invocation in `tests/integration/` (no HTTP server)
- Helpers in `fixtures.ts`: `createTournament()`, `joinTournament()`, `submitFullBracketPicks()`, etc.
- `req()` helper creates `NextRequest` with Bearer token + JSON body
- Minimum 80% coverage on `src/lib/**` and `src/app/api/**`

### Naming Conventions
- `handle*`: event handlers (`handleSubmit`, `handlePick`)
- `on*`: callback props (`onPick`, `onWinner`)
- `is*`: booleans (`isCreator`, `isReadOnly`)
- `*Map`: object lookups by ID (`itemMap`, `pickMap`)
- `*State`: component state shapes (`TournamentState`, `BracketPageState`)
- `tx`: Prisma transaction context
- Route params: `params: Promise<{ code: string }>`

### Frontend Patterns (see `docs/frontend-conventions.md`)
1. **Parallel fetches** — `Promise.all()` for independent API calls
2. **Dynamic imports** — `next/dynamic` for BracketView on live/results (static on bracket)
3. **useMemo** — for derived objects/arrays (`itemMap`, `augmentRounds`, `readOnlyRounds`)
4. **Functional setState** — always `setState(prev => ...)` when depending on previous state
5. **localStorage try-catch** — use `getStoredToken()`/`setStoredToken()` from `lib/token-storage.ts`
6. **Polling with AbortController** — cancel in-flight requests on unmount, ignore `AbortError`
7. **Poll intervals**: lobby=3s, bracket=5s, results=4s (defined in `constants/tournament.ts`)
8. **Ternary over &&** — when condition could be falsy non-boolean (0, NaN)
9. **No inline components/IIFEs** — extract to named components
10. **Derive state during render** — don't use useEffect to sync derived state

### Backend Patterns (see `docs/backend-conventions.md`)
1. **Start promises early** — auth + `req.json()` + `params` begin in parallel
2. **AuthError try-catch** — consistent pattern in all protected routes
3. **Set for O(1) lookups** — convert arrays to Set when checking membership
4. **Combine iterations** — single loop instead of multiple filter/map chains
5. **Focused transactions** — only mutations inside `$transaction`, hashing/validation before
6. **Promise.all inside transactions** — parallelize independent writes
7. **Response shapes**: mutations `{ success: true }`, queries `{ data }`, errors `{ error: "msg" }`

### Architecture Decisions
| Decision | Rationale |
|----------|-----------|
| No state management lib | Tournament data is ephemeral, fetched fresh per page |
| Polling (not WebSockets) | Simpler deployment, 3-5s intervals are sufficient |
| Bracket created at creation | Enables prediction before tournament starts |
| JWT in Bearer header | Stateless, no session DB |
| localStorage for tokens | Fast, local, best-effort (not critical path) |
| Dense ranking | More intuitive for users (no gaps in rank numbers) |
| Geometric + final bonus | Escalates difficulty; final round highlights importance |
| Set-based lookups | O(1) checking completed matches before validating picks |
| Transaction-based cascades | Atomicity when advancing winners and scoring picks |
| Dynamic import BracketView | SVG-heavy below fold on results/live saves initial bundle |
