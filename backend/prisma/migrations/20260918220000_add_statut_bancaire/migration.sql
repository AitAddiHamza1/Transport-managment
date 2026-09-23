-- CreateEnum
CREATE TYPE "statut_instrument_bancaire" AS ENUM ('EN_PORTEFEUILLE', 'DEPOSE_EN_BANQUE', 'ENCAISSE', 'REJETE_IMPAYE', 'ANNULE');

-- AlterTable
ALTER TABLE "lettres_de_change" ADD COLUMN "statut_bancaire" "statut_instrument_bancaire" NOT NULL DEFAULT 'EN_PORTEFEUILLE';

-- AlterTable
ALTER TABLE "cheques" ADD COLUMN "statut_bancaire" "statut_instrument_bancaire" NOT NULL DEFAULT 'EN_PORTEFEUILLE';

-- CreateIndex
CREATE INDEX "lettres_de_change_statut_bancaire_idx" ON "lettres_de_change"("statut_bancaire");

-- CreateIndex
CREATE INDEX "cheques_statut_bancaire_idx" ON "cheques"("statut_bancaire");
