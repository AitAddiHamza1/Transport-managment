-- AlterTable: Drop obsolete single-tenant global unique constraint on creances_clients.numero_facture
-- Preserves composite UNIQUE (company_id, facture_id) and composite foreign keys
ALTER TABLE "creances_clients" DROP CONSTRAINT IF EXISTS "uq_creances_facture";
