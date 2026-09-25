-- AlterTable
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "statut_alerte_stock_gasoil" VARCHAR(20) NOT NULL DEFAULT 'NORMAL';
