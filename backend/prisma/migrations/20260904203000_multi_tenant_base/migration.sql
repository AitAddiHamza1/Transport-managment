-- Migration Multi-Tenant Étape 3A (Sûre, contrôlée, non-destructive avec backfill)

-- 1. CreateEnum
CREATE TYPE "company_statut" AS ENUM ('ACTIF', 'INACTIF', 'SUSPENDU');

-- 2. CreateTable companies
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(150) NOT NULL,
    "statut" "company_statut" NOT NULL DEFAULT 'ACTIF',
    "cree_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mis_a_jour_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- 3. Dynamic Creation of Initial Tenant & Data Backfill inside PL/pgSQL block
DO $$
DECLARE
  v_company_id INTEGER;
BEGIN
  -- Insert initial company and capture real ID
  INSERT INTO "companies" ("nom", "statut", "cree_le", "mis_a_jour_le")
  VALUES ('Entreprise Principale', 'ACTIF', NOW(), NOW())
  RETURNING "id" INTO v_company_id;

  -- Add temporary nullable company_id columns and backfill existing data to initial tenant
  ALTER TABLE "users" ADD COLUMN "company_id" INTEGER;
  UPDATE "users" SET "company_id" = v_company_id WHERE "company_id" IS NULL;

  ALTER TABLE "clients" ADD COLUMN "company_id" INTEGER;
  UPDATE "clients" SET "company_id" = v_company_id WHERE "company_id" IS NULL;

  ALTER TABLE "fournisseurs" ADD COLUMN "company_id" INTEGER;
  UPDATE "fournisseurs" SET "company_id" = v_company_id WHERE "company_id" IS NULL;

  ALTER TABLE "conducteurs" ADD COLUMN "company_id" INTEGER;
  UPDATE "conducteurs" SET "company_id" = v_company_id WHERE "company_id" IS NULL;

  ALTER TABLE "employes" ADD COLUMN "company_id" INTEGER;
  UPDATE "employes" SET "company_id" = v_company_id WHERE "company_id" IS NULL;

  ALTER TABLE "vehicules" ADD COLUMN "company_id" INTEGER;
  UPDATE "vehicules" SET "company_id" = v_company_id WHERE "company_id" IS NULL;

  ALTER TABLE "voyages" ADD COLUMN "company_id" INTEGER;
  UPDATE "voyages" SET "company_id" = v_company_id WHERE "company_id" IS NULL;

  ALTER TABLE "factures" ADD COLUMN "company_id" INTEGER;
  UPDATE "factures" SET "company_id" = v_company_id WHERE "company_id" IS NULL;

  ALTER TABLE "depenses_administratives" ADD COLUMN "company_id" INTEGER;
  UPDATE "depenses_administratives" SET "company_id" = v_company_id WHERE "company_id" IS NULL;

  ALTER TABLE "dettes_fournisseurs" ADD COLUMN "company_id" INTEGER;
  UPDATE "dettes_fournisseurs" SET "company_id" = v_company_id WHERE "company_id" IS NULL;

  ALTER TABLE "gestion_paiements" ADD COLUMN "company_id" INTEGER;
  UPDATE "gestion_paiements" SET "company_id" = v_company_id WHERE "company_id" IS NULL;

  ALTER TABLE "company_settings" ADD COLUMN "company_id" INTEGER;
  UPDATE "company_settings" SET "company_id" = v_company_id WHERE "company_id" IS NULL;

  ALTER TABLE "roles" ADD COLUMN "company_id" INTEGER;

  ALTER TABLE "invoice_sequences" ADD COLUMN "company_id" INTEGER;
  UPDATE "invoice_sequences" SET "company_id" = v_company_id WHERE "company_id" IS NULL;

  ALTER TABLE "dette_fournisseur_sequences" ADD COLUMN "company_id" INTEGER;
  UPDATE "dette_fournisseur_sequences" SET "company_id" = v_company_id WHERE "company_id" IS NULL;

  ALTER TABLE "paiement_fournisseur_sequences" ADD COLUMN "company_id" INTEGER;
  UPDATE "paiement_fournisseur_sequences" SET "company_id" = v_company_id WHERE "company_id" IS NULL;

  ALTER TABLE "employe_sequences" ADD COLUMN "company_id" INTEGER;
  UPDATE "employe_sequences" SET "company_id" = v_company_id WHERE "company_id" IS NULL;

  ALTER TABLE "paiement_employe_sequences" ADD COLUMN "company_id" INTEGER;
  UPDATE "paiement_employe_sequences" SET "company_id" = v_company_id WHERE "company_id" IS NULL;

