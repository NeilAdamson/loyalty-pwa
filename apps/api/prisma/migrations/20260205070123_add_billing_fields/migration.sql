-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "billing_start_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "monthly_billing_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00;
