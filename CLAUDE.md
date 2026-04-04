@AGENTS.md

# Additional Rules

- **Always update AGENTS.md and docs/ when new patterns, structures, routes, components, or conventions are introduced.** If a new file is created, a new pattern is adopted, or an architectural decision is made, reflect it in the relevant doc immediately.
- After `pnpm add`, also run `npm install --package-lock-only` to keep `package-lock.json` in sync for CI.
