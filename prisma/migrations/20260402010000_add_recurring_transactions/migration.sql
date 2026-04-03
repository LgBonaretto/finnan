-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "recurring_interval" TEXT;
ALTER TABLE "transactions" ADD COLUMN "recurring_day" INTEGER;
ALTER TABLE "transactions" ADD COLUMN "next_occurrence" TIMESTAMP(3);
ALTER TABLE "transactions" ADD COLUMN "parent_transaction_id" TEXT;

-- CreateIndex
CREATE INDEX "transactions_next_occurrence_idx" ON "transactions"("next_occurrence");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_parent_transaction_id_fkey" FOREIGN KEY ("parent_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
