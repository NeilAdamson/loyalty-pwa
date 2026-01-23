-- AlterTable
ALTER TABLE "vendor_branding" ADD COLUMN     "accent_color" TEXT NOT NULL DEFAULT '#3B82F6',
ADD COLUMN     "background_color" TEXT,
ADD COLUMN     "card_bg_image_url" TEXT,
ADD COLUMN     "card_style" TEXT NOT NULL DEFAULT 'SOLID',
ADD COLUMN     "card_title" TEXT,
ADD COLUMN     "welcome_text" TEXT,
ADD COLUMN     "wordmark_url" TEXT;
