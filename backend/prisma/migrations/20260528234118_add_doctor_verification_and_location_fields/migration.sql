-- AlterTable
ALTER TABLE "doctor_profiles" ADD COLUMN     "city" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prc_license_expiry" TIMESTAMP(3),
ADD COLUMN     "prc_license_no" TEXT,
ADD COLUMN     "ptr_no" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "verified_at" TIMESTAMP(3);
