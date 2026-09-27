-- =====================================================================
-- Migration: 20260926200000_multi_tenant_composite_fk
-- Description: Multi-tenant composite foreign keys & complete provenance quarantine
-- Target System: PostgreSQL (transport_db)
-- Transaction Model: Single Transaction Block (BEGIN ... COMMIT)
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- STEP 1: Add Nullable Schema Columns
-- ---------------------------------------------------------------------
ALTER TABLE "paiements_clients" ADD COLUMN IF NOT EXISTS "company_id" INTEGER;
ALTER TABLE "paiements_clients" ADD COLUMN IF NOT EXISTS "facture_id" INTEGER;

ALTER TABLE "creances_clients" ADD COLUMN IF NOT EXISTS "company_id" INTEGER;
ALTER TABLE "creances_clients" ADD COLUMN IF NOT EXISTS "facture_id" INTEGER;

-- ---------------------------------------------------------------------
-- STEP 2: Target Table Uniqueness Constraint (Facture company_id + id)
-- ---------------------------------------------------------------------
ALTER TABLE "factures" ADD CONSTRAINT "factures_company_id_id_key" UNIQUE ("company_id", "id");

-- ---------------------------------------------------------------------
-- STEP 3: Create Quarantine & Archive Staging Tables (100% Provenance)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "quarantine_ambiguous_paiements" (
  "id" BIGINT PRIMARY KEY,
  "numero_facture" VARCHAR(30) NOT NULL,
  "nom_client" VARCHAR(150) NOT NULL,
  "date_paiement" DATE NOT NULL,
  "montant_recu" NUMERIC(14,2) NOT NULL,
  "methode_paiement" "paiement_methode" NOT NULL,
  "devise" VARCHAR(3) NOT NULL DEFAULT 'MAD',
  "taux_change" NUMERIC(18,6),
  "montant_converti_mad" NUMERIC(14,2),
  "source_taux" VARCHAR(50),
  "est_taux_manuel" BOOLEAN NOT NULL DEFAULT false,
  "date_taux_utilise" DATE,
  "candidate_invoice_ids" INT[] NOT NULL,
  "candidate_company_ids" INT[] NOT NULL,
  "quarantined_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "status" VARCHAR(50) NOT NULL DEFAULT 'AMBIGUOUS_PENDING_REVIEW',
  "source_table" VARCHAR(50) NOT NULL DEFAULT 'paiements_clients'
);

CREATE TABLE IF NOT EXISTS "quarantine_ambiguous_creances" (
  "id" BIGINT PRIMARY KEY,
  "numero_facture" VARCHAR(30) NOT NULL,
  "date_emission" DATE NOT NULL,
  "nom_client" VARCHAR(150) NOT NULL,
  "delai_paiement_jours" INT NOT NULL DEFAULT 30,
  "montant_facture" NUMERIC(14,2) NOT NULL,
  "montant_recu" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "solde" NUMERIC(14,2),
  "date_echeance" DATE,
  "statut_paiement" "creance_statut" NOT NULL DEFAULT 'NON_PAYE',
  "action_recouvrement" VARCHAR(255),
  "devise" VARCHAR(3) NOT NULL DEFAULT 'MAD',
  "candidate_invoice_ids" INT[] NOT NULL,
  "candidate_company_ids" INT[] NOT NULL,
  "quarantined_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "status" VARCHAR(50) NOT NULL DEFAULT 'AMBIGUOUS_PENDING_REVIEW',
  "source_table" VARCHAR(50) NOT NULL DEFAULT 'creances_clients'
);

