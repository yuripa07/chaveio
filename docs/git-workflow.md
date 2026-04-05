# Git & Deployment Workflow

## Branch Strategy

| Branch | Purpose | Auto-deploys |
|--------|---------|-------------|
| `main` | Production | Vercel (prod) |
| `dev` | Staging / integration | Vercel (preview) |
| `fix/*`, `feat/*` | Feature/fix work | No |

## Standard Flow

### 1. Start work from dev
```bash
git checkout dev && git pull
git checkout -b fix/<short-description>   # or feat/<short-description>
```

### 2. Open PR to dev
```bash
gh pr create --base dev --title "<title>" --body "..."
```
Merge after tests pass.

### 3. Release to production (PR dev → main)
When dev is stable:
```bash
gh pr create --base main --head dev --title "release: v0.x.y — <description>" --body "..."
```
Merge → Vercel auto-deploys `main`.

## Release Versioning

This project uses [semver](https://semver.org/) patch releases:

- `v0.x.y` — bump `y` for bug fixes
- `v0.x+1.0` — bump `x` for new features
- Tag `main` after merging: `git tag v0.x.y && git push origin v0.x.y`
- Update `package.json` `"version"` field to match the tag.

## Database Migrations (Neon)

This project uses two Neon PostgreSQL branches:
- **dev** → used by local dev and CI tests
- **main** → used by the Vercel production deployment

### Development migrations
```bash
pnpm prisma migrate dev --name <migration-name>
pnpm prisma generate
```

> If `migrate dev` times out on the Neon advisory lock, use the direct URL:
> ```bash
> DATABASE_URL="postgresql://neondb_owner:<pw>@ep-<id>.sa-east-1.aws.neon.tech/neondb?sslmode=require" \
>   pnpm prisma migrate dev --name <migration-name>
> ```
> (Remove `-pooler` from the hostname.)

### Production migrations

The GitHub Actions workflow (`.github/workflows/migrate-prod.yml`) applies pending migrations to the Neon **main** branch automatically on push to `main`. No manual step required.

If you need to apply manually:
```bash
DATABASE_URL="<prod-neon-url>" pnpm prisma migrate deploy
```
The prod `DATABASE_URL` is in Vercel → Project → Settings → Environment Variables (Production).

### Order of operations for schema changes

The GitHub Action runs `prisma migrate deploy` before the Vercel deployment, so the schema is always ahead of the code:

1. Merge PR to `main`
2. GitHub Action applies migration to Neon prod
3. Vercel deploys new code — schema already updated

## Neon Advisory Lock Workaround

Neon's pooler does not support PostgreSQL advisory locks. Always use the **direct** (non-pooler) hostname for migration commands. The direct URL drops `-pooler` from the hostname:

```
# Pooler (avoid for migrations):
ep-<id>-pooler.sa-east-1.aws.neon.tech

# Direct (use for migrations):
ep-<id>.sa-east-1.aws.neon.tech
```
