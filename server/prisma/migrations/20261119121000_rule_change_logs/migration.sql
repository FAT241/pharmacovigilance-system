CREATE TABLE "rule_change_logs" (
  "id" SERIAL PRIMARY KEY,
  "rule_code" TEXT NOT NULL REFERENCES "alert_rules"("code") ON UPDATE CASCADE ON DELETE RESTRICT,
  "rule_title" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "old_active" BOOLEAN NOT NULL,
  "active" BOOLEAN NOT NULL,
  "reason" TEXT NOT NULL CHECK (length(btrim("reason")) > 0),
  "changed_by" UUID NOT NULL REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ("old_active" <> "active")
);
CREATE UNIQUE INDEX rule_change_logs_rule_code_version_key ON rule_change_logs(rule_code, version);
