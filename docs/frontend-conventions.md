# Frontend Conventions

Rules for `src/app/`, `src/components/`, and `src/hooks/`. Based on Vercel React best practices.

---

## 0. Custom Hooks (CRITICAL)

Reusable hooks live in `src/hooks/`. Use them instead of reimplementing patterns:

- **`useTournamentToken(code)`** — reads JWT from localStorage, decodes participantId/isCreator
- **`usePolling(callback, interval, enabled)`** — interval with automatic AbortController cleanup

```typescript
// Token management
const { token, participantId, isCreator, setTokenFromResponse } = useTournamentToken(code);

// Polling (automatically cancels on unmount or when disabled)
usePolling(
  async (signal) => {
    const res = await fetch(url, { signal });
    // ...
  },
  POLL_INTERVAL_LOBBY,
  !!token && isLobby
);
```

---

## 1. Parallel Fetches (CRITICAL)

Always fetch independent endpoints in parallel:

```typescript
const [tRes, pRes] = await Promise.all([
  fetch(`/api/tournaments/${code}`, { headers }),
  fetch(`/api/picks?tournamentCode=${code}`, { headers }),
])
```

Never chain independent fetches sequentially.

---

## 2. Dynamic Imports (CRITICAL)

BracketView is SVG-heavy. On pages where it's below the fold, load dynamically:

```typescript
import dynamic from 'next/dynamic'

const BracketView = dynamic(() => import('@/components/BracketView'), {
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />,
})
```

- **Static import**: `bracket/page.tsx` (BracketView is primary content)
- **Dynamic import**: `live/page.tsx`, `results/page.tsx` (BracketView is secondary)

Never create barrel files (`index.ts`).

---

## 3. useMemo for Derived Data (MEDIUM)

Wrap expensive computations that create new objects/arrays:

```typescript
const itemMap = useMemo(
  () => Object.fromEntries(state.items.map(it => [it.id, it])),
  [state.items]
)
```

Apply to: `itemMap`, `augmentRounds()`, `readOnlyRounds`, `myPickMap`.

---

## 4. No Inline Components (MEDIUM)

Never define components or IIFEs inside JSX. Extract to named components:

```typescript
// WRONG
{condition && (() => { ... })()}

// RIGHT
<LobbyCTA tournament={tournament} participants={participants} />
```

---

## 5. Derive State During Render (MEDIUM)

If a value can be computed from current state, compute it — don't use useEffect + setState:

```typescript
// WRONG
useEffect(() => { setDerived(computeFrom(state)) }, [state])

// RIGHT
const derived = useMemo(() => computeFrom(state), [state])
```

---

## 6. Functional setState (HIGH)

When updating state based on previous value, always use the function form:

```typescript
setPicks(prev => ({ ...prev, [matchId]: itemId }))
```

---

## 7. localStorage Safety (HIGH)

Always use the wrappers from `lib/token-storage.ts`:

```typescript
import { getStoredToken, setStoredToken } from '@/lib/token-storage'
```

These wrap `localStorage` in try-catch (throws in incognito Safari, storage full, disabled).

---

## 8. Polling with usePolling Hook (HIGH)

Use the `usePolling` hook from `hooks/use-polling.ts` instead of manual setInterval+AbortController:

```typescript
import { usePolling } from "@/hooks/use-polling";

usePolling(
  async (signal) => {
    const res = await fetch(url, { signal });
    if (!res.ok) return;
    const data = await res.json();
    setState(data);
  },
  POLL_INTERVAL_LOBBY,  // from constants/tournament.ts
  shouldPoll             // boolean — polling stops when false
);
```

The hook handles AbortController creation, cleanup on unmount, and error swallowing.

Poll intervals are defined in `constants/tournament.ts` (lobby=3s, bracket=5s, results=4s).

---

## 9. Ternary over && (LOW)

When condition could be `0`, `NaN`, or falsy non-boolean:

```typescript
// SAFE (boolean)
{isCreator && <Badge>criador</Badge>}

// UNSAFE if count could be 0
{count && <Badge>{count}</Badge>}  // renders "0"

// SAFE
{count > 0 ? <Badge>{count}</Badge> : null}
```

---

## 10. Stable Callback References (LOW)

Use `useCallback` for callbacks passed to child components (especially BracketView's `onPick`):

```typescript
const handlePick = useCallback((matchId: string, itemId: string) => {
  setPicks(prev => { ... })
}, [rounds])
```

---

## 11. Shared Components

Reusable components live in `src/components/`. Always check if one exists before creating inline UI:

| Component | Usage |
|-----------|-------|
| `spinner.tsx` | Inline loading spinner (sm/md/lg) |
| `page-spinner.tsx` | Full-page loading (PageSpinner + PageSkeleton) |
| `error-alert.tsx` | Red error banner |
| `info-banner.tsx` | Info/warning banner |
| `tournament-header.tsx` | Sticky header with code/name/back |
| `rankings-table.tsx` | Leaderboard (highlights current user) |
| `result-icon.tsx` | Correct/incorrect/pending result SVG icons |
| `back-link.tsx` | Back navigation arrow |
| `form-field.tsx` | Labeled input wrapper |
| `score-stat.tsx` | Score display card |
| `pulse-dot.tsx` | Animated status dot |
| `lobby-cta.tsx` | Lobby call-to-action |

Shared Tailwind classes are in `constants/styles.ts` (`INPUT_CLASS`, `PRIMARY_BUTTON_CLASS`).
