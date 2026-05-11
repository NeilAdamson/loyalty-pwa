-- CreateTable
CREATE TABLE "webauthn_credentials" (
    "webauthn_credential_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "member_id" UUID,
    "staff_id" UUID,
    "credential_id" BYTEA NOT NULL,
    "public_key" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "transports" TEXT[],
    "aaguid" TEXT,
    "device_label" TEXT,
    "backup_eligible" BOOLEAN NOT NULL DEFAULT false,
    "backup_state" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY ("webauthn_credential_id"),
    CONSTRAINT "webauthn_credentials_actor_check" CHECK (
        ("member_id" IS NOT NULL AND "staff_id" IS NULL)
        OR ("member_id" IS NULL AND "staff_id" IS NOT NULL)
    )
);

-- UniqueIndex
CREATE UNIQUE INDEX "webauthn_credentials_credential_id_key" ON "webauthn_credentials"("credential_id");

-- ForeignKeys
ALTER TABLE "webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("vendor_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_users"("staff_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index
CREATE INDEX "webauthn_credentials_vendor_id_member_id_idx" ON "webauthn_credentials"("vendor_id", "member_id");

-- Index
CREATE INDEX "webauthn_credentials_vendor_id_staff_id_idx" ON "webauthn_credentials"("vendor_id", "staff_id");
