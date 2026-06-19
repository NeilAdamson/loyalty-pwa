-- Enforce tenant-scoped branch references via composite unique + foreign keys.

-- branches(vendor_id, branch_id) must be unique for composite FK targets
CREATE UNIQUE INDEX "branches_vendor_id_branch_id_key" ON "branches"("vendor_id", "branch_id");

-- staff_users: branch must belong to the same vendor
ALTER TABLE "staff_users" DROP CONSTRAINT "staff_users_branch_id_fkey";
ALTER TABLE "staff_users" ADD CONSTRAINT "staff_users_vendor_id_branch_id_fkey"
    FOREIGN KEY ("vendor_id", "branch_id") REFERENCES "branches"("vendor_id", "branch_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- members.branch_joined_id must belong to the same vendor (NULL skips check)
ALTER TABLE "members" DROP CONSTRAINT "members_branch_joined_id_fkey";
ALTER TABLE "members" ADD CONSTRAINT "members_vendor_id_branch_joined_id_fkey"
    FOREIGN KEY ("vendor_id", "branch_joined_id") REFERENCES "branches"("vendor_id", "branch_id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- stamp_transactions: branch must belong to the same vendor
ALTER TABLE "stamp_transactions" DROP CONSTRAINT "stamp_transactions_branch_id_fkey";
ALTER TABLE "stamp_transactions" ADD CONSTRAINT "stamp_transactions_vendor_id_branch_id_fkey"
    FOREIGN KEY ("vendor_id", "branch_id") REFERENCES "branches"("vendor_id", "branch_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- redemption_transactions: branch must belong to the same vendor
ALTER TABLE "redemption_transactions" DROP CONSTRAINT "redemption_transactions_branch_id_fkey";
ALTER TABLE "redemption_transactions" ADD CONSTRAINT "redemption_transactions_vendor_id_branch_id_fkey"
    FOREIGN KEY ("vendor_id", "branch_id") REFERENCES "branches"("vendor_id", "branch_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
