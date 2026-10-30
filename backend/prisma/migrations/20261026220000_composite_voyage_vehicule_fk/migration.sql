-- =====================================================================
-- Migration: 20261026220000_composite_voyage_vehicule_fk (PREPARED - NOT APPLIED)
-- Description: Composite foreign keys (company_id, tracteur/remorque) -> vehicules(company_id, immatriculation)
-- Target System: PostgreSQL (transport_db)
-- Transaction Model: Single Transaction Block (BEGIN ... COMMIT)
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- STEP 1: Clean up orphan historical references
-- (Ensures no foreign key violation during constraint creation)
-- ---------------------------------------------------------------------
UPDATE "voyages" v
SET "tracteur" = NULL
WHERE v."tracteur" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "vehicules" veh
    WHERE veh."company_id" = v."company_id"
      AND veh."immatriculation" = v."tracteur"
  );

UPDATE "voyages" v
SET "remorque" = NULL
WHERE v."remorque" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "vehicules" veh
    WHERE veh."company_id" = v."company_id"
      AND veh."immatriculation" = v."remorque"
  );

-- ---------------------------------------------------------------------
-- STEP 2: Ensure Target Composite Unique Constraint Exists
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'vehicules'
      AND indexname = 'vehicules_company_id_immatriculation_key'
  ) THEN
    CREATE UNIQUE INDEX "vehicules_company_id_immatriculation_key"
    ON "vehicules" ("company_id", "immatriculation");
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- STEP 3: Add Composite Foreign Key Constraints
-- Note: ON DELETE RESTRICT is mandatory because company_id is NOT NULL in voyages.
-- In PostgreSQL, composite ON DELETE SET NULL attempts to nullify all FK columns,
-- which violates the NOT NULL constraint on voyages.company_id.
-- ---------------------------------------------------------------------
ALTER TABLE "voyages"
  DROP CONSTRAINT IF EXISTS "fk_voyages_tracteur",
  DROP CONSTRAINT IF EXISTS "fk_voyages_remorque",
  DROP CONSTRAINT IF EXISTS "fk_voyages_tracteur_composite",
  DROP CONSTRAINT IF EXISTS "fk_voyages_remorque_composite";

ALTER TABLE "voyages"
  ADD CONSTRAINT "fk_voyages_tracteur_composite"
  FOREIGN KEY ("company_id", "tracteur")
  REFERENCES "vehicules" ("company_id", "immatriculation")
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "voyages"
  ADD CONSTRAINT "fk_voyages_remorque_composite"
  FOREIGN KEY ("company_id", "remorque")
  REFERENCES "vehicules" ("company_id", "immatriculation")
  ON UPDATE CASCADE ON DELETE RESTRICT;

COMMIT;
