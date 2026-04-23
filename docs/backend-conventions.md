# Backend Conventions

Rules for `src/app/api/` routes. Based on Vercel React best practices.

---

## 1. Use `handleRequest()` / `handleUserRequest()` for Auth + Body Parsing (CRITICAL)

All protected routes use one of the helpers from `lib/api-utils.ts` to eliminate auth/body boilerplate. Pick by token type:

- **`handleRequest(req, "participant" | "creator", opts)`** — Bearer tournament JWT from `Authorization` header. Payload: `{ participantId, tournamentId, isCreator }`. Used for in-tournament actions.
- **`handleUserRequest(req, opts)`** — `chaveio_session` cookie (Google-authenticated user). Payload: `{ userId, v }`. Used for user-scope actions (create tournament, join a tournament, `/me`).

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

Use `Promise.all()` for independent operations:

```typescript
const [session, { code }, body] = await Promise.all([
  requireUser(req),
  params,
  req.json(),
]);
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
- Do validation and data fetching **before** the transaction
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

## 8. Auth Gate Testing (CRITICAL)

Every authentication gate needs both a **missing credential** test and a **tampered credential** test:

- Missing credential covers the gate itself (anonymous requester is rejected).
- Tampered credential covers signature validation (forged JWT is rejected).

```typescript
it("returns 401 when no session cookie is present", async () => {
  const res = await POST(new NextRequest(url, { method: "POST", body: "{}" }), {
    params: Promise.resolve({ code }),
  });
  expect(res.status).toBe(401);
});

it("returns 401 when session cookie is tampered", async () => {
  const res = await POST(
    new NextRequest(url, {
      method: "POST",
      headers: { Cookie: `${SESSION_COOKIE}=garbage.jwt.value` },
      body: "{}",
    }),
    { params: Promise.resolve({ code }) }
  );
  expect(res.status).toBe(401);
});
```

See `tests/integration/join-google.test.ts` and `tournaments.test.ts` for the canonical pattern.

---

## 9. Session routes and cookies

Routes that accept the `chaveio_session` cookie must be reachable from same-origin browsers. Keep these rules:

- Cookies are set with `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/`, 30-day `Max-Age`. `SameSite=Lax` is required so the OAuth callback carries the session back on the post-consent redirect.
- `setSessionCookie` / `clearSessionCookie` live in `src/lib/session.ts`. Do not write to `Set-Cookie` manually.
- The OAuth flow cookie (`chaveio_oauth_flow`) is separate, signed by `SESSION_SECRET`, and short-lived (5 min TTL). It carries `state` + PKCE verifier + allowlisted `returnTo`. Consume it once with `consumeFlowCookie(req, state)` — it must reject on missing cookie, mismatched state, tampered signature, or expiry.
- OAuth `returnTo` is allowlisted against `^/(?:tournament(?:/[A-Z0-9]+)?|)?$`. Anything else falls back to `/`.

Integration tests for session routes use the helpers in `tests/integration/fixtures.ts` — `createUserAndSession`, `createTournament`, `joinTournament`. Always include a "tampered session cookie" test alongside the "missing session" test (§8).
