-- AlterTable: move password from Participant to Tournament
ALTER TABLE "Tournament" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Participant" DROP COLUMN "passwordHash";
