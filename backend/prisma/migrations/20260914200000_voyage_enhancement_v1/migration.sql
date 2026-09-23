-- =====================================================================
--  Migration Voyage Enhancement V1 — Step 3 (Controlled Migration)
-- =====================================================================

-- 1. Create Enum mode_facturation
CREATE TYPE "mode_facturation" AS ENUM ('AVEC_FACTURE', 'SANS_FACTURE');

-- 2. Alter Table voyages (add mode_facturation + index)
ALTER TABLE "voyages" ADD COLUMN "mode_facturation" "mode_facturation" NOT NULL DEFAULT 'AVEC_FACTURE';
CREATE INDEX "idx_voyages_mode_facturation" ON "voyages"("mode_facturation");

-- 3. Alter Table factures (add mode_facturation + index)
ALTER TABLE "factures" ADD COLUMN "mode_facturation" "mode_facturation" NOT NULL DEFAULT 'AVEC_FACTURE';
CREATE INDEX "idx_factures_mode_facturation" ON "factures"("mode_facturation");

-- 4. Alter Table invoice_sequences (Controlled PK Migration)
ALTER TABLE "invoice_sequences" ADD COLUMN "mode_facturation" "mode_facturation" NOT NULL DEFAULT 'AVEC_FACTURE';
ALTER TABLE "invoice_sequences" DROP CONSTRAINT "invoice_sequences_pkey";
ALTER TABLE "invoice_sequences" ADD CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("company_id", "annee", "mode_facturation");

-- 5. Create Table frais_immobilisations (with STORED GENERATED COLUMN)
CREATE TABLE "frais_immobilisations" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "id_voyage" BIGINT NOT NULL UNIQUE,
    "prix_par_jour" NUMERIC(14,2) NOT NULL,
    "nombre_jours_retard" INTEGER NOT NULL,
    "montant_total" NUMERIC(14,2) GENERATED ALWAYS AS (round("prix_par_jour" * "nombre_jours_retard", 2)) STORED,
    "cree_le" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "mis_a_jour_le" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "fk_frais_immob_voyage" FOREIGN KEY ("id_voyage")
        REFERENCES "voyages" ("id_voyage") ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT "chk_frais_immob_prix" CHECK ("prix_par_jour" >= 0),
    CONSTRAINT "chk_frais_immob_jours" CHECK ("nombre_jours_retard" >= 0)
);
CREATE INDEX "idx_frais_immob_voyage" ON "frais_immobilisations"("id_voyage");

-- 6. Create Table documents_voyage
CREATE TABLE "documents_voyage" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "id_voyage" BIGINT NOT NULL,
    "chemin_fichier" VARCHAR(500) NOT NULL,
    "nom_original" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "taille_fichier" BIGINT NOT NULL,
    "cree_le" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "mis_a_jour_le" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "supprime_le" TIMESTAMPTZ,
    CONSTRAINT "fk_docvoyage_voyage" FOREIGN KEY ("id_voyage")
        REFERENCES "voyages" ("id_voyage") ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE INDEX "idx_docvoyage_voyage" ON "documents_voyage"("id_voyage");
CREATE INDEX "idx_docvoyage_supprime" ON "documents_voyage"("supprime_le");

-- 7. Alter Table lettres_de_change (add nullable document attributes)
ALTER TABLE "lettres_de_change" ADD COLUMN "chemin_fichier" VARCHAR(500);
ALTER TABLE "lettres_de_change" ADD COLUMN "nom_original" VARCHAR(255);
ALTER TABLE "lettres_de_change" ADD COLUMN "mime_type" VARCHAR(100);
ALTER TABLE "lettres_de_change" ADD COLUMN "taille_fichier" BIGINT;
