-- AlterTable
ALTER TABLE "clients" ADD COLUMN "devise_facturation" VARCHAR(3) NOT NULL DEFAULT 'MAD';
ALTER TABLE "voyages" ADD COLUMN "devise" VARCHAR(3) NOT NULL DEFAULT 'MAD';
ALTER TABLE "paiements_clients" ADD COLUMN "devise" VARCHAR(3) NOT NULL DEFAULT 'MAD';
ALTER TABLE "creances_clients" ADD COLUMN "devise" VARCHAR(3) NOT NULL DEFAULT 'MAD';

-- Add check constraints
ALTER TABLE "clients" ADD CONSTRAINT "clients_devise_facturation_check" CHECK (devise_facturation IN ('MAD', 'EUR'));
ALTER TABLE "voyages" ADD CONSTRAINT "voyages_devise_check" CHECK (devise IN ('MAD', 'EUR'));
ALTER TABLE "factures" ADD CONSTRAINT "factures_devise_check" CHECK (devise IN ('MAD', 'EUR'));
ALTER TABLE "paiements_clients" ADD CONSTRAINT "paiements_clients_devise_check" CHECK (devise IN ('MAD', 'EUR'));
ALTER TABLE "creances_clients" ADD CONSTRAINT "creances_clients_devise_check" CHECK (devise IN ('MAD', 'EUR'));
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_devise_check" CHECK (devise IN ('MAD', 'EUR'));
