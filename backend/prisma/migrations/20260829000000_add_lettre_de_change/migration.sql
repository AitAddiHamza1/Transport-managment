-- CreateTable
CREATE TABLE "lettres_de_change" (
    "id" SERIAL NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "date_echeance" DATE NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "beneficiaire" VARCHAR(150) NOT NULL,
    "cause" VARCHAR(255) NOT NULL,
    "tire_nom" VARCHAR(150) NOT NULL,
    "tire_adresse" VARCHAR(255) NOT NULL,
    "id_paiement_client" INTEGER,
    "id_paiement_fournisseur" INTEGER,

    CONSTRAINT "lettres_de_change_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lettres_de_change_id_paiement_client_key" ON "lettres_de_change"("id_paiement_client");

-- CreateIndex
CREATE UNIQUE INDEX "lettres_de_change_id_paiement_fournisseur_key" ON "lettres_de_change"("id_paiement_fournisseur");

-- AddForeignKey
ALTER TABLE "lettres_de_change" ADD CONSTRAINT "lettres_de_change_id_paiement_client_fkey" FOREIGN KEY ("id_paiement_client") REFERENCES "paiements_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lettres_de_change" ADD CONSTRAINT "lettres_de_change_id_paiement_fournisseur_fkey" FOREIGN KEY ("id_paiement_fournisseur") REFERENCES "paiements_fournisseurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
