-- Migration: admin_user_schema_update
-- This migration adds username, first_name, last_name to admin_users
-- and migrates data from the existing 'name' column

-- 1. Add new columns with defaults (allows migration of existing data)
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "first_name" TEXT;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "last_name" TEXT;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "reset_token" TEXT;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "reset_token_exp" TIMESTAMPTZ;

-- 2. Backfill username from email (extract part before @)
UPDATE "admin_users" 
SET "username" = LOWER(SPLIT_PART("email", '@', 1))
WHERE "username" IS NULL;

-- 3. Backfill first_name and last_name from existing 'name' column
-- Split on first space: "Super Admin" -> first="Super", last="Admin"
-- If no space, put everything in first_name and use 'User' for last_name
UPDATE "admin_users"
SET 
  "first_name" = CASE 
    WHEN POSITION(' ' IN COALESCE("name", '')) > 0 
    THEN SPLIT_PART(COALESCE("name", 'Admin'), ' ', 1)
    ELSE COALESCE("name", 'Admin')
  END,
  "last_name" = CASE 
    WHEN POSITION(' ' IN COALESCE("name", '')) > 0 
    THEN SUBSTRING(COALESCE("name", 'User') FROM POSITION(' ' IN COALESCE("name", 'User')) + 1)
    ELSE 'User'
  END
WHERE "first_name" IS NULL OR "last_name" IS NULL;

-- 4. Set NOT NULL constraints now that data is backfilled
ALTER TABLE "admin_users" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "admin_users" ALTER COLUMN "first_name" SET NOT NULL;
ALTER TABLE "admin_users" ALTER COLUMN "last_name" SET NOT NULL;

-- 5. Add unique constraint on username
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_username_key'
  ) THEN
    ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_username_key" UNIQUE ("username");
  END IF;
END $$;

-- 6. Drop the old 'name' column (no longer needed)
ALTER TABLE "admin_users" DROP COLUMN IF EXISTS "name";
