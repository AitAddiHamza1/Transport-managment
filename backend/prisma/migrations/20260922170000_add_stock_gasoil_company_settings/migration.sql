ALTER TABLE "company_settings"
ADD COLUMN "seuil_alerte_stock_gasoil" DECIMAL(10,2) NOT NULL DEFAULT 500.00,
ADD COLUMN "statut_alerte_stock_gasoil" VARCHAR(20) NOT NULL DEFAULT 'NORMAL';
