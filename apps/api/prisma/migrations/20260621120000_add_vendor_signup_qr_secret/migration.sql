-- AlterTable
ALTER TABLE "vendors" ADD COLUMN "signup_secret" TEXT,
ADD COLUMN "signup_secret_version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "signup_secret_rotated_at" TIMESTAMPTZ;

-- Backfill existing vendors with secrets (legacy mode: version stays 0 until first rotation)
UPDATE "vendors"
SET "signup_secret" = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
WHERE "signup_secret" IS NULL;
