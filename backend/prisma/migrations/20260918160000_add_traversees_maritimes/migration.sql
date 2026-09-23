-- CreateTable
CREATE TABLE "traversees_maritimes" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "id_voyage" INTEGER,
    "immatriculation" VARCHAR(20) NOT NULL,
    "id_conducteur" INTEGER NOT NULL,
    "date_traversee" DATE NOT NULL,
    "bateau" VARCHAR(100) NOT NULL,
    "lieu_embarquement" VARCHAR(50) NOT NULL,
    "prix" DECIMAL(14,2) NOT NULL,
    "devise" VARCHAR(3) NOT NULL DEFAULT 'MAD',
    "chemin_fichier" VARCHAR(500),
    "nom_original" VARCHAR(255),
    "mime_type" VARCHAR(100),
    "taille_fichier" BIGINT,
    "cree_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mis_a_jour_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supprime_le" TIMESTAMPTZ(6),

    CONSTRAINT "traversees_maritimes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "traversees_maritimes_id_voyage_key" ON "traversees_maritimes"("id_voyage");

-- CreateIndex
CREATE INDEX "traversees_maritimes_company_id_idx" ON "traversees_maritimes"("company_id");

-- CreateIndex
CREATE INDEX "traversees_maritimes_immatriculation_idx" ON "traversees_maritimes"("immatriculation");

-- CreateIndex
CREATE INDEX "traversees_maritimes_id_conducteur_idx" ON "traversees_maritimes"("id_conducteur");

-- CreateIndex
CREATE INDEX "traversees_maritimes_date_traversee_idx" ON "traversees_maritimes"("date_traversee");

-- CreateIndex
CREATE INDEX "traversees_maritimes_lieu_embarquement_idx" ON "traversees_maritimes"("lieu_embarquement");

-- CreateIndex
CREATE INDEX "traversees_maritimes_supprime_le_idx" ON "traversees_maritimes"("supprime_le");

-- AddForeignKey
ALTER TABLE "traversees_maritimes" ADD CONSTRAINT "traversees_maritimes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traversees_maritimes" ADD CONSTRAINT "traversees_maritimes_id_voyage_fkey" FOREIGN KEY ("id_voyage") REFERENCES "voyages"("id_voyage") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traversees_maritimes" ADD CONSTRAINT "traversees_maritimes_company_id_immatriculation_fkey" FOREIGN KEY ("company_id", "immatriculation") REFERENCES "vehicules"("company_id", "immatriculation") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traversees_maritimes" ADD CONSTRAINT "traversees_maritimes_id_conducteur_fkey" FOREIGN KEY ("id_conducteur") REFERENCES "conducteurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
