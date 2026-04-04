# Backend Conventions

Rules for `src/app/api/` routes. Based on Vercel React best practices.

---

## 1. Start Promises Early (CRITICAL)

Start independent async operations immediately. Auth, body parsing, and params resolution are independent:

```typescript
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string; id: string }> }
) {
  const authPromise = requireCreator(req)
  const bodyPromise = req.json().catch(() => null)
  const paramsPromise = params

  let payload
  try {
    payload = await authPromise
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status })
    throw e
  }

  const [body, { code, id }] = await Promise.all([bodyPromise, paramsPromise])
  // ... route logic
}
```

Use `Promise.all()` for independent operations like hash + code generation:

```typescript
const [passwordHash, code] = await Promise.all([
  bcrypt.hash(creatorPassword, 10),
  generateUniqueCode()
])
```

---

## 2. Auth Error Handling (CRITICAL)

All protected routes follow this pattern:

```typescript
let payload
try {
  payload = await requireParticipant(req)  // or requireCreator
} catch (e) {
  if (e instanceof AuthError) {
    return Response.json({ error: e.message }, { status: e.status })
  }
  throw e
}
```

For body parsing:

```typescript
let body: unknown
try {
  body = await req.json()
} catch {
  return Response.json({ error: "Invalid JSON" }, { status: 400 })
}
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
