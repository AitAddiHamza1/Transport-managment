-- CreateEnum
CREATE TYPE "JustificatifType" AS ENUM ('AVEC_FACTURE', 'SANS_FACTURE');

-- AlterTable
ALTER TABLE "depenses_vehicules" ADD COLUMN "justificatif_type" "JustificatifType" NOT NULL DEFAULT 'AVEC_FACTURE';

-- Normalize existing data: set to SANS_FACTURE if both type_facture and fichier_recu are null/empty
UPDATE "depenses_vehicules"
SET "justificatif_type" = 'SANS_FACTURE'
WHERE ("type_facture" IS NULL OR TRIM("type_facture") = '')
  AND ("fichier_recu" IS NULL OR TRIM("fichier_recu") = '');
