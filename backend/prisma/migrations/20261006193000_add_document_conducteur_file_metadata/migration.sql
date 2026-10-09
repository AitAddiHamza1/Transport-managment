-- AlterTable: Add file metadata and soft delete support to documents_conducteurs
ALTER TABLE "documents_conducteurs" ADD COLUMN     "mime_type" VARCHAR(100),
ADD COLUMN     "nom_original" VARCHAR(255),
ADD COLUMN     "supprime_le" TIMESTAMPTZ(6),
ADD COLUMN     "taille_fichier" BIGINT;

-- CreateIndex: Index for soft delete queries filtering
CREATE INDEX "idx_doccond_supprime_le" ON "documents_conducteurs"("supprime_le");
