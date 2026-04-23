# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2026-04-23

### Removed

#### Legacy PASSWORD authentication
- `Tournament.passwordHash` and `Tournament.authMode` columns dropped (migration `remove_password_auth`).
- `POST /api/tournaments/[code]/link-google` deleted — no remaining linking surface.
- `handlePasswordJoin` removed from `POST /api/tournaments/[code]/join`; the route now requires a Google session unconditionally.
- `Participant.passwordHash` (already nullable) is no longer touched by any code path.
- `bcryptjs` dependency removed.
- `GET /api/tournaments/[code]/check` response simplified to `{ exists, status }` (no `authMode`).
- Lobby UI no longer branches on `authMode`: `src/app/tournament/[code]/page.tsx`, `bracket/page.tsx`, `live/page.tsx`, `results/page.tsx` all drop the `PASSWORD` paths and the "Protect with Google" CTA.
- `tests/integration/link-google.test.ts` deleted; password-protected impersonation regressions removed from `join-google.test.ts`.
- Translation strings for legacy auth (`auth.protectWithGoogle*`, `auth.linkRequired*`, `lobby.passwordLabel`, etc.) removed from `src/locales/translations.ts`.

### Added

#### Global `AppHeader`
- New `src/components/app-header.tsx` mounted once in `src/app/layout.tsx`. Replaces the per-page `UserChip` and the fixed-bottom `LocaleSwitcher`.
- Brand on the left; user dropdown on the right with avatar, theme toggle (Sun/Moon/Monitor), locale toggle (PT/EN), and sign-out. When signed out, a compact `GoogleSignInButton` (secondary) takes the dropdown slot.
- Escape and click-outside close the dropdown.

### Changed

- `GoogleSignInButton` primary variant wraps the colored Google G in a white circle so it stays visible on the indigo background.
- `tests/integration/fixtures.ts` collapsed to a single `createTournament` / `joinTournament` pair (Google-only); helpers no longer return raw `Response` objects, returning destructurable tuples (`{ response, status, code, token, sessionCookie, userId }`).
- `docs/auth.md`, `docs/backend-conventions.md`, `docs/frontend-conventions.md`, and `AGENTS.md` updated for the single-auth model.

---

## [0.1.0] - 2026-04-12

### Added

#### Google OAuth sign-in
- Users sign in with Google via `arctic` (PKCE). Session persisted in an `HttpOnly` `chaveio_session` cookie (30d, HS256 via `jose`) signed with the new `SESSION_SECRET`.
- New routes: `GET /api/auth/google/start`, `GET /api/auth/google/callback`, `POST /api/auth/logout`, `GET /api/auth/me`.
- Short-lived signed `chaveio_oauth_flow` cookie carries OAuth `state` + PKCE verifier + allowlisted `returnTo` (5 min TTL). No new DB table.
- New libraries: `src/lib/session.ts`, `src/lib/oauth.ts`, `src/lib/oauth-flow-cookie.ts`. `lib/api-utils.ts` gains `handleUserRequest()` alongside the existing `handleRequest()`.

#### User model and two-token architecture
- New `User` model (`googleSub` unique, email, name, avatarUrl, locale, `tier = FREE`, `lastLoginAt`). Future-proof for profiles, history, and premium.
- `Tournament` adds `authMode` (`PASSWORD` | `GOOGLE`, default `PASSWORD` for backward compatibility) and nullable `creatorUserId`. `passwordHash` relaxed to nullable.
- `Participant` adds nullable `userId` with `@@unique([tournamentId, userId])` (Postgres treats NULLs as distinct, so legacy rows coexist).
- Additive migration `add_google_auth` — zero required changes on existing rows.

#### Tournament creation and join flow
- All new tournaments are created in `GOOGLE` mode. Creator form no longer collects name or password — identity comes from the session.
- `POST /api/tournaments/[code]/join` branches on `authMode`: `GOOGLE` requires a session and auto-links the `Participant`; `PASSWORD` keeps the legacy `{displayName, password}` body unchanged.
- Display-name collisions on Google joins are resolved deterministically (`" 2"`, `" 3"`, …).
- `GET /api/tournaments/[code]/check` now also returns `authMode` so the lobby can pick the right UI before prompting.

#### Protect-with-Google (legacy linking)
- New `POST /api/tournaments/[code]/link-google`: a participant in a `PASSWORD` tournament re-enters the tournament password once to bind their Google account. After linking, password-only login for that displayName is rejected with 401 "This participant is protected with Google…".
- Frontend CTA appears in the lobby when signed in + current participant is unlinked.

#### Frontend
- `UserProvider` context + `useUser()` hook (`src/contexts/user-context.tsx`) mounted in the root layout.
- `GoogleSignInButton` component (full-page anchor — carries `Set-Cookie` on redirect). Primary/secondary variants.
- `UserChip` component: header avatar + sign-out dropdown.
- Landing page (`/`) gates "Create tournament" on authentication and surfaces OAuth errors via `?auth_error=`.
- Tournament lobby (`/tournament/[code]`) branches on `authMode` + session state: Google auto-join, password form, or protect-with-Google CTA.

#### i18n
- New `auth` namespace in `src/locales/translations.ts` (pt-BR + en).
- New English `apiErrors` for session + linking rejections, translated in pt-BR (`"Sign in required…"`, `"This participant is protected with Google…"`, etc.).

#### Docs
- New `docs/auth.md` — two-token model, OAuth flow diagram, linking flow, legacy guarantees, out-of-scope list.
- `AGENTS.md`, `docs/backend-conventions.md`, `docs/frontend-conventions.md`, `docs/i18n.md` updated for `handleUserRequest`, `UserContext`, `GoogleSignInButton`, `authMode`, and the new routes/env vars.

