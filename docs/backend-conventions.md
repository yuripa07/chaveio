# Backend Conventions

Rules for `src/app/api/` routes. Based on Vercel React best practices.

---

## 1. Use `handleRequest()` for Auth + Body Parsing (CRITICAL)

All protected routes use the `handleRequest()` helper from `lib/api-utils.ts` to eliminate auth/body boilerplate:

```typescript
import { handleRequest } from "@/lib/api-utils";

// Auth only (GET routes)
const auth = await handleRequest(req, "participant");
if (!auth.ok) return auth.response;
// auth.payload has { participantId, tournamentId, isCreator }

// Auth + body parsing (POST routes)
const auth = await handleRequest<{ winnerId: string }>(req, "creator", { parseBody: true });
if (!auth.ok) return auth.response;
// auth.payload + auth.body available

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
