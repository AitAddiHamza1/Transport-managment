-- Drop single-tenant active CIN unique index
DROP INDEX IF EXISTS "idx_employes_cin_active";

-- Create multi-tenant per-company active CIN unique index
CREATE UNIQUE INDEX "idx_employes_cin_active"
ON "employes" ("company_id", "cin")
WHERE "supprime_le" IS NULL
  AND "cin" IS NOT NULL;
