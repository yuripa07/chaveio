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
| Auth | Google OAuth (user session cookie) + JWT per tournament via `jose` (HS256, 30d expiry) |
| OAuth client | `arctic` (Google provider, PKCE) |
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
│   │       ├── loading.tsx               # Lobby skeleton (Next.js route loading)
│   │       ├── bracket/page.tsx          # Fill bracket (pre-start) / view bracket (active)
│   │       ├── bracket/loading.tsx       # Bracket skeleton
│   │       ├── live/page.tsx             # Creator resolves matches
│   │       ├── live/loading.tsx          # Live skeleton
│   │       ├── results/page.tsx          # Leaderboard + bracket view
│   │       └── results/loading.tsx       # Results skeleton
│   └── api/
│       ├── auth/
│       │   ├── google/start/route.ts     # GET — sets flow cookie, 302s to Google
│       │   ├── google/callback/route.ts  # GET — upserts User, sets session cookie
│       │   ├── logout/route.ts           # POST — clears session cookie
│       │   └── me/route.ts               # GET — returns { user | null } for UserProvider
│       ├── tournaments/route.ts          # POST create (requires session)
│       └── tournaments/[code]/
│           ├── route.ts                  # GET tournament state (includes participant.userId)
│           ├── check/route.ts            # GET exists? (public) — returns { exists, status }
│           ├── join/route.ts             # POST join — requires session cookie
│           ├── start/route.ts            # POST start (creator)
│           ├── rankings/route.ts         # GET leaderboard (dense ranking)
│           ├── items/
│           │   └── order/route.ts        # PATCH reorder items (creator, LOBBY only)
│           ├── participants/
│           │   └── [id]/route.ts         # DELETE kick participant (creator, any status)
│           └── matches/[id]/
│               └── winner/route.ts       # POST set winner (creator)
│       └── picks/route.ts               # GET/POST picks
├── lib/
│   ├── api-utils.ts         # handleRequest() (tournament token) + handleUserRequest() (session cookie) helpers
│   ├── auth.ts              # signToken, verifyToken, requireParticipant, requireCreator, AuthError
│   ├── session.ts           # signSession, verifySession, requireUser, getOptionalUser, setSessionCookie, clearSessionCookie
│   ├── oauth.ts             # arctic.Google wrapper: getAuthUrl(), validateAuthorizationCode(), userinfo fetch
│   ├── oauth-flow-cookie.ts # issueFlowCookie / consumeFlowCookie — signed short-lived state + PKCE verifier
│   ├── bracket.ts           # getNextRoundSlot, getFeederMatches
│   ├── bracket-client.ts    # augmentRounds, clearDownstream (client-side bracket logic)
│   ├── cn.ts                # cn() — twMerge wrapper
│   ├── codes.ts             # generateCode (6-char, no ambiguous: 0OI1)
│   ├── db.ts                # PrismaClient singleton (globalThis pattern)
│   ├── auth-guard.ts        # resolveAuthGuardStatus (pure fn, returns AuthGuardStatus discriminated union)
│   ├── picks-validation.ts  # validateBracketPicks (cascade rules)
│   ├── points.ts            # computeRoundPoints, computeMaxPoints
│   ├── token-client.ts      # decodeTokenPayload (client-side, no verify)
│   └── token-storage.ts     # getStoredToken, setStoredToken (try-catch wrappers)
├── contexts/
│   ├── locale-context.tsx    # LocaleProvider, useLocale() — i18n context
│   ├── theme-context.tsx     # ThemeProvider, useTheme() — light/dark/system theme
│   └── user-context.tsx      # UserProvider, useUser() — Google session state (fetches /api/auth/me)
├── hooks/
│   ├── use-polling.ts        # usePolling() — interval + AbortController cleanup
│   ├── use-require-participant.ts # useRequireParticipant() — auth guard hook for protected pages
│   └── use-tournament-token.ts # useTournamentToken() — localStorage JWT management
├── components/
│   ├── app-header.tsx         # Unified per-page header (non-sticky); accepts backHref/backLabel, title, subtitle, rightSlot; shows logo when no backHref, tournament identity when title provided; always includes user menu
│   ├── bracket-view.tsx       # SVG bracket visualization (pick/predict/view modes)
│   ├── google-sign-in-button.tsx  # Full-page anchor to /api/auth/google/start (primary variant wraps colored G in white circle for indigo contrast)
│   ├── error-alert.tsx       # Red error banner
│   ├── form-field.tsx        # Labeled input wrapper
│   ├── info-banner.tsx       # Info/warning banner (type: info|warning)
│   ├── lobby-cta.tsx         # Lobby call-to-action (submit/start/waiting)
│   ├── page-spinner.tsx      # Full-page loading: PageSpinner, PageSkeleton, LobbyPageSkeleton, BracketPageSkeleton, LivePageSkeleton, ResultsPageSkeleton
│   ├── pulse-dot.tsx         # Animated status dot
│   ├── rankings-table.tsx    # Leaderboard table (highlights current user)
│   ├── result-icon.tsx       # Correct/incorrect/pending SVG icons
│   ├── score-stat.tsx        # Score display card
│   ├── sortable-bracket-item.tsx  # Drag-and-drop sortable item row (lobby, creator only)
│   ├── kick-participant-dialog.tsx  # Accessible kick confirmation modal (ARIA, focus, Escape, click-outside)
│   ├── participant-avatar.tsx  # Circular avatar with participant initial (indigo theme)
│   ├── section-header.tsx     # Icon + uppercase label + optional count (text-xxs, used in lobby)
│   └── spinner.tsx           # Inline spinner (sm/md/lg)
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
│   ├── auth-guard.test.ts
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
├── backend-conventions.md    # Backend patterns and rules
├── auth.md                   # Google OAuth + two-token model, linking flow, legacy guarantees
└── i18n.md                   # i18n: adding strings, API error translation, locale detection
```

## Database Models

9 models with cascading deletes on `tournamentId`:

| Model | Key Fields | Relations |
|-------|-----------|-----------|
| `User` | `googleSub` (unique), `email`, `name`, `avatarUrl`, `locale`, `tier` (FREE), `lastLoginAt` | 1->N: participants, tournamentsCreated |
| `Tournament` | `code` (unique), `status`, `creatorUserId`, `roundNames` (JSON) | 1->N: items, participants, matches, rounds; N->1: creator (User, optional) |
| `TournamentItem` | `name`, `position` (1-indexed, insertion order) | N->1: tournament; 1->N: matchSlots, picks |
| `Participant` | `displayName`, `isCreator`, `hasSubmittedPicks`, `joinedAtRound`, `userId` (nullable) | N->1: tournament, user (optional); 1->N: picks; `@@unique([tournamentId, userId])` (NULLs distinct) |
| `Round` | `roundNumber` (1-indexed), `status`, `pointValue` | N->1: tournament; 1->N: matches |
| `Match` | `matchNumber`, `status`, `winnerId` (nullable) | N->1: tournament, round; 1->N: slots, picks |
| `MatchSlot` | `position` (1 or 2), `itemId` | N->1: match, item; unique (matchId, position) |
| `Pick` | `pickedItemId`, `isCorrect` (nullable), `pointsEarned` | N->1: participant, match, item; unique (participantId, matchId) |

**Status enums (stored as strings):**
- Tournament: `LOBBY` -> `ACTIVE` -> `FINISHED`
- Round: `PENDING` -> `ACTIVE` -> `COMPLETE`
- Match: `PENDING` -> `COMPLETE`

## Auth

Two independent tokens coexist — see `docs/auth.md` for the full flow.

| Token | Storage | Shape | Lifetime | Purpose |
|---|---|---|---|---|
| **User session** | HttpOnly cookie `chaveio_session` | `{ userId, v: 1 }` | 30d | Google-authenticated human; spans tournaments. |
| **Tournament token** | `localStorage["chaveio_token_<CODE>"]` | `{ participantId, tournamentId, isCreator }` | 30d | Single-tournament identity. Header: `Authorization: Bearer <token>`. |

Tournament tokens signed with `JWT_SECRET`; sessions signed with `SESSION_SECRET` (rotatable independently). Both HS256 via `jose`.

All tournaments use Google OAuth — both the creator and every participant must have a session cookie to create or join. Anonymous flows (password join, link-google opt-in) have been removed.

Helpers (in `src/lib/auth.ts` and `src/lib/session.ts`):

- `requireParticipant(req)` / `requireCreator(req)` — tournament token; throw `AuthError`.
- `requireUser(req)` / `getOptionalUser(req)` — session cookie; throw `AuthError` (or return null).
- `signSession(payload)` / `verifySession(jwt)` / `setSessionCookie` / `clearSessionCookie`.
- `handleRequest(req, role, {parseBody?})` — tournament-token routes (auth + body).
- `handleUserRequest(req, {parseBody?})` — session routes (auth + body).

### OAuth flow (Google)

1. Landing / lobby / new-tournament pages render `<GoogleSignInButton returnTo=…>` — a plain `<a>` to `/api/auth/google/start`.
2. `/api/auth/google/start` generates `state` + PKCE `codeVerifier` via `arctic`, stores them in a signed short-lived `chaveio_oauth_flow` cookie (5 min TTL), and 302s to Google.
3. `/api/auth/google/callback` consumes the flow cookie (validating `state`), exchanges the code, fetches userinfo, upserts `User` by `googleSub`, sets `chaveio_session`, and 302s back to the allowlisted `returnTo` path.
4. Client `UserProvider` calls `GET /api/auth/me` on mount.

### Env vars

- `JWT_SECRET` — tournament token signing (existing).
- `SESSION_SECRET` — user session signing (new).
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/google/start` | -- | Issue flow cookie, 302 to Google consent |
| GET | `/api/auth/google/callback` | Flow cookie | Exchange code, upsert User, set session cookie, 302 to `returnTo` |
| POST | `/api/auth/logout` | -- | Clear session cookie |
| GET | `/api/auth/me` | Session (optional) | `{ user: { id, email, name, avatarUrl, tier } \| null }` |
| POST | `/api/tournaments` | Session | Create tournament + bracket, return `{ code, token }` (tournament token) |
| GET | `/api/tournaments/[code]` | Token | Full tournament state (includes `participant.userId`) |
| GET | `/api/tournaments/[code]/check` | -- | Public existence check `{ exists, status }` |
| POST | `/api/tournaments/[code]/join` | Session | Join tournament with Google session cookie. Returns `{ token }`. |
| POST | `/api/tournaments/[code]/start` | Creator | Activate round 1, set tournament ACTIVE |
| PATCH | `/api/tournaments/[code]/items/order` | Creator | Reorder bracket items (seeds + round-1 slots); blocked if any picks submitted |
| DELETE | `/api/tournaments/[code]/participants/[id]` | Creator | Kick a participant (any status); their picks cascade-delete |
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

