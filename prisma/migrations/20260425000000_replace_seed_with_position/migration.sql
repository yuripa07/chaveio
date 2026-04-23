-- AlterTable: rename seed -> position on TournamentItem
ALTER TABLE "TournamentItem" RENAME COLUMN "seed" TO "position";