END $$;

-- 4. Set NOT NULL on direct tenant models
ALTER TABLE "users" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "clients" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "fournisseurs" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "conducteurs" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "employes" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "vehicules" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "voyages" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "factures" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "depenses_administratives" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "dettes_fournisseurs" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "gestion_paiements" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "company_settings" ALTER COLUMN "company_id" SET NOT NULL;

-- 5. CompanySettings Singleton transition
ALTER TABLE "company_settings" DROP CONSTRAINT IF EXISTS "company_settings_singleton_key_key" CASCADE;
DROP INDEX IF EXISTS "company_settings_singleton_key_key";
ALTER TABLE "company_settings" DROP COLUMN IF EXISTS "singleton_key";
CREATE UNIQUE INDEX "company_settings_company_id_key" ON "company_settings"("company_id");

-- 6. Sequence Tables PK Transition
ALTER TABLE "invoice_sequences" DROP CONSTRAINT "invoice_sequences_pkey";
ALTER TABLE "invoice_sequences" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "invoice_sequences" ADD CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("company_id", "annee");

ALTER TABLE "dette_fournisseur_sequences" DROP CONSTRAINT "dette_fournisseur_sequences_pkey";
ALTER TABLE "dette_fournisseur_sequences" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "dette_fournisseur_sequences" ADD CONSTRAINT "dette_fournisseur_sequences_pkey" PRIMARY KEY ("company_id", "annee");

ALTER TABLE "paiement_fournisseur_sequences" DROP CONSTRAINT "paiement_fournisseur_sequences_pkey";
ALTER TABLE "paiement_fournisseur_sequences" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "paiement_fournisseur_sequences" ADD CONSTRAINT "paiement_fournisseur_sequences_pkey" PRIMARY KEY ("company_id", "annee");

ALTER TABLE "employe_sequences" DROP CONSTRAINT "employe_sequences_pkey";
ALTER TABLE "employe_sequences" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "employe_sequences" ADD CONSTRAINT "employe_sequences_pkey" PRIMARY KEY ("company_id", "prefixe");

ALTER TABLE "paiement_employe_sequences" DROP CONSTRAINT "paiement_employe_sequences_pkey";
ALTER TABLE "paiement_employe_sequences" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "paiement_employe_sequences" ADD CONSTRAINT "paiement_employe_sequences_pkey" PRIMARY KEY ("company_id", "annee");

-- 7. Drop old global UNIQUE constraints and create tenant-scoped UNIQUE constraints
ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "uq_clients_ice" CASCADE;
DROP INDEX IF EXISTS "uq_clients_ice";
CREATE UNIQUE INDEX "clients_company_id_ice_key" ON "clients"("company_id", "ice");

ALTER TABLE "fournisseurs" DROP CONSTRAINT IF EXISTS "uq_fournisseurs_nom" CASCADE;
DROP INDEX IF EXISTS "uq_fournisseurs_nom";
CREATE UNIQUE INDEX "fournisseurs_company_id_nom_fournisseur_key" ON "fournisseurs"("company_id", "nom_fournisseur");

ALTER TABLE "fournisseurs" DROP CONSTRAINT IF EXISTS "uq_fournisseurs_ice" CASCADE;
DROP INDEX IF EXISTS "uq_fournisseurs_ice";
CREATE UNIQUE INDEX "fournisseurs_company_id_ice_key" ON "fournisseurs"("company_id", "ice");

ALTER TABLE "vehicules" DROP CONSTRAINT IF EXISTS "uq_vehicules_immat" CASCADE;
DROP INDEX IF EXISTS "uq_vehicules_immat";
CREATE UNIQUE INDEX "vehicules_company_id_immatriculation_key" ON "vehicules"("company_id", "immatriculation");

