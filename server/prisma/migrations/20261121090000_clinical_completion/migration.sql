BEGIN;
-- CreateEnum
CREATE TYPE "ExplanationStatus" AS ENUM ('GENERATING', 'DRAFT', 'APPROVED', 'FAILED');

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "history_note" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "encounters" ADD COLUMN     "published_advice" TEXT,
ADD COLUMN     "published_at" TIMESTAMPTZ(3),
ADD COLUMN     "published_diagnoses" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "medications" ADD COLUMN "reference_source" TEXT,
ADD COLUMN     "reference_text" TEXT;

-- AlterTable
ALTER TABLE "prescription_items" ADD COLUMN     "duration_days" INTEGER,
ADD COLUMN     "route" TEXT;

-- CreateTable
CREATE TABLE "drug_groups" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "drug_groups_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "observations" (
    "id" UUID NOT NULL,
    "encounter_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "value" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "measured_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "explanations" (
    "item_id" UUID NOT NULL,
    "status" "ExplanationStatus" NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "draft" TEXT,
    "approved_text" TEXT,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "source" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "failure" TEXT,

    CONSTRAINT "explanations_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "_DiseaseToPatient" (
    "A" TEXT NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_DiseaseToPatient_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DrugGroupToMedication" (
    "A" TEXT NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_DrugGroupToMedication_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "observations_encounter_id_measured_at_idx" ON "observations"("encounter_id", "measured_at");

-- CreateIndex
CREATE INDEX "_DiseaseToPatient_B_index" ON "_DiseaseToPatient"("B");

-- CreateIndex
CREATE INDEX "_DrugGroupToMedication_B_index" ON "_DrugGroupToMedication"("B");

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explanations" ADD CONSTRAINT "explanations_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "prescription_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explanations" ADD CONSTRAINT "explanations_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiseaseToPatient" ADD CONSTRAINT "_DiseaseToPatient_A_fkey" FOREIGN KEY ("A") REFERENCES "diseases"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiseaseToPatient" ADD CONSTRAINT "_DiseaseToPatient_B_fkey" FOREIGN KEY ("B") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DrugGroupToMedication" ADD CONSTRAINT "_DrugGroupToMedication_A_fkey" FOREIGN KEY ("A") REFERENCES "drug_groups"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DrugGroupToMedication" ADD CONSTRAINT "_DrugGroupToMedication_B_fkey" FOREIGN KEY ("B") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO drug_groups(code,name) VALUES ('ACEI','Ức chế men chuyển'),('ARB','Chẹn thụ thể angiotensin II'),('STATIN','Statin'),('DEMO_GROUP','Nhóm thuốc thí điểm');
INSERT INTO drug_groups(code,name) SELECT DISTINCT c,c FROM medications, unnest(group_codes) c ON CONFLICT DO NOTHING;
INSERT INTO "_DrugGroupToMedication"("A","B") SELECT DISTINCT c,id FROM medications, unnest(group_codes) c;
ALTER TABLE medications DROP COLUMN group_codes;
COMMIT;
