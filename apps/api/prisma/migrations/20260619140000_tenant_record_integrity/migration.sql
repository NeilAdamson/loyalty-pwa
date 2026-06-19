-- Enforce tenant-scoped references for cards, transactions, and WebAuthn credentials.

-- Realign card vendor_id when member and program both belong to the member's vendor
UPDATE "card_instances" c
SET "vendor_id" = m."vendor_id"
FROM "members" m
WHERE c."member_id" = m."member_id"
  AND c."vendor_id" <> m."vendor_id"
  AND EXISTS (
    SELECT 1 FROM "programs" p
    WHERE p."program_id" = c."program_id" AND p."vendor_id" = m."vendor_id"
  );

-- Remove card rows that still reference a member from another vendor (unrecoverable mismatch)
DELETE FROM "card_instances" c
USING "members" m
WHERE c."member_id" = m."member_id"
  AND c."vendor_id" <> m."vendor_id";

-- Composite unique indexes on parent tables (FK targets)
CREATE UNIQUE INDEX "members_vendor_id_member_id_key" ON "members"("vendor_id", "member_id");
CREATE UNIQUE INDEX "programs_vendor_id_program_id_key" ON "programs"("vendor_id", "program_id");
CREATE UNIQUE INDEX "card_instances_vendor_id_card_id_key" ON "card_instances"("vendor_id", "card_id");
CREATE UNIQUE INDEX "staff_users_vendor_id_staff_id_key" ON "staff_users"("vendor_id", "staff_id");

-- card_instances: member and program must belong to the same vendor
ALTER TABLE "card_instances" DROP CONSTRAINT "card_instances_member_id_fkey";
ALTER TABLE "card_instances" DROP CONSTRAINT "card_instances_program_id_fkey";
ALTER TABLE "card_instances" ADD CONSTRAINT "card_instances_vendor_id_member_id_fkey"
    FOREIGN KEY ("vendor_id", "member_id") REFERENCES "members"("vendor_id", "member_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "card_instances" ADD CONSTRAINT "card_instances_vendor_id_program_id_fkey"
    FOREIGN KEY ("vendor_id", "program_id") REFERENCES "programs"("vendor_id", "program_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- stamp_transactions: card and staff must belong to the same vendor
ALTER TABLE "stamp_transactions" DROP CONSTRAINT "stamp_transactions_card_id_fkey";
ALTER TABLE "stamp_transactions" DROP CONSTRAINT "stamp_transactions_staff_id_fkey";
ALTER TABLE "stamp_transactions" ADD CONSTRAINT "stamp_transactions_vendor_id_card_id_fkey"
    FOREIGN KEY ("vendor_id", "card_id") REFERENCES "card_instances"("vendor_id", "card_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stamp_transactions" ADD CONSTRAINT "stamp_transactions_vendor_id_staff_id_fkey"
    FOREIGN KEY ("vendor_id", "staff_id") REFERENCES "staff_users"("vendor_id", "staff_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- redemption_transactions: card and staff must belong to the same vendor
ALTER TABLE "redemption_transactions" DROP CONSTRAINT "redemption_transactions_card_id_fkey";
ALTER TABLE "redemption_transactions" DROP CONSTRAINT "redemption_transactions_staff_id_fkey";
ALTER TABLE "redemption_transactions" ADD CONSTRAINT "redemption_transactions_vendor_id_card_id_fkey"
    FOREIGN KEY ("vendor_id", "card_id") REFERENCES "card_instances"("vendor_id", "card_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "redemption_transactions" ADD CONSTRAINT "redemption_transactions_vendor_id_staff_id_fkey"
    FOREIGN KEY ("vendor_id", "staff_id") REFERENCES "staff_users"("vendor_id", "staff_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- webauthn_credentials: member/staff must belong to the same vendor (NULL skips check)
ALTER TABLE "webauthn_credentials" DROP CONSTRAINT "webauthn_credentials_member_id_fkey";
ALTER TABLE "webauthn_credentials" DROP CONSTRAINT "webauthn_credentials_staff_id_fkey";
ALTER TABLE "webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_vendor_id_member_id_fkey"
    FOREIGN KEY ("vendor_id", "member_id") REFERENCES "members"("vendor_id", "member_id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_vendor_id_staff_id_fkey"
    FOREIGN KEY ("vendor_id", "staff_id") REFERENCES "staff_users"("vendor_id", "staff_id")
    ON DELETE CASCADE ON UPDATE CASCADE;
