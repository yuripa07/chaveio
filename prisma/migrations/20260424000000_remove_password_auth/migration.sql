-- Remove legacy PASSWORD auth columns. Google OAuth is now the only auth mode.
-- Legacy PASSWORD-mode tournaments stop working after this migration;
-- any existing participants without a linked Google user (userId IS NULL)
-- will remain in the table but can no longer re-authenticate.

ALTER TABLE "Tournament" DROP COLUMN IF EXISTS "passwordHash";
ALTER TABLE "Tournament" DROP COLUMN IF EXISTS "authMode";
