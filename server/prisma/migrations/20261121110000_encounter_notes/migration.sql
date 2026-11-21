BEGIN;
ALTER TABLE encounters ADD COLUMN discharge_condition text, ADD COLUMN follow_up_advice text;
CREATE TABLE progress_notes (
  id uuid PRIMARY KEY,
  encounter_id uuid NOT NULL REFERENCES encounters(id) ON DELETE CASCADE ON UPDATE CASCADE,
  body text NOT NULL,
  recorded_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX progress_notes_encounter_id_recorded_at_idx ON progress_notes(encounter_id, recorded_at);
COMMIT;
