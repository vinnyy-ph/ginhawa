/*
  Warnings:

  - The values [ADMIN] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `updated_at` on the `medical_records` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - Added the required column `professional_title` to the `doctor_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password_hash` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('PATIENT', 'DOCTOR');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'PATIENT';
COMMIT;

-- AlterTable
ALTER TABLE "doctor_profiles" ADD COLUMN     "consultation_fee" DOUBLE PRECISION,
ADD COLUMN     "consultation_focus_areas" TEXT,
ADD COLUMN     "languages_spoken" TEXT,
ADD COLUMN     "professional_title" TEXT NOT NULL,
ADD COLUMN     "years_of_experience" INTEGER;

-- AlterTable
ALTER TABLE "medical_records" DROP COLUMN "updated_at",
ADD COLUMN     "follow_up_advice" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password",
ADD COLUMN     "password_hash" TEXT NOT NULL;
