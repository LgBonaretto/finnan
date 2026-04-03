-- AlterTable
ALTER TABLE "users" ADD COLUMN "pluggy_item_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];
