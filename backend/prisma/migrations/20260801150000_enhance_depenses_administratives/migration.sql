-- Migration: 20260801150000_enhance_depenses_administratives
-- Enhance depenses_administratives table with audit columns, soft delete,FK to users, and montant > 0 check

-- 1. Replace check constraint on montant from >= 0 to > 0
ALTER TABLE "depenses_administratives" DROP CONSTRAINT IF EXISTS "chk_depadmin_montant";
ALTER TABLE "depenses_administratives" ADD CONSTRAINT "chk_depadmin_montant" CHECK ("montant" > 0);

-- 2. Add audit and soft-delete columns
ALTER TABLE "depenses_administratives"
  ADD COLUMN IF NOT EXISTS "cree_par" BIGINT,
  ADD COLUMN IF NOT EXISTS "cree_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "mis_a_jour_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "supprime_le" TIMESTAMPTZ(6);

-- 3. Add Foreign Key constraint to users(id)
ALTER TABLE "depenses_administratives" DROP CONSTRAINT IF EXISTS "fk_depadmin_user_cree";
ALTER TABLE "depenses_administratives"
  ADD CONSTRAINT "fk_depadmin_user_cree"
  FOREIGN KEY ("cree_par") REFERENCES "users"("id")
  ON UPDATE CASCADE ON DELETE SET NULL;

-- 4. Add index for soft-delete queries
CREATE INDEX IF NOT EXISTS "idx_depadmin_supprime_le" ON "depenses_administratives" ("supprime_le");
