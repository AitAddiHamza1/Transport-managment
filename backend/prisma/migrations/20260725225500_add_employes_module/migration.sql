-- CreateEnum
CREATE TYPE "employe_statut" AS ENUM ('ACTIF', 'SUSPENDU', 'DEMISSIONNAIRE', 'LICENCIE', 'RETRAITE', 'INACTIF');

-- CreateEnum
CREATE TYPE "contrat_type" AS ENUM ('CDI', 'CDD', 'STAGE', 'TEMPORAIRE', 'FREELANCE');

-- CreateEnum
CREATE TYPE "paiement_mode_employe" AS ENUM ('VIREMENT', 'ESPECES', 'CHEQUE');

-- CreateTable
CREATE TABLE "employes" (
    "id" SERIAL NOT NULL,
    "matricule" VARCHAR(30) NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "cin" VARCHAR(30),
    "date_naissance" DATE,
    "telephone" VARCHAR(30),
    "email" CITEXT,
    "adresse" VARCHAR(255),
    "poste" VARCHAR(100) NOT NULL,
    "departement" VARCHAR(100),
    "date_embauche" DATE NOT NULL,
    "type_contrat" "contrat_type" NOT NULL,
    "statut" "employe_statut" NOT NULL DEFAULT 'ACTIF',
    "date_sortie" DATE,
    "motif_sortie" VARCHAR(255),
    "salaire_base" DECIMAL(14,2),
    "mode_paiement" "paiement_mode_employe",
    "nom_banque" VARCHAR(100),
    "rib" VARCHAR(34),
    "photo_filename" VARCHAR(255),
    "photo_original_name" VARCHAR(255),
    "photo_mime_type" VARCHAR(100),
    "photo_size" INTEGER,
    "photo_path" VARCHAR(500),
    "observations" VARCHAR(500),
    "cree_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mis_a_jour_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supprime_le" TIMESTAMPTZ(6),

    CONSTRAINT "employes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents_employes" (
    "id" SERIAL NOT NULL,
    "id_employe" INTEGER NOT NULL,
    "type_document" VARCHAR(50) NOT NULL,
    "numero_document" VARCHAR(60),
    "date_emission" DATE,
    "date_expiration" DATE,
    "filename" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "chemin_fichier" VARCHAR(500) NOT NULL,
    "statut" "document_statut" NOT NULL DEFAULT 'VALIDE',
    "notes" VARCHAR(255),
    "cree_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mis_a_jour_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_employes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employe_sequences" (
    "prefixe" VARCHAR(10) NOT NULL,
    "dernier_numero" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "employe_sequences_pkey" PRIMARY KEY ("prefixe")
);

-- CreateIndexes
CREATE UNIQUE INDEX "employes_matricule_key" ON "employes"("matricule");
CREATE INDEX "employes_nom_prenom_idx" ON "employes"("nom", "prenom");
CREATE INDEX "employes_statut_idx" ON "employes"("statut");
CREATE INDEX "employes_departement_idx" ON "employes"("departement");
CREATE INDEX "employes_poste_idx" ON "employes"("poste");
CREATE INDEX "employes_supprime_le_idx" ON "employes"("supprime_le");

CREATE INDEX "documents_employes_id_employe_idx" ON "documents_employes"("id_employe");
CREATE INDEX "documents_employes_type_document_idx" ON "documents_employes"("type_document");
CREATE INDEX "documents_employes_date_expiration_idx" ON "documents_employes"("date_expiration");
CREATE INDEX "documents_employes_statut_idx" ON "documents_employes"("statut");

-- AddForeignKey
ALTER TABLE "documents_employes" ADD CONSTRAINT "documents_employes_id_employe_fkey" FOREIGN KEY ("id_employe") REFERENCES "employes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial Unique Index on CIN for Active Employees
CREATE UNIQUE INDEX "idx_employes_cin_active" ON "employes" ("cin") WHERE "supprime_le" IS NULL AND "cin" IS NOT NULL;

-- CHECK Constraints
ALTER TABLE "employes" ADD CONSTRAINT "chk_employes_salaire_base" CHECK ("salaire_base" IS NULL OR "salaire_base" >= 0);
ALTER TABLE "employes" ADD CONSTRAINT "chk_employes_date_sortie" CHECK ("date_sortie" IS NULL OR "date_sortie" >= "date_embauche");
