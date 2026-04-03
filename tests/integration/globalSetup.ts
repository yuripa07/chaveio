import { execSync } from "child_process";
import path from "path";

const TEST_DB_URL = `file:${path.resolve(process.cwd(), "prisma/test.db")}`;

export function setup() {
  execSync("pnpm prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
  });
}
