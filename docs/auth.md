# Auth

Chaveio runs two independent tokens side by side. This page explains why and how they interact.

---

## The two tokens

| Token | Storage | Shape | Lifetime | Purpose |
|---|---|---|---|---|
| **User session** | HttpOnly cookie `chaveio_session` | `{ userId, v: 1 }` | 30d | Identifies the Google-authenticated human across tournaments. |
| **Tournament token** | `localStorage["chaveio_token_<CODE>"]` | `{ participantId, tournamentId, isCreator }` | 30d | Identifies a participant inside one tournament. |

Both are HS256 JWTs signed with `jose`, but they use different secrets (`SESSION_SECRET` vs `JWT_SECRET`) so either can be rotated without invalidating the other.

Neither token is required for anonymous endpoints like `GET /api/tournaments/[code]/check`.

---

## Environment variables

- `JWT_SECRET` — tournament token signing.
- `SESSION_SECRET` — user session signing.
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

`POST /api/tournaments/[code]/join` requires `chaveio_session`. The body is ignored.

- Looks up a `Participant` by `(tournamentId, userId)`. If absent, creates one with `displayName = user.name` (or `"Participant"`), appending `" 2"`, `" 3"`, … on displayName collisions.
- Blocks joins when `status === FINISHED`; sets `joinedAtRound` to the active round when the tournament is `ACTIVE`.
- Returns the tournament JWT.

Re-joining the same tournament is idempotent: returns 200 with the same `participantId` and a fresh JWT.

---

## Frontend surfaces

| Component | Role |
|---|---|
| `src/contexts/user-context.tsx` | `<UserProvider>` fetches `/api/auth/me` on mount; exposes `{user, ready, logout, refresh}`. |
| `src/components/google-sign-in-button.tsx` | Plain `<a>` to `/api/auth/google/start?returnTo=…` (full-page nav — do not use `fetch`). Primary variant wraps the colored G in a white circle for contrast on indigo. |
| `src/components/app-header.tsx` | Global sticky header — brand on the left, user dropdown (avatar + theme + locale + sign-out) on the right, or `GoogleSignInButton` when signed out. Mounted once in `src/app/layout.tsx`. |
| `src/app/page.tsx` | Landing page: gates the "Create tournament" CTA on `user`; shows auth errors from `?auth_error=`. |
| `src/app/tournament/new/page.tsx` | Requires `user`; creator form collects name + items only. |
| `src/app/tournament/[code]/page.tsx` | Shows auto-join spinner or `GoogleSignInButton` depending on session state. |

---

## Out of scope (punted)

- Multi-provider OAuth (Apple, GitHub). Schema currently assumes `googleSub`; adding a provider later means a migration and probably a separate `Account` table.
- User-initiated rename after join. Display-name collisions are resolved deterministically (`" 2"`, `" 3"`, …) and final for this release.
- Profile page and cross-tournament history listing. The `User` relations are in place for a follow-up.
- CSRF beyond `SameSite=Lax`. Sufficient for MVP; revisit if cross-origin clients are added.
- Rate limiting on OAuth endpoints.
