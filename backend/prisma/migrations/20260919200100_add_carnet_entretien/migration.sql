-- CreateEnum
CREATE TYPE "maintenance_trigger_type" AS ENUM ('KILOMETRAGE', 'DATE', 'KILOMETRAGE_OU_DATE');

-- CreateEnum
CREATE TYPE "maintenance_status" AS ENUM ('OK', 'UPCOMING', 'DUE', 'OVERDUE');

-- AlterTable
ALTER TABLE "depenses_vehicules" ADD COLUMN IF NOT EXISTS "id_fournisseur" INTEGER,
ADD COLUMN IF NOT EXISTS "id_dette_fournisseur" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "maintenance_rules" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "trigger_type" "maintenance_trigger_type" NOT NULL DEFAULT 'KILOMETRAGE',
    "intervalle_km" INTEGER,
    "intervalle_mois" INTEGER,
    "seuil_alerte_km" INTEGER,
    "seuil_alerte_jours" INTEGER,
    "description" VARCHAR(255),
    "cree_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "maintenance_interventions" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "immatriculation" VARCHAR(20) NOT NULL,
    "id_rule" INTEGER,
    "libelle" VARCHAR(150) NOT NULL,
    "date_intervention" DATE NOT NULL,
    "kilometrage_realise" INTEGER NOT NULL,
    "prochain_km_echeance" INTEGER,
    "prochaine_date_echeance" DATE,
    "statut" "maintenance_status" NOT NULL DEFAULT 'OK',
    "id_depense_vehicule" INTEGER,
    "notes" VARCHAR(500),
    "cree_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mis_a_jour_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_interventions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "depenses_vehicules_id_dette_fournisseur_key" ON "depenses_vehicules"("id_dette_fournisseur");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "depenses_vehicules_id_fournisseur_idx" ON "depenses_vehicules"("id_fournisseur");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "maintenance_rules_company_id_idx" ON "maintenance_rules"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "maintenance_rules_company_id_code_key" ON "maintenance_rules"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "maintenance_interventions_id_depense_vehicule_key" ON "maintenance_interventions"("id_depense_vehicule");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "maintenance_interventions_company_id_immatriculation_idx" ON "maintenance_interventions"("company_id", "immatriculation");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "maintenance_interventions_company_id_statut_idx" ON "maintenance_interventions"("company_id", "statut");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "maintenance_interventions_id_rule_idx" ON "maintenance_interventions"("id_rule");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'depenses_vehicules_id_fournisseur_fkey') THEN
    ALTER TABLE "depenses_vehicules" ADD CONSTRAINT "depenses_vehicules_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "fournisseurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'depenses_vehicules_id_dette_fournisseur_fkey') THEN
    ALTER TABLE "depenses_vehicules" ADD CONSTRAINT "depenses_vehicules_id_dette_fournisseur_fkey" FOREIGN KEY ("id_dette_fournisseur") REFERENCES "dettes_fournisseurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_rules_company_id_fkey') THEN
    ALTER TABLE "maintenance_rules" ADD CONSTRAINT "maintenance_rules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_interventions_company_id_fkey') THEN
    ALTER TABLE "maintenance_interventions" ADD CONSTRAINT "maintenance_interventions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_interventions_company_id_immatriculation_fkey') THEN
    ALTER TABLE "maintenance_interventions" ADD CONSTRAINT "maintenance_interventions_company_id_immatriculation_fkey" FOREIGN KEY ("company_id", "immatriculation") REFERENCES "vehicules"("company_id", "immatriculation") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_interventions_id_rule_fkey') THEN
    ALTER TABLE "maintenance_interventions" ADD CONSTRAINT "maintenance_interventions_id_rule_fkey" FOREIGN KEY ("id_rule") REFERENCES "maintenance_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_interventions_id_depense_vehicule_fkey') THEN
    ALTER TABLE "maintenance_interventions" ADD CONSTRAINT "maintenance_interventions_id_depense_vehicule_fkey" FOREIGN KEY ("id_depense_vehicule") REFERENCES "depenses_vehicules"("id_depense") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
