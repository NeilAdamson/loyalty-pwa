-- CreateIndex
CREATE INDEX "members_vendor_id_last_active_at_idx" ON "members"("vendor_id", "last_active_at");

-- CreateIndex
CREATE INDEX "members_vendor_id_created_at_idx" ON "members"("vendor_id", "created_at");

-- CreateIndex
CREATE INDEX "card_instances_vendor_id_status_stamps_count_idx" ON "card_instances"("vendor_id", "status", "stamps_count");
