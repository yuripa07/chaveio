# Backend Conventions & Best Practices

Based on Vercel React Best Practices. Apply these rules when writing or modifying any API route in `src/app/api/`.

---

## 1. Prevent Waterfall Chains in API Routes (CRITICAL)

Start independent async operations immediately, even if you don't await them yet.

### Pattern: auth + body parsing in parallel

```typescript
// WRONG (sequential)
export async function POST(req: NextRequest) {
  const payload = await requireCreator(req)  // await 1
  const body = await req.json()              // await 2 (independent!)
  // ...
}

// RIGHT (start both immediately)
export async function POST(req: NextRequest) {
  const authPromise = requireCreator(req)
  const bodyPromise = req.json()

  let payload
  try {
    payload = await authPromise
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status })
    throw e
  }

  const body = await bodyPromise
  // ...
}
```

### Pattern: hash + code generation in parallel

In `POST /api/tournaments`:

```typescript
// WRONG (sequential)
const passwordHash = await bcrypt.hash(creatorPassword, 10)
// then generate code...

// RIGHT (parallel)
const [passwordHash, code] = await Promise.all([
  bcrypt.hash(creatorPassword, 10),
  generateUniqueCode()  // wrap retry logic in a function
])
```

---

## 2. Use Set/Map for O(1) Lookups (MEDIUM)

When checking if an item exists in a collection, convert arrays to Set first:

```typescript
// WRONG (O(n) per check in POST /api/picks)
const completedMatchIds = tournament.rounds
  .flatMap(r => r.matches)
  .filter(m => m.status === "COMPLETE")
  .map(m => m.id)
const attemptedOnComplete = picks.filter(p => completedMatchIds.includes(p.matchId))

// RIGHT (O(1) per check)
const completedMatchIds = new Set(
  tournament.rounds
    .flatMap(r => r.matches)
    .filter(m => m.status === "COMPLETE")
    .map(m => m.id)
)
const attemptedOnComplete = picks.filter(p => completedMatchIds.has(p.matchId))
```

---

## 3. Consistent Error Handling Pattern

All API routes follow this auth pattern. Keep it consistent:

```typescript
export async function POST(req: NextRequest) {
  let payload
  try {
    payload = await requireParticipant(req)  // or requireCreator
  } catch (e) {
    if (e instanceof AuthError) {
      return Response.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
  // ... route logic
}
```

For body parsing, always catch JSON parse errors:

```typescript
let body: unknown
try {
  body = await req.json()
} catch {
  return Response.json({ error: "Invalid JSON" }, { status: 400 })
}
```

---

## 4. Combine Multiple Array Iterations (MEDIUM)

When extracting multiple values from the same array, use a single loop:

```typescript
// WRONG (3 iterations)
const total = picks.reduce((s, p) => s + p.pointsEarned, 0)
const resolved = picks.filter(p => p.isCorrect !== null).length
const correct = picks.filter(p => p.isCorrect).length

// RIGHT (1 iteration)
let total = 0, resolved = 0, correct = 0
for (const p of picks) {
  total += p.pointsEarned
  if (p.isCorrect !== null) resolved++
  if (p.isCorrect) correct++
}
```

---

## 5. Transaction Best Practices

### Keep transactions focused

Prisma `$transaction` blocks hold a database connection for the entire duration. Keep them short:
- Avoid any non-DB work inside transactions (no hashing, no external API calls)
- Fetch data needed for validation BEFORE the transaction
- Only put mutations inside the transaction

### Use Promise.all inside transactions for independent writes

```typescript
await prisma.$transaction(async (tx) => {
  // Independent writes can be parallelized
  await Promise.all([
    tx.match.update({ where: { id: matchId }, data: { status: "COMPLETE", winnerId } }),
    ...picks.map(pick =>
      tx.pick.update({ where: { id: pick.id }, data: { isCorrect: pick.pickedItemId === winnerId, ... } })
    ),
  ])
})
```

---

## 6. API Response Shape

All API responses follow these conventions:
- Success: `{ success: true }` for mutations, `{ data }` for queries
- Error: `{ error: "message" }` with appropriate HTTP status
- Tournament state: `{ tournament, participants, items, rounds }`
- Picks: `{ picks: Pick[] }`

Never change these shapes without updating all consuming client pages.
