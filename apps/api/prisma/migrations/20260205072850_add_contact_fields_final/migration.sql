/*
  Warnings:

  - Made the column `contact_name` on table `vendors` required. This step will fail if there are existing NULL values in that column.
  - Made the column `contact_phone` on table `vendors` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "contact_surname" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "contact_name" SET NOT NULL,
ALTER COLUMN "contact_name" SET DEFAULT '',
ALTER COLUMN "contact_phone" SET NOT NULL,
ALTER COLUMN "contact_phone" SET DEFAULT '';
