-- AlterTable: Add Phase 7F Forex fields to paiements_clients
ALTER TABLE "paiements_clients" ADD COLUMN IF NOT EXISTS "taux_change" DECIMAL(18,6);
ALTER TABLE "paiements_clients" ADD COLUMN IF NOT EXISTS "montant_converti_mad" DECIMAL(14,2);
ALTER TABLE "paiements_clients" ADD COLUMN IF NOT EXISTS "source_taux" VARCHAR(50);
ALTER TABLE "paiements_clients" ADD COLUMN IF NOT EXISTS "est_taux_manuel" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "paiements_clients" ADD COLUMN IF NOT EXISTS "date_taux_utilise" DATE;
