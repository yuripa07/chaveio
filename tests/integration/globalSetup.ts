import { execSync } from "child_process";

export function setup() {
  // Neon pooler URLs don't support advisory locks required by prisma migrate deploy.
  // Use the direct (non-pooler) URL when DATABASE_URL contains "-pooler.".
  const env = { ...process.env };
  if (env.DATABASE_URL?.includes("-pooler.")) {
    env.DATABASE_URL = env.DATABASE_URL.replace("-pooler.", ".");
  }
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env,
  });
}
