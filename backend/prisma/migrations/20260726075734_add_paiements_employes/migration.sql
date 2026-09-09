-- CreateTable
CREATE TABLE "paiements_employes" (
    "id" SERIAL NOT NULL,
    "numero_paiement" VARCHAR(30) NOT NULL,
    "id_employe" INTEGER NOT NULL,
    "periode" VARCHAR(7) NOT NULL,
    "salaire_reference" DECIMAL(14,2) NOT NULL,
    "montant_du" DECIMAL(14,2) NOT NULL,
    "motif_ajustement" VARCHAR(255),
    "notes" VARCHAR(500),
    "cree_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mis_a_jour_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supprime_le" TIMESTAMPTZ(6),

    CONSTRAINT "paiements_employes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versements_employes" (
    "id" SERIAL NOT NULL,
    "id_paiement_employe" INTEGER NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "date_versement" DATE NOT NULL,
    "mode_paiement" "paiement_mode_employe" NOT NULL,
    "reference_externe" VARCHAR(80),
    "notes" VARCHAR(500),
    "est_annule" BOOLEAN NOT NULL DEFAULT false,
    "date_annulation" TIMESTAMPTZ(6),
    "motif_annulation" VARCHAR(255),
    "cree_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mis_a_jour_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "versements_employes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiement_employe_sequences" (
    "annee" INTEGER NOT NULL,
    "dernier_numero" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "paiement_employe_sequences_pkey" PRIMARY KEY ("annee")
);

-- CreateIndex
CREATE UNIQUE INDEX "paiements_employes_numero_paiement_key" ON "paiements_employes"("numero_paiement");

-- CreateIndex
CREATE INDEX "paiements_employes_id_employe_idx" ON "paiements_employes"("id_employe");

-- CreateIndex
CREATE INDEX "paiements_employes_periode_idx" ON "paiements_employes"("periode");

-- CreateIndex
CREATE INDEX "paiements_employes_supprime_le_idx" ON "paiements_employes"("supprime_le");

-- CreateIndex
CREATE INDEX "versements_employes_id_paiement_employe_idx" ON "versements_employes"("id_paiement_employe");

-- CreateIndex
CREATE INDEX "versements_employes_date_versement_idx" ON "versements_employes"("date_versement");

-- CreateIndex
CREATE INDEX "versements_employes_est_annule_idx" ON "versements_employes"("est_annule");

-- Partial Unique Index (active obligation per employee-period)
CREATE UNIQUE INDEX "unique_active_employe_periode" ON "paiements_employes" ("id_employe", "periode") WHERE "supprime_le" IS NULL;

-- Check Constraints
ALTER TABLE "paiements_employes" ADD CONSTRAINT "check_salaire_reference_positive" CHECK ("salaire_reference" > 0);
ALTER TABLE "paiements_employes" ADD CONSTRAINT "check_montant_du_positive" CHECK ("montant_du" > 0);
ALTER TABLE "versements_employes" ADD CONSTRAINT "check_versement_montant_positive" CHECK ("montant" > 0);

-- Foreign Keys
ALTER TABLE "paiements_employes" ADD CONSTRAINT "paiements_employes_id_employe_fkey" FOREIGN KEY ("id_employe") REFERENCES "employes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "versements_employes" ADD CONSTRAINT "versements_employes_id_paiement_employe_fkey" FOREIGN KEY ("id_paiement_employe") REFERENCES "paiements_employes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
