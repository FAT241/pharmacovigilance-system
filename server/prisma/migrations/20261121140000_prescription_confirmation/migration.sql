BEGIN;
CREATE TABLE prescriptions (
  id uuid PRIMARY KEY,
  encounter_id uuid NOT NULL REFERENCES encounters(id) ON UPDATE CASCADE ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  check_id uuid NOT NULL UNIQUE REFERENCES rule_checks(id) ON UPDATE CASCADE ON DELETE CASCADE,
  confirmed_at timestamptz(3) NOT NULL,
  idempotency_key uuid,
  request_hash char(64),
  CHECK ((idempotency_key IS NULL) = (request_hash IS NULL)),
  UNIQUE (doctor_id, idempotency_key)
);
INSERT INTO prescriptions(id, encounter_id, doctor_id, check_id, confirmed_at)
SELECT id, encounter_id, requested_by, id, confirmed_at FROM rule_checks
WHERE item_id IS NOT NULL AND confirmed_at IS NOT NULL;
COMMIT;
