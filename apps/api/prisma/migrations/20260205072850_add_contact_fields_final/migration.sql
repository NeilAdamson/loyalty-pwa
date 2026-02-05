/*
  Warnings:

  - Made the column `contact_name` on table `vendors` required. This step will fail if there are existing NULL values in that column.
  - Made the column `contact_phone` on table `vendors` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable: Add contact_surname
ALTER TABLE "vendors" ADD COLUMN "contact_surname" TEXT NOT NULL DEFAULT '';

-- Convert NULLs to '' and set NOT NULL in one step (USING handles existing NULLs)
ALTER TABLE "vendors" ALTER COLUMN "contact_name" TYPE TEXT USING COALESCE("contact_name", '');
ALTER TABLE "vendors" ALTER COLUMN "contact_name" SET NOT NULL;
ALTER TABLE "vendors" ALTER COLUMN "contact_name" SET DEFAULT '';

ALTER TABLE "vendors" ALTER COLUMN "contact_phone" TYPE TEXT USING COALESCE("contact_phone", '');
ALTER TABLE "vendors" ALTER COLUMN "contact_phone" SET NOT NULL;
ALTER TABLE "vendors" ALTER COLUMN "contact_phone" SET DEFAULT '';
