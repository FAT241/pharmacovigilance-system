CREATE TABLE "encounters" (
    "id" UUID PRIMARY KEY,
    "patient_id" UUID NOT NULL REFERENCES "patients"("id") ON UPDATE CASCADE,
    "doctor_id" UUID NOT NULL REFERENCES "users"("id") ON UPDATE CASCADE,
    "admitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discharged_at" TIMESTAMPTZ(3),
    "admission_note" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    CHECK ("discharged_at" IS NULL OR "discharged_at" >= "admitted_at")
);

CREATE INDEX "encounters_patient_id_admitted_at_idx" ON "encounters"("patient_id", "admitted_at");
CREATE UNIQUE INDEX "encounters_one_open_per_patient" ON "encounters"("patient_id")
WHERE "discharged_at" IS NULL;
