-- Vendor self-service registration and email/password vendor-admin auth.

ALTER TABLE "vendors"
ADD COLUMN IF NOT EXISTS "onboarding_status" TEXT NOT NULL DEFAULT 'INCOMPLETE',
ADD COLUMN IF NOT EXISTS "onboarding_completed_at" TIMESTAMPTZ;

-- Existing platform-created vendors predate the self-service wizard.
UPDATE "vendors"
SET "onboarding_status" = 'COMPLETE',
    "onboarding_completed_at" = COALESCE("onboarding_completed_at", "created_at")
WHERE "onboarding_status" = 'INCOMPLETE';

CREATE TABLE IF NOT EXISTS "vendor_admin_users" (
    "vendor_admin_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMPTZ,
    "reset_token" TEXT,
    "reset_token_exp" TIMESTAMPTZ,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vendor_admin_users_pkey" PRIMARY KEY ("vendor_admin_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vendor_admin_users_email_key" ON "vendor_admin_users"("email");
CREATE INDEX IF NOT EXISTS "vendor_admin_users_vendor_id_idx" ON "vendor_admin_users"("vendor_id");

ALTER TABLE "vendor_admin_users"
ADD CONSTRAINT "vendor_admin_users_vendor_id_fkey"
FOREIGN KEY ("vendor_id") REFERENCES "vendors"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "vendor_registrations" (
    "registration_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "trading_name" TEXT NOT NULL,
    "legal_name" TEXT,
    "contact_phone" TEXT,
    "vendor_slug" TEXT,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vendor_registrations_pkey" PRIMARY KEY ("registration_id")
);

CREATE INDEX IF NOT EXISTS "vendor_registrations_email_status_idx" ON "vendor_registrations"("email", "status");
