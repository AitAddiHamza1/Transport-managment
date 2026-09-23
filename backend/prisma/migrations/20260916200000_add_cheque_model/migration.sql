-- CreateTable
CREATE TABLE "cheques" (
    "id" SERIAL NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "serie" VARCHAR(50),
    "date_cheque" DATE NOT NULL,
    "banque" VARCHAR(150) NOT NULL,
    "agence" VARCHAR(150),
    "beneficiaire" VARCHAR(150) NOT NULL,
    "ville" VARCHAR(100),
    "id_paiement_client" INTEGER,
    "id_paiement_fournisseur" INTEGER,
    "chemin_fichier" VARCHAR(500),
    "nom_original" VARCHAR(255),
    "mime_type" VARCHAR(100),
    "taille_fichier" BIGINT,

    CONSTRAINT "cheques_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cheques_id_paiement_client_key" ON "cheques"("id_paiement_client");

-- CreateIndex
CREATE UNIQUE INDEX "cheques_id_paiement_fournisseur_key" ON "cheques"("id_paiement_fournisseur");

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_id_paiement_client_fkey" FOREIGN KEY ("id_paiement_client") REFERENCES "paiements_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_id_paiement_fournisseur_fkey" FOREIGN KEY ("id_paiement_fournisseur") REFERENCES "paiements_fournisseurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add XOR Check Constraint (exactly one payment owner required)
ALTER TABLE "cheques" ADD CONSTRAINT "chk_cheque_exactly_one_owner" CHECK (
    ("id_paiement_client" IS NOT NULL AND "id_paiement_fournisseur" IS NULL)
    OR
    ("id_paiement_client" IS NULL AND "id_paiement_fournisseur" IS NOT NULL)
);
