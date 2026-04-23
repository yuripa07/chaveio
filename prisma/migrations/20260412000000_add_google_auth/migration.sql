-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "googleSub" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "avatarUrl" TEXT,
    "locale" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AlterTable: relax passwordHash (existing rows keep their value; new Google-mode tournaments store NULL)
ALTER TABLE "Tournament" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable: add authMode (existing tournaments backfill to PASSWORD) + creatorUserId
ALTER TABLE "Tournament" ADD COLUMN "authMode" TEXT NOT NULL DEFAULT 'PASSWORD';
ALTER TABLE "Tournament" ADD COLUMN "creatorUserId" TEXT;

-- AlterTable: link Participant to User
ALTER TABLE "Participant" ADD COLUMN "userId" TEXT;

-- CreateIndex: one User may only hold one slot per tournament (NULL values coexist — legacy safe)
CREATE UNIQUE INDEX "Participant_tournamentId_userId_key" ON "Participant"("tournamentId", "userId");

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
