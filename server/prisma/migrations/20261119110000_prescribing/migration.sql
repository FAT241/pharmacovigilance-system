-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('NO_ALERT', 'HAS_ALERT', 'INSUFFICIENT_DATA', 'ERROR');

-- CreateEnum
CREATE TYPE "RuleOutcome" AS ENUM ('MATCHED', 'NOT_MATCHED', 'INSUFFICIENT_DATA', 'ERROR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PrescriptionItemStatus" ADD VALUE 'ACTIVE';
ALTER TYPE "PrescriptionItemStatus" ADD VALUE 'ENDED';
ALTER TYPE "PrescriptionItemStatus" ADD VALUE 'REPLACED';

-- AlterTable
ALTER TABLE "medications" ADD COLUMN     "group_codes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "prescription_items" ADD COLUMN     "encounter_id" UUID,
ADD COLUMN     "end_reason" TEXT,
ADD COLUMN     "ended_at" TIMESTAMPTZ(3),
ADD COLUMN     "medication_id" UUID,
ADD COLUMN     "replaces_item_id" UUID,
ADD COLUMN     "started_at" TIMESTAMPTZ(3),
ALTER COLUMN "review_id" DROP NOT NULL;

UPDATE prescription_items i SET encounter_id = r.encounter_id, medication_id = h.medication_id
FROM medication_reviews r JOIN patient_medications h ON h.id = r.patient_medication_id
WHERE i.review_id = r.id;
ALTER TABLE prescription_items ALTER COLUMN encounter_id SET NOT NULL, ALTER COLUMN medication_id SET NOT NULL;

-- CreateTable
CREATE TABLE "alert_rules" (
    "code" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "condition" JSONB NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("code")
);

INSERT INTO alert_rules (code, title, condition) VALUES
('RECONCILE','Đối chiếu thuốc tại nhà','{"type":"RECONCILE"}'),
('ALLERGY','Tác nhân dị ứng','{"type":"ALLERGY"}'),
('DUPLICATE','Trùng hoạt chất với y lệnh hiệu lực','{"type":"DUPLICATE"}'),
('PAIR_SAMPLE','Cặp hoạt chất thí điểm','{"type":"INGREDIENT_PAIR","left":"demo_a","right":"demo_b"}'),
('WEIGHT_SAMPLE','Giới hạn theo cân nặng thí điểm','{"type":"WEIGHT_LIMIT","ingredient":"demo_a","mgPerKgDay":1}'),
('GROUP_SAMPLE','Bệnh và nhóm thuốc thí điểm','{"type":"DISEASE_GROUP","disease":"I10","group":"DEMO_GROUP"}');

-- CreateTable
CREATE TABLE "rule_checks" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "encounter_version" INTEGER NOT NULL,
    "requested_by" UUID NOT NULL,
    "checked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "CheckStatus" NOT NULL,
    "context_snapshot" JSONB NOT NULL,
    "confirmed_at" TIMESTAMPTZ(3),
    "override_reason" TEXT,

    CONSTRAINT "rule_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_check_results" (
    "rule_check_id" UUID NOT NULL,
    "rule_code" TEXT NOT NULL,
    "rule_version" INTEGER NOT NULL,
    "outcome" "RuleOutcome" NOT NULL,
    "message" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "missing_fields" TEXT[],

    CONSTRAINT "rule_check_results_pkey" PRIMARY KEY ("rule_check_id","rule_code")
);

-- CreateTable
CREATE TABLE "_AllergenToMedication" (
    "A" TEXT NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_AllergenToMedication_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "rule_checks_item_id_checked_at_idx" ON "rule_checks"("item_id", "checked_at");

-- CreateIndex
CREATE INDEX "_AllergenToMedication_B_index" ON "_AllergenToMedication"("B");

-- CreateIndex
CREATE INDEX "prescription_items_encounter_id_status_idx" ON "prescription_items"("encounter_id", "status");

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_replaces_item_id_fkey" FOREIGN KEY ("replaces_item_id") REFERENCES "prescription_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_checks" ADD CONSTRAINT "rule_checks_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "prescription_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_checks" ADD CONSTRAINT "rule_checks_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_check_results" ADD CONSTRAINT "rule_check_results_rule_check_id_fkey" FOREIGN KEY ("rule_check_id") REFERENCES "rule_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_check_results" ADD CONSTRAINT "rule_check_results_rule_code_fkey" FOREIGN KEY ("rule_code") REFERENCES "alert_rules"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllergenToMedication" ADD CONSTRAINT "_AllergenToMedication_A_fkey" FOREIGN KEY ("A") REFERENCES "allergens"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllergenToMedication" ADD CONSTRAINT "_AllergenToMedication_B_fkey" FOREIGN KEY ("B") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