#### Testing
- Unit: `session.test.ts`, `oauth-flow-cookie.test.ts`.
- Integration: `auth/me.test.ts`, `auth/logout.test.ts`, `auth/google-callback.test.ts`, `join-google.test.ts`, `link-google.test.ts`; `tournaments.test.ts` and `check.test.ts` expanded for the new session gate and `authMode` response.
- `tests/integration/fixtures.ts` gains `createUserAndSession`, `createGoogleTournament`, `joinTournamentWithGoogle`, `linkGoogleToParticipant`. Legacy PASSWORD-mode fixture rewritten to a direct Prisma insert so pre-existing tests remain untouched.

### Security
- `/link-google` honors the two-case auth test rule (returning-user-wrong-password **and** first-time-user-wrong-password both 401).
- Session cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production. `SameSite=Lax` is intentional so the OAuth callback carries the cookie back.

### Internal
- New dependency: `arctic` (Google OAuth + PKCE).
- `SESSION_SECRET` env var (distinct from `JWT_SECRET`) so either can be rotated independently.

---

## [0.0.3] - 2026-04-12

### Added

#### Internationalization (i18n)
- Full pt-BR / English translation support via `LocaleProvider` and `useLocale()` hook
- Translation files for all UI strings in `src/locales/translations.ts`
- `LocaleSwitcher` component (fixed bottom-right pill) with PT/EN language toggle
- API error messages standardized to English; translated on the frontend via `translateApiError()`
- i18n guide documented in `docs/i18n.md`

#### Dark Mode / Theme Toggle
- Light / Dark / System theme support via `ThemeProvider` and `useTheme()` context
- Theme toggle integrated into `LocaleSwitcher` pill (Sun / Moon / Monitor icons)
- Dark mode variants applied across all pages and components

#### Drag-and-Drop Bracket Reordering
- Tournament creator can reorder bracket candidates in the lobby via drag-and-drop
- `PATCH /api/tournaments/[code]/items/order` endpoint to persist new seed order
- Reordering is blocked once any participant has submitted picks
- `SortableBracketItem` and `ReorderableSlotItem` components using `@dnd-kit`

#### Kick Participant
- Creator can remove participants at any time (lobby, active, finished)
- `DELETE /api/tournaments/[code]/participants/[id]` endpoint; participant's picks cascade-delete
- `KickParticipantDialog` with full accessibility: ARIA roles, focus trap, Escape key, click-outside dismiss
- Kick button available in both lobby and live pages

#### Bracket Champion Column
- SVG bracket now shows a champion column to the right of the final with a trophy icon
- Predicted champion is hidden on the results page until the final match is resolved

#### Auth Guard
- `useRequireParticipant()` hook protects all participant-only pages from infinite loading when unauthenticated
- `resolveAuthGuardStatus()` pure function with `AuthGuardStatus` discriminated union in `src/lib/auth-guard.ts`

#### New Components
- `ParticipantAvatar` — circular avatar with participant initial (indigo theme)
- `SectionHeader` — icon + uppercase label + optional count (used in lobby)
- `KickParticipantDialog` — accessible kick confirmation modal

### Fixed

- Late joiners (participants who join mid-tournament) can now make picks starting from their join round, even when some matches in that round are already complete
- Auth guard no longer causes infinite loading spinner on protected pages when the user is unauthenticated
- Predicted champion column hidden on results page until the final is resolved
- Bracket champion column connector correctly aligned with the final match
- `LocaleSwitcher` pill redesigned; removed indigo shadows from dark mode bracket
- All API error messages converted to English for consistent frontend translation
- Form field labels and error messages fully translated to pt-BR
- Items label renamed from "Participantes" to "Candidatos" in tournament creation
- Lobby CTA shows "Editar palpites" when picks have already been submitted

### Security

- Upgraded Next.js to 16.2.3 to fix a high-severity DoS vulnerability
- Applied `npm audit fix` patches across transitive dependencies

### Internal

- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` added for drag-and-drop
- `src/lib/auth-guard.ts` — pure auth guard status resolver
- `src/lib/translate-api-error.ts` — maps English API errors to localized UI strings
- `src/lib/token-storage.ts` — `getStoredToken` / `setStoredToken` try-catch wrappers extracted
- `src/contexts/locale-context.tsx` and `src/contexts/theme-context.tsx` added
- `src/hooks/use-require-participant.ts` added
- New integration tests: `item-reorder.test.ts`, `kick-participant.test.ts`
- New unit tests: `auth-guard.test.ts`, `bracket-client.test.ts` (expanded)

---

## [0.0.2] - 2026-03-01

### Added
- Initial bracket prediction app with full tournament lifecycle (lobby → active → finished)
- Participant join flow with password authentication and JWT tokens
- Bracket fill page for submitting predictions before tournament starts
- Live page for creator to resolve matches round by round
- Results page with leaderboard (dense ranking) and read-only bracket view
- Automatic scoring: correct picks award points per round; final round bonus points
- Lobby item reorder (seed assignment) for tournament creator
- `usePolling()` hook with AbortController cleanup for real-time updates
- `rankings` endpoint with dense ranking algorithm
- Late joiner support: participants who join mid-tournament receive partial pick sheets

---

## [0.0.1] - 2026-02-01

### Added
- Project bootstrap: Next.js 16 App Router + TypeScript + Tailwind CSS 4
- Prisma 7 schema with SQLite (dev) / PostgreSQL Neon (prod)
- Tournament creation with bracket generation at creation time
- JWT auth per tournament (HS256, 30d expiry)
- Basic bracket seeding logic (`seedPositions`, `generateFirstRoundPairs`, `getNextRoundSlot`)
