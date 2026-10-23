-- AlterTable
ALTER TABLE "maintenance_interventions" ADD COLUMN IF NOT EXISTS "date_fin_entretien" DATE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "maintenance_interventions_company_id_date_fin_entretien_idx" ON "maintenance_interventions"("company_id", "date_fin_entretien");