ALTER TABLE "vehicules" DROP CONSTRAINT IF EXISTS "uq_vehicules_chassis" CASCADE;
DROP INDEX IF EXISTS "uq_vehicules_chassis";
CREATE UNIQUE INDEX "vehicules_company_id_numero_chassis_key" ON "vehicules"("company_id", "numero_chassis");

ALTER TABLE "factures" DROP CONSTRAINT IF EXISTS "uq_factures_numero" CASCADE;
DROP INDEX IF EXISTS "uq_factures_numero";
CREATE UNIQUE INDEX "factures_company_id_numero_facture_key" ON "factures"("company_id", "numero_facture");

ALTER TABLE "dettes_fournisseurs" DROP CONSTRAINT IF EXISTS "uq_dettes_numero_dette" CASCADE;
DROP INDEX IF EXISTS "uq_dettes_numero_dette";
CREATE UNIQUE INDEX "dettes_fournisseurs_company_id_numero_dette_key" ON "dettes_fournisseurs"("company_id", "numero_dette");

ALTER TABLE "employes" DROP CONSTRAINT IF EXISTS "employes_matricule_key" CASCADE;
DROP INDEX IF EXISTS "employes_matricule_key";
CREATE UNIQUE INDEX "employes_company_id_matricule_key" ON "employes"("company_id", "matricule");

-- Roles Uniqueness: System roles (company_id NULL) vs Custom roles (company_id NOT NULL)
ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "uq_roles_nom" CASCADE;
DROP INDEX IF EXISTS "uq_roles_nom";
CREATE UNIQUE INDEX "roles_system_nom_key" ON "roles" ("nom") WHERE "company_id" IS NULL;
CREATE UNIQUE INDEX "roles_company_nom_key" ON "roles" ("company_id", "nom") WHERE "company_id" IS NOT NULL;

-- 8. Add Indexes on company_id
CREATE INDEX "users_company_id_idx" ON "users"("company_id");
CREATE INDEX "roles_company_id_idx" ON "roles"("company_id");
CREATE INDEX "clients_company_id_idx" ON "clients"("company_id");
CREATE INDEX "fournisseurs_company_id_idx" ON "fournisseurs"("company_id");
CREATE INDEX "conducteurs_company_id_idx" ON "conducteurs"("company_id");
CREATE INDEX "employes_company_id_idx" ON "employes"("company_id");
CREATE INDEX "vehicules_company_id_idx" ON "vehicules"("company_id");
CREATE INDEX "voyages_company_id_idx" ON "voyages"("company_id");
CREATE INDEX "factures_company_id_idx" ON "factures"("company_id");
CREATE INDEX "depenses_administratives_company_id_idx" ON "depenses_administratives"("company_id");
CREATE INDEX "dettes_fournisseurs_company_id_idx" ON "dettes_fournisseurs"("company_id");
CREATE INDEX "gestion_paiements_company_id_idx" ON "gestion_paiements"("company_id");

-- 9. Add Foreign Keys to companies(id)
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "roles" ADD CONSTRAINT "roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clients" ADD CONSTRAINT "clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fournisseurs" ADD CONSTRAINT "fournisseurs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conducteurs" ADD CONSTRAINT "conducteurs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employes" ADD CONSTRAINT "employes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicules" ADD CONSTRAINT "vehicules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "voyages" ADD CONSTRAINT "voyages_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "factures" ADD CONSTRAINT "factures_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "depenses_administratives" ADD CONSTRAINT "depenses_administratives_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dettes_fournisseurs" ADD CONSTRAINT "dettes_fournisseurs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gestion_paiements" ADD CONSTRAINT "gestion_paiements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice_sequences" ADD CONSTRAINT "invoice_sequences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dette_fournisseur_sequences" ADD CONSTRAINT "dette_fournisseur_sequences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "paiement_fournisseur_sequences" ADD CONSTRAINT "paiement_fournisseur_sequences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employe_sequences" ADD CONSTRAINT "employe_sequences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "paiement_employe_sequences" ADD CONSTRAINT "paiement_employe_sequences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
