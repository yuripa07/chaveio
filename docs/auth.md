# Auth

Chaveio runs two independent tokens side by side. This page explains why, how they interact, and how legacy password tournaments keep working.

---

## The two tokens

| Token | Storage | Shape | Lifetime | Purpose |
|---|---|---|---|---|
| **User session** | HttpOnly cookie `chaveio_session` | `{ userId, v: 1 }` | 30d | Identifies the Google-authenticated human across tournaments. |
| **Tournament token** | `localStorage["chaveio_token_<CODE>"]` | `{ participantId, tournamentId, isCreator }` | 30d | Identifies a participant inside one tournament. |

Both are HS256 JWTs signed with `jose`, but they use different secrets (`SESSION_SECRET` vs `JWT_SECRET`) so either can be rotated without invalidating the other.

Neither token is required for anonymous endpoints like `GET /api/tournaments/[code]/check`.

---

## Tournament `authMode`

`Tournament.authMode` is either `PASSWORD` or `GOOGLE`.

- **`GOOGLE`** (default for every new tournament). `passwordHash` is `null`. `creatorUserId` links to the creator `User`. `Participant.userId` is set on every join.
- **`PASSWORD`** (legacy). `passwordHash` is set. Existing rows that pre-date this feature get `PASSWORD` automatically via the migration default, and everything continues to work with zero changes on the client. Participants may later opt in to `/link-google`.

The public `GET /api/tournaments/[code]/check` returns `{ exists, status, authMode }`, so the lobby can pick the correct UI before prompting for any credentials.

---

## Environment variables

- `JWT_SECRET` — tournament token signing (pre-existing).
- `SESSION_SECRET` — user session signing (new).
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.

See `.env.example`. Local dev uses `http://localhost:3000/api/auth/google/callback`; production points at the deployed origin.

---

## Google OAuth flow

```
┌──────────┐   1. click "Sign in"       ┌────────────────────────────┐
│  Client  │ ──────────────────────────▶│ /api/auth/google/start     │
└──────────┘                            │ - generate state + PKCE    │
                                        │ - set chaveio_oauth_flow   │
                                        │ - 302 to Google            │
                                        └─────────────┬──────────────┘
                                                      │
                                                      ▼
                                            ┌─────────────────┐
                                            │ Google consent  │
                                            └─────────┬───────┘
                                                      │
                                                      ▼
┌──────────┐   4. session cookie set    ┌────────────────────────────┐
│  Client  │ ◀──────────────────────────│ /api/auth/google/callback  │
└──────────┘     (302 to returnTo)      │ - consume flow cookie      │
                                        │ - validate state + code    │
                                        │ - fetch userinfo           │
                                        │ - upsert User by googleSub │
                                        │ - set chaveio_session      │
                                        └────────────────────────────┘
```

The `chaveio_oauth_flow` cookie is signed, short-lived (5 min), and carries `{state, codeVerifier, returnTo}`. It is **not** stored in the DB — avoiding a new table and GC concern.

`returnTo` is allowlisted to `^/(?:tournament(?:/[A-Z0-9]+)?|)?$`. Anything else resolves to `/`.

---

## Joining a tournament

`POST /api/tournaments/[code]/join` branches on `tournament.authMode`:

### `GOOGLE` mode

- Requires `chaveio_session`. The body is ignored.
- Looks up a `Participant` by `(tournamentId, userId)`. If absent, creates one with `displayName = user.name` (or `"Participant"`), appending `" 2"`, `" 3"`, … on displayName collisions.
- Blocks joins when `status === FINISHED`; honors `joinedAtRound` when `ACTIVE` (same as password mode).
- Returns the tournament JWT.

### `PASSWORD` mode (legacy)

- `{displayName, password}` body, as before.
- Additional guard: if the matched `Participant` has `userId != null` **and** the caller's session (if any) doesn't match, returns 401 `"This participant is protected with Google. Sign in with Google to continue."` This closes the impersonation window after a user opts into linking.

---

## Linking a Google account to a legacy Participant

`POST /api/tournaments/[code]/link-google` (session required):

1. Verify `tournament.authMode === "PASSWORD"`.
2. Verify the submitted `password` with `bcrypt.compare` — both returning-user and first-time-user cases must 401 on a bad password (see `docs/backend-conventions.md §8`).
3. Look up the `Participant` by `(tournamentId, displayName)`.
4. Reject with 409 if that participant is already linked to a **different** user.
5. Reject with 409 if the session's user is already linked to a **different** participant in this tournament.
6. Otherwise set `participant.userId = session.userId` and issue a fresh tournament JWT.

The operation is idempotent — re-linking the same user to the same participant is a no-op that still returns a fresh token.

---

## Legacy-tournament guarantees

Everything that shipped before this feature keeps working:

- The migration is purely additive (new `User` table, new nullable columns, relaxed `Tournament.passwordHash NOT NULL`). Existing rows stay on `authMode = "PASSWORD"` and `userId = NULL`.
- The tournament JWT shape (`{participantId, tournamentId, isCreator}`) is unchanged, so tokens already in users' `localStorage` continue to verify.
- `POST /api/tournaments/[code]/join` still accepts the old `{displayName, password}` body unchanged.
- The only new 401 path is the "protected with Google" guard — triggered exclusively when a participant has been explicitly linked via `/link-google`.

---

## Frontend surfaces

| Component | Role |
|---|---|
| `src/contexts/user-context.tsx` | `<UserProvider>` fetches `/api/auth/me` on mount; exposes `{user, ready, logout, refresh}`. |
| `src/components/google-sign-in-button.tsx` | Plain `<a>` to `/api/auth/google/start?returnTo=…` (full-page nav — do not use `fetch`). |
| `src/components/user-chip.tsx` | Header avatar + dropdown (sign out). Click-outside + Escape handling. |
| `src/app/page.tsx` | Landing page: gates the "Create tournament" CTA on `user`; shows auth errors from `?auth_error=`. |
| `src/app/tournament/new/page.tsx` | Requires `user`; creator form no longer collects name/password. |
| `src/app/tournament/[code]/page.tsx` | Branches on `authMode` + session state (see `docs/frontend-conventions.md §14`). |

---

## Out of scope (punted)

- Multi-provider OAuth (Apple, GitHub). Schema currently assumes `googleSub`; adding a provider later means a migration and probably a separate `Account` table.
- User-initiated rename after join. Display-name collisions are resolved deterministically (`" 2"`, `" 3"`, …) and final for this release.
- Profile page and cross-tournament history listing. The `User` relations are in place for a follow-up.
- CSRF beyond `SameSite=Lax`. Sufficient for MVP; revisit if cross-origin clients are added.
- Rate limiting on OAuth endpoints.
