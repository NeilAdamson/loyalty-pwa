/*
  Warnings:

  - Made the column `contact_name` on table `vendors` required. This step will fail if there are existing NULL values in that column.
  - Made the column `contact_phone` on table `vendors` required. This step will fail if there are existing NULL values in that column.

*/
-- Update existing NULLs before making columns NOT NULL
UPDATE "vendors" SET "contact_name" = '' WHERE "contact_name" IS NULL;
UPDATE "vendors" SET "contact_phone" = '' WHERE "contact_phone" IS NULL;

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN "contact_surname" TEXT NOT NULL DEFAULT '';
ALTER TABLE "vendors" ALTER COLUMN "contact_name" SET DEFAULT '';
ALTER TABLE "vendors" ALTER COLUMN "contact_name" SET NOT NULL;
ALTER TABLE "vendors" ALTER COLUMN "contact_phone" SET DEFAULT '';
ALTER TABLE "vendors" ALTER COLUMN "contact_phone" SET NOT NULL;
