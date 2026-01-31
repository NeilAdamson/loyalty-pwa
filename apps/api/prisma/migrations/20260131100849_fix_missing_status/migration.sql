-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN     "last_login_at" TIMESTAMPTZ,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "city" TEXT,
ADD COLUMN     "region" TEXT;

-- AlterTable
ALTER TABLE "vendor_branding" ADD COLUMN     "card_text_color" TEXT NOT NULL DEFAULT '#ffffff';
