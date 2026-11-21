BEGIN;
ALTER TABLE medication_reviews ADD COLUMN stop_reason text;
ALTER TABLE alert_rules ADD COLUMN reference_source text;
CREATE TABLE rule_diseases (
  rule_code text NOT NULL REFERENCES alert_rules(code) ON UPDATE CASCADE ON DELETE CASCADE,
  disease_code text NOT NULL REFERENCES diseases(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  PRIMARY KEY(rule_code, disease_code)
);
UPDATE alert_rules SET condition = condition || '{"schemaVersion":1}'::jsonb WHERE jsonb_typeof(condition) = 'object' AND NOT (condition ? 'schemaVersion');
UPDATE alert_rules SET reference_source = 'Bộ luật thí điểm của đồ án ĐACS4'
WHERE code IN ('RECONCILE','DUPLICATE','ALLERGY','PAIR_SAMPLE','WEIGHT_SAMPLE','GROUP_SAMPLE');
COMMIT;
