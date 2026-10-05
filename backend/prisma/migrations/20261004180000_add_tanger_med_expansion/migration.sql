-- Migration: 20261004180000_add_tanger_med_expansion
-- Description: Expansion of Tanger Med operations to support Circuit portuaire, Bateau, and Transit Aljaziras services

-- 1. Add General Operation Date
ALTER TABLE "traversees_maritimes" ADD COLUMN "date_operation" DATE NOT NULL DEFAULT CURRENT_DATE;

-- 2. Add Section 1: Circuit Portuaire Columns
ALTER TABLE "traversees_maritimes" ADD COLUMN "has_circuit_portuaire" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "traversees_maritimes" ADD COLUMN "circuit_nature" VARCHAR(150);
ALTER TABLE "traversees_maritimes" ADD COLUMN "circuit_montant" DECIMAL(14,2);
ALTER TABLE "traversees_maritimes" ADD COLUMN "circuit_notes" VARCHAR(500);
ALTER TABLE "traversees_maritimes" ADD COLUMN "circuit_est_verifie" BOOLEAN NOT NULL DEFAULT false;

-- 3. Add Section 2: Bateau Flag & Make Specific Bateau Columns Nullable
ALTER TABLE "traversees_maritimes" ADD COLUMN "has_bateau" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "traversees_maritimes" ALTER COLUMN "date_traversee" DROP NOT NULL;
ALTER TABLE "traversees_maritimes" ALTER COLUMN "bateau" DROP NOT NULL;
ALTER TABLE "traversees_maritimes" ALTER COLUMN "lieu_embarquement" DROP NOT NULL;
ALTER TABLE "traversees_maritimes" ALTER COLUMN "prix" DROP NOT NULL;

-- 4. Add Section 3: Transit Aljaziras Columns
ALTER TABLE "traversees_maritimes" ADD COLUMN "has_transit_aljaziras" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "traversees_maritimes" ADD COLUMN "transit_type_service" VARCHAR(50);
ALTER TABLE "traversees_maritimes" ADD COLUMN "transit_prix" DECIMAL(14,2);
ALTER TABLE "traversees_maritimes" ADD COLUMN "transit_notes" VARCHAR(500);
ALTER TABLE "traversees_maritimes" ADD COLUMN "transit_est_verifie" BOOLEAN NOT NULL DEFAULT false;

-- 5. Make Vehicle & Driver Nullable for Planning Flexibility
ALTER TABLE "traversees_maritimes" ALTER COLUMN "immatriculation" DROP NOT NULL;
ALTER TABLE "traversees_maritimes" ALTER COLUMN "id_conducteur" DROP NOT NULL;

-- 6. Historical Data Backfill Strategy (Idempotent & Data-Preserving)
-- Sets has_bateau = true and date_operation = date_traversee for all existing historical records.
UPDATE "traversees_maritimes"
SET "has_bateau" = true,
    "date_operation" = "date_traversee"
WHERE "date_traversee" IS NOT NULL;

-- 7. Create Index on date_operation
CREATE INDEX "traversees_maritimes_date_operation_idx" ON "traversees_maritimes"("date_operation");
