-- CreateEnum
CREATE TYPE "AllergyStatus" AS ENUM ('UNKNOWN', 'NONE_REPORTED', 'REPORTED');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('PENDING', 'CONTINUE', 'STOP');

-- CreateEnum
CREATE TYPE "PrescriptionItemStatus" AS ENUM ('DRAFT');

-- AlterTable
ALTER TABLE "encounters" ADD COLUMN     "allergy_status" "AllergyStatus" NOT NULL DEFAULT 'UNKNOWN';

-- CreateTable
CREATE TABLE "diseases" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "diseases_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "allergens" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "allergens_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "weight_observations" (
    "id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "kilograms" DECIMAL(6,2) NOT NULL,
    "measured_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weight_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_medications" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "medication_id" UUID NOT NULL,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),

    CONSTRAINT "patient_medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_reviews" (
    "id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "patient_medication_id" UUID NOT NULL,
    "decision" "ReviewDecision" NOT NULL DEFAULT 'PENDING',
    "decided_at" TIMESTAMPTZ(3),

    CONSTRAINT "medication_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "dose" DECIMAL(12,4) NOT NULL,
    "dose_unit" "BaseUnit" NOT NULL,
    "schedule" JSONB NOT NULL,
    "status" "PrescriptionItemStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DiseaseToEncounter" (
    "A" TEXT NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_DiseaseToEncounter_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AllergenToEncounter" (
    "A" TEXT NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_AllergenToEncounter_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "weight_observations_encounter_id_measured_at_idx" ON "weight_observations"("encounter_id", "measured_at");

-- CreateIndex
CREATE UNIQUE INDEX "medication_reviews_encounter_id_patient_medication_id_key" ON "medication_reviews"("encounter_id", "patient_medication_id");

-- CreateIndex
CREATE UNIQUE INDEX "prescription_items_review_id_key" ON "prescription_items"("review_id");

-- CreateIndex
CREATE INDEX "_DiseaseToEncounter_B_index" ON "_DiseaseToEncounter"("B");

-- CreateIndex
CREATE INDEX "_AllergenToEncounter_B_index" ON "_AllergenToEncounter"("B");

-- AddForeignKey
ALTER TABLE "weight_observations" ADD CONSTRAINT "weight_observations_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_medications" ADD CONSTRAINT "patient_medications_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_medications" ADD CONSTRAINT "patient_medications_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_reviews" ADD CONSTRAINT "medication_reviews_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_reviews" ADD CONSTRAINT "medication_reviews_patient_medication_id_fkey" FOREIGN KEY ("patient_medication_id") REFERENCES "patient_medications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "medication_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiseaseToEncounter" ADD CONSTRAINT "_DiseaseToEncounter_A_fkey" FOREIGN KEY ("A") REFERENCES "diseases"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiseaseToEncounter" ADD CONSTRAINT "_DiseaseToEncounter_B_fkey" FOREIGN KEY ("B") REFERENCES "encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllergenToEncounter" ADD CONSTRAINT "_AllergenToEncounter_A_fkey" FOREIGN KEY ("A") REFERENCES "allergens"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllergenToEncounter" ADD CONSTRAINT "_AllergenToEncounter_B_fkey" FOREIGN KEY ("B") REFERENCES "encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX patient_medications_active_key ON patient_medications(patient_id, medication_id) WHERE ended_at IS NULL;
INSERT INTO diseases (code, name) VALUES ('I10','Tăng huyết áp nguyên phát'), ('E11','Đái tháo đường típ 2');
INSERT INTO allergens (code, name) VALUES ('AMLODIPINE','Amlodipine'), ('METFORMIN','Metformin'), ('ACEI','Nhóm ức chế men chuyển'), ('ARB','Nhóm chẹn thụ thể angiotensin II'), ('STATIN','Nhóm statin');
