-- CreateTable
CREATE TABLE "vendors" (
    "vendor_id" UUID NOT NULL,
    "vendor_slug" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trading_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "billing_plan_id" TEXT NOT NULL,
    "billing_status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("vendor_id")
);

-- CreateTable
CREATE TABLE "vendor_branding" (
    "vendor_id" UUID NOT NULL,
    "logo_url" TEXT,
    "primary_color" TEXT NOT NULL,
    "secondary_color" TEXT NOT NULL,
    "card_bg_url" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vendor_branding_pkey" PRIMARY KEY ("vendor_id")
);

-- CreateTable
CREATE TABLE "branches" (
    "branch_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address_text" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("branch_id")
);

-- CreateTable
CREATE TABLE "staff_users" (
    "staff_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "pin_last_changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "staff_users_pkey" PRIMARY KEY ("staff_id")
);

-- CreateTable
CREATE TABLE "members" (
    "member_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "branch_joined_id" UUID,
    "name" TEXT NOT NULL,
    "phone_e164" TEXT NOT NULL,
    "consent_service" BOOLEAN NOT NULL DEFAULT true,
    "consent_marketing" BOOLEAN NOT NULL DEFAULT false,
    "last_active_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "programs" (
    "program_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "stamps_required" INTEGER NOT NULL,
    "reward_title" TEXT NOT NULL,
    "reward_description" TEXT NOT NULL,
    "terms_text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("program_id")
);

-- CreateTable
CREATE TABLE "card_instances" (
    "card_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "stamps_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemed_at" TIMESTAMPTZ,

    CONSTRAINT "card_instances_pkey" PRIMARY KEY ("card_id")
);

-- CreateTable
CREATE TABLE "stamp_transactions" (
    "stamp_tx_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "token_jti" TEXT NOT NULL,
    "stamped_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "device_fingerprint" TEXT,
    "flags" JSONB,

    CONSTRAINT "stamp_transactions_pkey" PRIMARY KEY ("stamp_tx_id")
);

-- CreateTable
CREATE TABLE "redemption_transactions" (
    "redeem_tx_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "token_jti" TEXT NOT NULL,
    "redeemed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "device_fingerprint" TEXT,
    "flags" JSONB,

    CONSTRAINT "redemption_transactions_pkey" PRIMARY KEY ("redeem_tx_id")
);

-- CreateTable
CREATE TABLE "token_use" (
    "vendor_id" UUID NOT NULL,
    "token_jti" TEXT NOT NULL,
    "used_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_use_pkey" PRIMARY KEY ("vendor_id","token_jti")
);

-- CreateTable
CREATE TABLE "otp_requests" (
    "otp_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "phone_e164" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumed_at" TIMESTAMPTZ,

    CONSTRAINT "otp_requests_pkey" PRIMARY KEY ("otp_id")
);

-- CreateTable
CREATE TABLE "admin_audit_log" (
    "audit_id" UUID NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" UUID NOT NULL,
    "vendor_id" UUID,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("audit_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendors_vendor_slug_key" ON "vendors"("vendor_slug");

-- CreateIndex
CREATE UNIQUE INDEX "members_vendor_id_phone_e164_key" ON "members"("vendor_id", "phone_e164");

-- CreateIndex
CREATE UNIQUE INDEX "programs_vendor_id_version_key" ON "programs"("vendor_id", "version");

-- CreateIndex
CREATE INDEX "stamp_transactions_vendor_id_stamped_at_idx" ON "stamp_transactions"("vendor_id", "stamped_at");

-- CreateIndex
CREATE INDEX "stamp_transactions_card_id_stamped_at_idx" ON "stamp_transactions"("card_id", "stamped_at");

-- CreateIndex
CREATE INDEX "redemption_transactions_vendor_id_redeemed_at_idx" ON "redemption_transactions"("vendor_id", "redeemed_at");

-- CreateIndex
CREATE INDEX "redemption_transactions_card_id_redeemed_at_idx" ON "redemption_transactions"("card_id", "redeemed_at");

-- AddForeignKey
ALTER TABLE "vendor_branding" ADD CONSTRAINT "vendor_branding_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_users" ADD CONSTRAINT "staff_users_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_users" ADD CONSTRAINT "staff_users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_branch_joined_id_fkey" FOREIGN KEY ("branch_joined_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_instances" ADD CONSTRAINT "card_instances_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_instances" ADD CONSTRAINT "card_instances_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_instances" ADD CONSTRAINT "card_instances_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("program_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamp_transactions" ADD CONSTRAINT "stamp_transactions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamp_transactions" ADD CONSTRAINT "stamp_transactions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "card_instances"("card_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamp_transactions" ADD CONSTRAINT "stamp_transactions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_users"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamp_transactions" ADD CONSTRAINT "stamp_transactions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_transactions" ADD CONSTRAINT "redemption_transactions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_transactions" ADD CONSTRAINT "redemption_transactions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "card_instances"("card_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_transactions" ADD CONSTRAINT "redemption_transactions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_users"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_transactions" ADD CONSTRAINT "redemption_transactions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_use" ADD CONSTRAINT "token_use_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_requests" ADD CONSTRAINT "otp_requests_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("vendor_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- One active program per vendor
CREATE UNIQUE INDEX "ux_programs_one_active_per_vendor"
ON "programs" ("vendor_id")
WHERE ("is_active" = true);

-- One active card per member per vendor
CREATE UNIQUE INDEX "ux_cards_one_active_per_member_vendor"
ON "card_instances" ("vendor_id", "member_id")
WHERE ("status" = 'ACTIVE');
