BEGIN;

CREATE TYPE "CheckTrigger" AS ENUM ('PRESCRIBING', 'ADMISSION', 'CLINICAL_CHANGE', 'BEFORE_DISCHARGE');
ALTER TABLE rule_checks
    ADD COLUMN encounter_id UUID,
    ADD COLUMN trigger "CheckTrigger" NOT NULL DEFAULT 'PRESCRIBING',
    ALTER COLUMN item_id DROP NOT NULL;

UPDATE rule_checks c SET encounter_id = i.encounter_id FROM prescription_items i WHERE i.id = c.item_id;
ALTER TABLE rule_checks
    ALTER COLUMN encounter_id SET NOT NULL,
    ADD CONSTRAINT rule_checks_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT rule_checks_trigger_scope CHECK ((trigger = 'PRESCRIBING') = (item_id IS NOT NULL));
CREATE INDEX rule_checks_encounter_id_checked_at_id_idx ON rule_checks(encounter_id, checked_at, id);

COMMIT;
