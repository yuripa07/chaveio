/*
  Warnings:

  - You are about to drop the column `theme` on the `Tournament` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Round" ADD COLUMN "name" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roundNames" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'LOBBY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "endedAt" DATETIME
);
INSERT INTO "new_Tournament" ("code", "createdAt", "endedAt", "id", "name", "startedAt", "status") SELECT "code", "createdAt", "endedAt", "id", "name", "startedAt", "status" FROM "Tournament";
DROP TABLE "Tournament";
ALTER TABLE "new_Tournament" RENAME TO "Tournament";
CREATE UNIQUE INDEX "Tournament_code_key" ON "Tournament"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
