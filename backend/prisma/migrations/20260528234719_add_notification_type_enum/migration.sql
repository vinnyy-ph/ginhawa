/*
  Warnings:

  - Changed the type of `type` on the `notifications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPOINTMENT_BOOKED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_COMPLETED', 'APPOINTMENT_RESCHEDULED', 'APPOINTMENT_REMINDER', 'PRESCRIPTION_READY', 'MEDICAL_RECORD_CREATED', 'GENERAL');

-- AlterTable
-- Backfill existing rows to 'GENERAL' so the NOT NULL column applies cleanly on a populated table.
ALTER TABLE "notifications" ADD COLUMN "type_new" "NotificationType" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "notifications" DROP COLUMN "type";
ALTER TABLE "notifications" RENAME COLUMN "type_new" TO "type";
ALTER TABLE "notifications" ALTER COLUMN "type" DROP DEFAULT;
