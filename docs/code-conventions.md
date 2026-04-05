# Code Conventions

General coding standards that apply across the entire codebase.

---

## 1. No Unnecessary Comments

Code should explain itself through naming. Only add a comment when the *why* genuinely cannot be expressed in code — never the *what*.

```typescript
// ✗ Redundant — the code already says this
// Hash the password
const passwordHash = await bcrypt.hash(password, 10);

// ✗ Restates the obvious
// Return 401 if password is wrong
if (!passwordOk) return Response.json({ error: "Senha incorreta" }, { status: 401 });

// ✓ Explains a non-obvious business rule
// Final round is worth N points (breaks geometric progression intentionally)
pointValue: roundNumber === totalRounds ? n : Math.pow(2, roundNumber - 1)
```

Do not use comments to:
- Label sections of a function (`// Validation`, `// DB query`)
- Restate what a variable or function already expresses
- Leave `// TODO` or `// FIXME` — open a GitHub issue instead

---

## 2. Readable and Semantic Variable Names

Names must communicate **what the value represents**, not how it was obtained or its type.

```typescript
// ✗ Opaque — what is "data"? what is "res"?
const res = await fetch(url);
const data = await res.json();

// ✓ Clear — names reflect the domain
const response = await fetch(url);
const tournamentState = await response.json();
```

```typescript
// ✗ Abbreviated to the point of ambiguity
const t = tournament;
const p = participant;
const r = round;

// ✓ Full names (editors autocomplete, keyboards are fast)
const tournament = ...;
const participant = ...;
const round = ...;
```

Allowed abbreviations (universally understood in this codebase):
- `tx` — Prisma transaction context
- `id` — identifier
- `req`, `res` — HTTP request/response in route signatures
- `e` — error in `catch (e)` blocks

Naming rules from `AGENTS.md`:
- `handle*` for event handlers (`handleSubmit`, `handleJoin`)
- `on*` for callback props (`onPick`, `onWinner`)
- `is*` for booleans (`isCreator`, `isReadOnly`)
- `*Map` for object lookups by ID (`itemMap`, `pickMap`)

---

## 3. Variable Names in Tests

Test fixtures and helpers use the same naming rules. Prefer names that reflect the role in the test scenario:

```typescript
// ✗ Generic
const r = await createTournament();
const t = await r.json();

// ✓ Role-aware
const createResponse = await createTournament();
const { code, token: creatorToken } = await createResponse.json();
```
