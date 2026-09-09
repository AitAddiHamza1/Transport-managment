-- Migration: 20260801220000_add_documents_vehicules_soft_delete
-- Description: Add additive audit, soft-delete, and file metadata columns to documents_vehicules table.

ALTER TABLE "documents_vehicules"
ADD COLUMN IF NOT EXISTS "organisme_emetteur" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "nom_original" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "mime_type" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "taille_fichier" BIGINT,
ADD COLUMN IF NOT EXISTS "mis_a_jour_le" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS "supprime_le" TIMESTAMPTZ;

-- Add soft-delete index
CREATE INDEX IF NOT EXISTS "idx_docveh_supprime_le" ON "documents_vehicules"("supprime_le");

-- Add partial unique active-document index
CREATE UNIQUE INDEX IF NOT EXISTS "idx_docveh_immat_type_active" ON "documents_vehicules"("immatriculation", "type_document") WHERE "supprime_le" IS NULL;
