# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
