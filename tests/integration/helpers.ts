import { createPrisma } from "@/lib/db";
import { execSync } from "child_process";

export const testPrisma = createPrisma();

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
  execSync("npx prisma migrate deploy", { stdio: "pipe" });
}
