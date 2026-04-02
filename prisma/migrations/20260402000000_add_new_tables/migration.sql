-- CreateEnum
CREATE TYPE "MissionType" AS ENUM ('SPEND_LESS', 'SAVE_AMOUNT', 'NO_SPEND_CATEGORY');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('active', 'completed', 'failed');

-- CreateTable
CREATE TABLE "points" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missions" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "MissionType" NOT NULL,
    "target_amount" DECIMAL(15,2),
    "current_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "category_id" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'active',
    "reward" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(15,2),
    "entity_type" TEXT,
    "entity_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "points_group_id_user_id_idx" ON "points"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "points_group_id_created_at_idx" ON "points"("group_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "missions_group_id_status_idx" ON "missions"("group_id", "status");

-- CreateIndex
CREATE INDEX "activity_logs_group_id_created_at_idx" ON "activity_logs"("group_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "points" ADD CONSTRAINT "points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points" ADD CONSTRAINT "points_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
