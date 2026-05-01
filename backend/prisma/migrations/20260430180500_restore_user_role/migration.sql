ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'user';

UPDATE "User"
SET "role" = CASE WHEN "isAdmin" = true THEN 'admin' ELSE 'user' END
WHERE "role" IS NULL OR "role" = 'user';
