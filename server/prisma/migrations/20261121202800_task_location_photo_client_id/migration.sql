-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "client_id" UUID,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "photo_path" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tasks_user_id_client_id_key" ON "tasks"("user_id", "client_id");
