# Frontend Conventions & Best Practices

Based on Vercel React Best Practices. Apply these rules when writing or modifying any component in `src/app/` or `src/components/`.

---

## 1. Eliminating Waterfalls (CRITICAL)

### Parallel fetches with Promise.all

When loading page data from multiple endpoints, always fetch in parallel:

```typescript
// GOOD (bracket/page.tsx already does this)
const [tRes, pRes] = await Promise.all([
  fetch(`/api/tournaments/${code}`, { headers }),
  fetch(`/api/picks?tournamentCode=${code}`, { headers }),
])
```

Never chain independent fetches sequentially.

---

## 2. Bundle Size (CRITICAL)

### Dynamic imports for BracketView

BracketView is a complex SVG-heavy component. On pages where it appears below the fold (live, results), load it dynamically:

```typescript
import dynamic from 'next/dynamic'

const BracketView = dynamic(() => import('@/components/BracketView'), {
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />,
})
```

On `bracket/page.tsx` where BracketView is the primary content, keep the static import.

### No barrel files

Never create `index.ts` files that re-export from multiple modules. Always import from the specific file.

---

## 3. Re-render Optimization (MEDIUM)

### useMemo for expensive derived values

Any computation that creates new objects/arrays from state should use `useMemo`:

```typescript
// WRONG: new object every render, causes BracketView to re-render
const itemMap = Object.fromEntries(state.items.map(it => [it.id, it]))

// RIGHT: stable reference unless items change
const itemMap = useMemo(
  () => Object.fromEntries(state.items.map(it => [it.id, it])),
  [state.items]
)
```

Apply to: `itemMap`, `augmentRounds()`, `readOnlyRounds`, `myPickMap`.

### No inline components or IIFEs in JSX

Never define components inside other components -- they remount on every render:

```typescript
// WRONG (lobby page.tsx line ~256)
{tournament.status === "LOBBY" && (() => { ... })()}

// RIGHT: extract to a named component
function LobbyCTA({ tournament, participants, ... }: Props) { ... }
```

### Derive state during render, not with useEffect

If a value can be computed from current state, don't use useEffect + setState:

```typescript
// WRONG (new/page.tsx)
useEffect(() => {
  if (numRounds === null) return
  setRoundNames(prev => ...)
}, [numRounds])

// RIGHT: compute during render
const roundNames = useMemo(() => {
  if (numRounds === null) return []
  return Array.from({ length: numRounds }, (_, i) => existingNames[i] ?? '')
}, [numRounds, existingNames])
```

### Functional setState

When updating state based on previous value, always use the function form:

```typescript
// WRONG
setPicks({ ...picks, [matchId]: itemId })

// RIGHT
setPicks(prev => ({ ...prev, [matchId]: itemId }))
```

---

## 4. Client-Side Data Fetching (MEDIUM-HIGH)

### localStorage safety

Always wrap localStorage in try-catch. It throws in incognito mode (Safari), when storage is full, or when disabled:

```typescript
function getToken(code: string): string | null {
  try {
    return localStorage.getItem(`chaveio_token_${code}`)
  } catch {
    return null
  }
}

function setToken(code: string, token: string): void {
  try {
    localStorage.setItem(`chaveio_token_${code}`, token)
  } catch {
    // silently fail -- app still works via API
  }
}
```

### Polling with AbortController

All polling intervals should use AbortController to cancel in-flight requests on unmount:

```typescript
useEffect(() => {
  if (!shouldPoll) return
  const controller = new AbortController()

  const interval = setInterval(() => {
    fetch(url, { signal: controller.signal })
      .then(r => r.json())
      .then(handleData)
      .catch(err => {
        if (err.name !== 'AbortError') console.error(err)
      })
  }, 5000)

  return () => {
    controller.abort()
    clearInterval(interval)
  }
}, [shouldPoll])
```

---

## 5. Shared Components

### Extract duplicated UI

These components are duplicated across 3-4 files and should be extracted to `src/components/`:

| Component | Files | Target |
|-----------|-------|--------|
| `Spinner` | bracket, live, results, lobby | `src/components/Spinner.tsx` |
| Checkmark SVG icon | bracket, results, lobby, BracketView | `src/components/icons.tsx` |
| Error/warning banners | bracket, live, lobby | `src/components/Alert.tsx` |
| Page header bar | bracket, live, results, lobby | `src/components/PageHeader.tsx` |

---

## 6. Rendering Performance (MEDIUM)

### Use ternary over && when condition can be falsy non-boolean

```typescript
// SAFE (boolean condition)
{isCreator && <Badge>criador</Badge>}

// UNSAFE if count could be 0
{count && <Badge>{count}</Badge>}  // renders "0"

// SAFE alternative
{count > 0 ? <Badge>{count}</Badge> : null}
```

### Stable callback references

Use `useCallback` for callbacks passed to child components (especially BracketView's `onPick`):

```typescript
const handlePick = useCallback((matchId: string, itemId: string) => {
  setPicks(prev => {
    const newPicks = clearDownstream(matchId, rounds, prev)
    return { ...newPicks, [matchId]: itemId }
  })
  setSaved(false)
}, [rounds])
```
