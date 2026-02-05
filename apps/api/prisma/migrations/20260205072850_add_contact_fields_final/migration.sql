/*
  Warnings:

  - Made the column `contact_name` on table `vendors` required. This step will fail if there are existing NULL values in that column.
  - Made the column `contact_phone` on table `vendors` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable: Add contact_surname
ALTER TABLE "vendors" ADD COLUMN "contact_surname" TEXT NOT NULL DEFAULT '';

-- Fill NULLs via DO block (runs before ALTER in same transaction)
DO $$
BEGIN
  UPDATE "vendors" SET "contact_name" = '' WHERE "contact_name" IS NULL;
  UPDATE "vendors" SET "contact_phone" = '' WHERE "contact_phone" IS NULL;
END $$;

-- Now safe to set NOT NULL
ALTER TABLE "vendors" ALTER COLUMN "contact_name" SET DEFAULT '';
ALTER TABLE "vendors" ALTER COLUMN "contact_name" SET NOT NULL;

ALTER TABLE "vendors" ALTER COLUMN "contact_phone" SET DEFAULT '';
ALTER TABLE "vendors" ALTER COLUMN "contact_phone" SET NOT NULL;
