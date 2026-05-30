-- CreateTable
CREATE TABLE "patient_medical_histories" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "blood_type" TEXT,
    "allergies" TEXT[],
    "chronic_conditions" TEXT[],
    "current_medications" TEXT[],
    "past_surgeries" TEXT,
    "family_history" TEXT,
    "smoking_status" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_medical_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_medical_histories_patient_id_key" ON "patient_medical_histories"("patient_id");

-- AddForeignKey
ALTER TABLE "patient_medical_histories" ADD CONSTRAINT "patient_medical_histories_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