**Pairing**: items are matched consecutively by `position` (insertion order). Position 1 vs 2, 3 vs 4, etc. Creator can reorder in the lobby before anyone submits picks.

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

### Code Style (see `docs/code-conventions.md`)
- No unnecessary comments — names should explain the code; comments only for non-obvious *why*
- Readable, semantic variable names — full domain names, no opaque abbreviations
- Allowed short names: `tx` (Prisma transaction), `id`, `req`/`res` (route handlers), `e` (catch)
- See `docs/git-workflow.md` for branch strategy, release versioning, and DB migration procedures

### Frontend Patterns (see `docs/frontend-conventions.md`)
1. **Custom hooks** — `useTournamentToken()` for JWT management, `usePolling()` for interval+abort
2. **Parallel fetches** — `Promise.all()` for independent API calls
3. **Dynamic imports** — `next/dynamic` for BracketView on live/results (static on bracket)
4. **useMemo** — for derived objects/arrays (`itemMap`, `augmentRounds`, `readOnlyRounds`)
5. **Functional setState** — always `setState(prev => ...)` when depending on previous state
6. **localStorage try-catch** — use `getStoredToken()`/`setStoredToken()` from `lib/token-storage.ts`
7. **Polling with AbortController** — use `usePolling()` hook from `hooks/use-polling.ts`
8. **Poll intervals**: lobby=3s, bracket=5s, results=4s (defined in `constants/tournament.ts`)
9. **Ternary over &&** — when condition could be falsy non-boolean (0, NaN)
10. **No inline components/IIFEs** — extract to named components
11. **Derive state during render** — don't use useEffect to sync derived state
12. **Shared bracket logic** — `augmentRounds()`, `clearDownstream()` in `lib/bracket-client.ts`
13. **i18n** — never hardcode UI strings; always use `useLocale()` + `t.*`; see `docs/i18n.md`
14. **Dark mode** — all new UI must include `dark:` variants; use `ThemeProvider`/`useTheme()` from `src/contexts/theme-context.tsx`; color mapping: `bg-white→dark:bg-zinc-900`, `bg-zinc-50→dark:bg-zinc-950`, `bg-zinc-100→dark:bg-zinc-800`, `text-zinc-900→dark:text-zinc-50`, `border-zinc-100→dark:border-zinc-800`

### Backend Patterns (see `docs/backend-conventions.md`)
1. **`handleRequest()` helper** — `lib/api-utils.ts` handles auth + body parsing with consistent errors
2. **Start promises early** — auth + `req.json()` + `params` begin in parallel
3. **Set for O(1) lookups** — convert arrays to Set when checking membership
4. **Combine iterations** — single loop instead of multiple filter/map chains
5. **Focused transactions** — only mutations inside `$transaction`, hashing/validation before
6. **Promise.all inside transactions** — parallelize independent writes
7. **Response shapes**: mutations `{ success: true }`, queries `{ data }`, errors `{ error: "msg" }`
8. **Auth gate testing** — always test both re-auth AND first-time-wrong-password (see docs/backend-conventions.md §8)
9. **API error strings always in English** — frontend translates via `translateApiError()`; see `docs/i18n.md`

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
