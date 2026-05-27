-- DropForeignKey
ALTER TABLE "recommendation_logs" DROP CONSTRAINT "recommendation_logs_patient_id_fkey";

-- AlterTable
ALTER TABLE "recommendation_logs" ALTER COLUMN "patient_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "recommendation_logs" ADD CONSTRAINT "recommendation_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
