# Backend Conventions

Rules for `src/app/api/` routes. Based on Vercel React best practices.

---

## 1. Use `handleRequest()` / `handleUserRequest()` for Auth + Body Parsing (CRITICAL)

All protected routes use one of the helpers from `lib/api-utils.ts` to eliminate auth/body boilerplate. Pick by token type:

- **`handleRequest(req, "participant" | "creator", opts)`** — Bearer tournament JWT from `Authorization` header. Payload: `{ participantId, tournamentId, isCreator }`. Used for in-tournament actions.
- **`handleUserRequest(req, opts)`** — `chaveio_session` cookie (Google-authenticated user). Payload: `{ userId, v }`. Used for user-scope actions (create tournament, join a GOOGLE tournament, `/me`).

A single route can call both manually when needed (e.g. `/link-google` requires a session **and** password verification against a specific tournament).

```typescript
import { handleRequest, handleUserRequest } from "@/lib/api-utils";

// Tournament token, GET routes
const auth = await handleRequest(req, "participant");
if (!auth.ok) return auth.response;
// auth.payload has { participantId, tournamentId, isCreator }

// Tournament token + body
const auth = await handleRequest<{ winnerId: string }>(req, "creator", { parseBody: true });
if (!auth.ok) return auth.response;

// Session cookie + body
const result = await handleUserRequest<{ name: string }>(req, { parseBody: true });
if (!result.ok) return result.response;
// result.session.userId, result.body available

// Parallel with params
const [auth, { code }] = await Promise.all([
  handleRequest<{ winnerId: string }>(req, "creator", { parseBody: true }),
  params,
]);
if (!auth.ok) return auth.response;
```

### Parallel independent operations

Use `Promise.all()` for independent operations like hash + code generation:

```typescript
const [passwordHash, code] = await Promise.all([
  bcrypt.hash(creatorPassword, 10),
  generateUniqueCode()
])
```

---

## 3. Set for O(1) Lookups (MEDIUM)

When checking if an item exists in a collection, convert to Set first:

```typescript
const completedMatchIds = new Set(
  tournament.rounds
    .flatMap(r => r.matches)
    .filter(m => m.status === "COMPLETE")
    .map(m => m.id)
)
// O(1) per check
const blocked = picks.filter(p => completedMatchIds.has(p.matchId))
```

---

## 4. Combine Iterations (MEDIUM)

When extracting multiple values from the same array, use a single loop:

```typescript
let total = 0, resolved = 0, correct = 0
for (const p of picks) {
  total += p.pointsEarned
  if (p.isCorrect !== null) resolved++
  if (p.isCorrect) correct++
}
```

---

## 5. Transaction Best Practices (HIGH)

- Keep `$transaction` blocks short — they hold a DB connection
- Do hashing, validation, and data fetching **before** the transaction
- Only put mutations inside the transaction
- Use `Promise.all` for independent writes inside transactions:

```typescript
await prisma.$transaction(async (tx) => {
  await Promise.all([
    tx.match.update({ where: { id: matchId }, data: { status: "COMPLETE", winnerId } }),
    ...picks.map(pick =>
      tx.pick.update({ where: { id: pick.id }, data: { isCorrect: pick.pickedItemId === winnerId } })
    ),
  ])
})
```

---

## 6. Response Shapes (HIGH)

Consistent across all routes:

| Type | Format | Status |
|------|--------|--------|
| Create success | `{ code, token }` or `{ token }` | 201 |
| Mutation success | `{ success: true }` | 200 |
| Query success | `{ tournament, participants, items, rounds }` or `{ picks }` or `{ rankings }` | 200 |
| Validation error | `{ error: "message" }` | 400 |
| Auth error | `{ error: "message" }` | 401 / 403 |
| Not found | `{ error: "message" }` | 404 |
| Conflict | `{ error: "message" }` | 409 |

Never change response shapes without updating all consuming client pages.

---

## 7. Route Params (Next.js 16)

In Next.js 16, route params are async — always await:

```typescript
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  // ...
}
```

Start the params promise early alongside auth/body if possible.

---

## 8. Auth Gate Testing (CRITICAL — learned from prod incident)

Every authentication gate needs **two** tests:

1. **Returning user with wrong credentials** — validates re-auth logic
2. **First-time user with wrong credentials** — validates the gate itself

Skipping the second test allows anyone to bypass the gate on their first request.

```typescript
// ✗ Bad — only tests re-auth, gate is open to new users
await joinTournament(code, { displayName: "Bob", password: "correct" });
const res = await joinTournament(code, { displayName: "Bob", password: "wrong" });
expect(res.status).toBe(401);

// ✓ Good — also tests that the gate is closed to new users
it("rejects first-time join with wrong tournament password", async () => {
  const res = await joinTournament(code, { displayName: "NewUser", password: "wrong" });
  expect(res.status).toBe(401);
});
```

Applies to every password-gated route. `/api/tournaments/[code]/link-google` is tested with both cases:

1. A session that has **previously linked** to a participant, retrying with the wrong password.
2. A **first-time** session with the wrong password.

Both must return 401. Integration tests live in `tests/integration/link-google.test.ts`.

---

## 9. Session routes and cookies

Routes that accept the `chaveio_session` cookie must be reachable from same-origin browsers. Keep these rules:

- Cookies are set with `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/`, 30-day `Max-Age`. `SameSite=Lax` is required so the OAuth callback carries the session back on the post-consent redirect.
- `setSessionCookie` / `clearSessionCookie` live in `src/lib/session.ts`. Do not write to `Set-Cookie` manually.
- The OAuth flow cookie (`chaveio_oauth_flow`) is separate, signed by `SESSION_SECRET`, and short-lived (5 min TTL). It carries `state` + PKCE verifier + allowlisted `returnTo`. Consume it once with `consumeFlowCookie(req, state)` — it must reject on missing cookie, mismatched state, tampered signature, or expiry.
- OAuth `returnTo` is allowlisted against `^/(?:tournament(?:/[A-Z0-9]+)?|)?$`. Anything else falls back to `/`.

Integration tests for session routes use the helpers in `tests/integration/fixtures.ts` — `createUserAndSession`, `createGoogleTournament`, `joinTournamentWithGoogle`, `linkGoogleToParticipant`. Always include a "tampered session cookie" test alongside the "missing session" test (the tampered case covers signature validation, the missing case covers the gate itself — see §8).
