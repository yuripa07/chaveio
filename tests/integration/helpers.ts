// tests/integration/helpers.ts
import { createPrisma } from "@/lib/db";
import { execSync } from "child_process";
import path from "path";

const TEST_DB_PATH = path.resolve(process.cwd(), "prisma/test.db");
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

// Explicitly pass the test URL to the adapter!
export const testPrisma = createPrisma(TEST_DB_URL);

export async function resetDb() {
  await testPrisma.pick.deleteMany();
  await testPrisma.matchSlot.deleteMany();
  await testPrisma.match.deleteMany();
  await testPrisma.round.deleteMany();
  await testPrisma.participant.deleteMany();
  await testPrisma.tournamentItem.deleteMany();
  await testPrisma.tournament.deleteMany();
}

export function setupTestDb() {
  execSync("pnpm prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
  });
}