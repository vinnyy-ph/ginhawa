-- AlterTable: convert languages_spoken from TEXT to TEXT[],
-- preserving existing comma-separated values and mapping NULL to an empty array.
ALTER TABLE "doctor_profiles"
  ALTER COLUMN "languages_spoken" TYPE TEXT[]
  USING COALESCE(string_to_array("languages_spoken", ', '), '{}');