CREATE TABLE IF NOT EXISTS "archived_orphan_paiements" (
  "id" BIGINT PRIMARY KEY,
  "numero_facture" VARCHAR(30) NOT NULL,
  "nom_client" VARCHAR(150) NOT NULL,
  "date_paiement" DATE NOT NULL,
  "montant_recu" NUMERIC(14,2) NOT NULL,
  "methode_paiement" "paiement_methode" NOT NULL,
  "devise" VARCHAR(3) NOT NULL DEFAULT 'MAD',
  "taux_change" NUMERIC(18,6),
  "montant_converti_mad" NUMERIC(14,2),
  "source_taux" VARCHAR(50),
  "est_taux_manuel" BOOLEAN NOT NULL DEFAULT false,
  "date_taux_utilise" DATE,
  "archived_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "reason" VARCHAR(255) NOT NULL,
  "rehearsal_id" VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS "archived_orphan_creances" (
  "id" BIGINT PRIMARY KEY,
  "numero_facture" VARCHAR(30) NOT NULL,
  "date_emission" DATE NOT NULL,
  "nom_client" VARCHAR(150) NOT NULL,
  "delai_paiement_jours" INT NOT NULL DEFAULT 30,
  "montant_facture" NUMERIC(14,2) NOT NULL,
  "montant_recu" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "solde" NUMERIC(14,2),
  "date_echeance" DATE,
  "statut_paiement" "creance_statut" NOT NULL DEFAULT 'NON_PAYE',
  "action_recouvrement" VARCHAR(255),
  "devise" VARCHAR(3) NOT NULL DEFAULT 'MAD',
  "archived_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "reason" VARCHAR(255) NOT NULL,
  "rehearsal_id" VARCHAR(50) NOT NULL
);

-- ---------------------------------------------------------------------
-- STEP 4: Candidate Count Discovery & Quarantining Ambiguous Payments/Creances (candidate_count > 1)
-- ---------------------------------------------------------------------
WITH candidate_analysis AS (
  SELECT p.id, p.numero_facture, p.nom_client, p.date_paiement, p.montant_recu, p.methode_paiement,
    p.devise, p.taux_change, p.montant_converti_mad, p.source_taux, p.est_taux_manuel, p.date_taux_utilise,
    ARRAY(SELECT f.id::integer FROM factures f WHERE f.numero_facture = p.numero_facture AND f.nom_client = p.nom_client) as candidate_invoice_ids,
    ARRAY(SELECT f.company_id::integer FROM factures f WHERE f.numero_facture = p.numero_facture AND f.nom_client = p.nom_client) as candidate_company_ids,
    (SELECT count(*)::integer FROM factures f WHERE f.numero_facture = p.numero_facture AND f.nom_client = p.nom_client) as candidate_count
  FROM paiements_clients p
)
INSERT INTO quarantine_ambiguous_paiements (
  id, numero_facture, nom_client, date_paiement, montant_recu, methode_paiement, devise,
  taux_change, montant_converti_mad, source_taux, est_taux_manuel, date_taux_utilise,
  candidate_invoice_ids, candidate_company_ids, status, source_table
)
SELECT
  id, numero_facture, nom_client, date_paiement, montant_recu, methode_paiement, devise,
  taux_change, montant_converti_mad, source_taux, est_taux_manuel, date_taux_utilise,
  candidate_invoice_ids, candidate_company_ids, 'AMBIGUOUS_PENDING_REVIEW', 'paiements_clients'
FROM candidate_analysis
WHERE candidate_count > 1
ON CONFLICT (id) DO NOTHING;

DELETE FROM paiements_clients p
WHERE (SELECT count(*) FROM factures f WHERE f.numero_facture = p.numero_facture AND f.nom_client = p.nom_client) > 1;

WITH creance_candidate_analysis AS (
  SELECT c.id, c.numero_facture, c.date_emission, c.nom_client, c.delai_paiement_jours, c.montant_facture,
    c.montant_recu, c.solde, c.date_echeance, c.statut_paiement, c.action_recouvrement, c.devise,
    ARRAY(SELECT f.id::integer FROM factures f WHERE f.numero_facture = c.numero_facture AND f.nom_client = c.nom_client) as candidate_invoice_ids,
    ARRAY(SELECT f.company_id::integer FROM factures f WHERE f.numero_facture = c.numero_facture AND f.nom_client = c.nom_client) as candidate_company_ids,
    (SELECT count(*)::integer FROM factures f WHERE f.numero_facture = c.numero_facture AND f.nom_client = c.nom_client) as candidate_count
  FROM creances_clients c
)
INSERT INTO quarantine_ambiguous_creances (
  id, numero_facture, date_emission, nom_client, delai_paiement_jours, montant_facture,
  montant_recu, solde, date_echeance, statut_paiement, action_recouvrement, devise,
  candidate_invoice_ids, candidate_company_ids, status, source_table
)
SELECT
  id, numero_facture, date_emission, nom_client, delai_paiement_jours, montant_facture,
  montant_recu, solde, date_echeance, statut_paiement, action_recouvrement, devise,
  candidate_invoice_ids, candidate_company_ids, 'AMBIGUOUS_PENDING_REVIEW', 'creances_clients'
FROM creance_candidate_analysis
WHERE candidate_count > 1
ON CONFLICT (id) DO NOTHING;

DELETE FROM creances_clients c
WHERE (SELECT count(*) FROM factures f WHERE f.numero_facture = c.numero_facture AND f.nom_client = c.nom_client) > 1;

-- ---------------------------------------------------------------------
-- STEP 5: Orphan Archiving (candidate_count = 0)
-- ---------------------------------------------------------------------
INSERT INTO archived_orphan_paiements (
  id, numero_facture, nom_client, date_paiement, montant_recu, methode_paiement, devise,
  taux_change, montant_converti_mad, source_taux, est_taux_manuel, date_taux_utilise,
  reason, rehearsal_id
)
SELECT
  id, numero_facture, nom_client, date_paiement, montant_recu, methode_paiement, devise,
  taux_change, montant_converti_mad, source_taux, est_taux_manuel, date_taux_utilise,
  'ORPHAN_RECORD_NO_INVOICE', 'PRODUCTION_MIGRATION_7_5_2'
FROM paiements_clients p
WHERE (SELECT count(*) FROM factures f WHERE f.numero_facture = p.numero_facture AND f.nom_client = p.nom_client) = 0
ON CONFLICT (id) DO NOTHING;

DELETE FROM paiements_clients p
WHERE (SELECT count(*) FROM factures f WHERE f.numero_facture = p.numero_facture AND f.nom_client = p.nom_client) = 0;

INSERT INTO archived_orphan_creances (
  id, numero_facture, date_emission, nom_client, delai_paiement_jours, montant_facture,
  montant_recu, solde, date_echeance, statut_paiement, action_recouvrement, devise,
  reason, rehearsal_id
)
SELECT
  id, numero_facture, date_emission, nom_client, delai_paiement_jours, montant_facture,
  montant_recu, solde, date_echeance, statut_paiement, action_recouvrement, devise,
  'ORPHAN_RECORD_NO_INVOICE', 'PRODUCTION_MIGRATION_7_5_2'
FROM creances_clients c
WHERE (SELECT count(*) FROM factures f WHERE f.numero_facture = c.numero_facture AND f.nom_client = c.nom_client) = 0
ON CONFLICT (id) DO NOTHING;

DELETE FROM creances_clients c
WHERE (SELECT count(*) FROM factures f WHERE f.numero_facture = c.numero_facture AND f.nom_client = c.nom_client) = 0;

-- ---------------------------------------------------------------------
-- STEP 6: Deterministic Backfill (STRICTLY candidate_count = 1)
-- ---------------------------------------------------------------------
WITH deterministic_payment_matches AS (
  SELECT p.id as payment_id, f.id as target_invoice_id, f.company_id as target_company_id
  FROM paiements_clients p
  JOIN factures f ON p.numero_facture = f.numero_facture AND p.nom_client = f.nom_client
  WHERE (
    SELECT count(*) FROM factures f2 WHERE f2.numero_facture = p.numero_facture AND f2.nom_client = p.nom_client
  ) = 1
)
UPDATE paiements_clients p
SET facture_id = m.target_invoice_id, company_id = m.target_company_id
FROM deterministic_payment_matches m
WHERE p.id = m.payment_id;

WITH deterministic_creance_matches AS (
  SELECT c.id as creance_id, f.id as target_invoice_id, f.company_id as target_company_id
  FROM creances_clients c
  JOIN factures f ON c.numero_facture = f.numero_facture AND c.nom_client = f.nom_client
  WHERE (
    SELECT count(*) FROM factures f2 WHERE f2.numero_facture = c.numero_facture AND f2.nom_client = c.nom_client
  ) = 1
)
UPDATE creances_clients c
SET facture_id = m.target_invoice_id, company_id = m.target_company_id
FROM deterministic_creance_matches m
WHERE c.id = m.creance_id;

-- ---------------------------------------------------------------------
-- STEP 7: Enforce NOT NULL & Composite Foreign Key Constraints
-- ---------------------------------------------------------------------
ALTER TABLE "paiements_clients" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "paiements_clients" ALTER COLUMN "facture_id" SET NOT NULL;

ALTER TABLE "creances_clients" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "creances_clients" ALTER COLUMN "facture_id" SET NOT NULL;

ALTER TABLE "paiements_clients"
  ADD CONSTRAINT "fk_paiements_clients_company_facture"
  FOREIGN KEY ("company_id", "facture_id")
  REFERENCES "factures" ("company_id", "id")
  ON UPDATE CASCADE
  ON DELETE RESTRICT;

ALTER TABLE "creances_clients"
  ADD CONSTRAINT "fk_creances_clients_company_facture"
  FOREIGN KEY ("company_id", "facture_id")
  REFERENCES "factures" ("company_id", "id")
  ON UPDATE CASCADE
  ON DELETE CASCADE;

ALTER TABLE "creances_clients"
  ADD CONSTRAINT "uq_creances_clients_company_facture"
  UNIQUE ("company_id", "facture_id");

COMMIT;
