-- CreateEnum
CREATE TYPE "source_carburant" AS ENUM ('STOCK_ENTREPRISE', 'EXTERNE');

-- CreateEnum
CREATE TYPE "type_mouvement_gasoil" AS ENUM ('ENTREE', 'SORTIE');

-- AlterTable
ALTER TABLE "bons_carburant" ADD COLUMN "source_carburant" "source_carburant" NOT NULL DEFAULT 'EXTERNE';

-- CreateIndex
CREATE INDEX "bons_carburant_source_carburant_idx" ON "bons_carburant"("source_carburant");

-- AlterTable
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "seuil_alerte_stock_gasoil" DECIMAL(10,2) NOT NULL DEFAULT 500.00;

-- CreateTable
CREATE TABLE "stock_gasoil_mouvements" (
    "id_mouvement" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "type_mouvement" "type_mouvement_gasoil" NOT NULL,
    "date_mouvement" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantite_litres" DECIMAL(10,2) NOT NULL,
    "prix_unitaire" DECIMAL(10,3),
    "montant_total" DECIMAL(14,2),
    "id_bon_carburant" INTEGER,
    "immatriculation" VARCHAR(20),
    "nom_conducteur" VARCHAR(150),
    "nom_fournisseur" VARCHAR(150),
    "reference_facture" VARCHAR(60),
    "remarques" VARCHAR(500),
    "cree_par_id" INTEGER,
    "cree_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mis_a_jour_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_gasoil_mouvements_pkey" PRIMARY KEY ("id_mouvement")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_gasoil_mouvements_id_bon_carburant_key" ON "stock_gasoil_mouvements"("id_bon_carburant");

-- CreateIndex
CREATE INDEX "stock_gasoil_mouvements_company_id_date_mouvement_idx" ON "stock_gasoil_mouvements"("company_id", "date_mouvement");

-- CreateIndex
CREATE INDEX "stock_gasoil_mouvements_type_mouvement_idx" ON "stock_gasoil_mouvements"("type_mouvement");

-- AddForeignKey
ALTER TABLE "stock_gasoil_mouvements" ADD CONSTRAINT "stock_gasoil_mouvements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_gasoil_mouvements" ADD CONSTRAINT "stock_gasoil_mouvements_id_bon_carburant_fkey" FOREIGN KEY ("id_bon_carburant") REFERENCES "bons_carburant"("id_bon") ON DELETE CASCADE ON UPDATE CASCADE;
