-- CreateEnum if not exists
DO $$ BEGIN
    CREATE TYPE "versement_employe_type" AS ENUM ('SALAIRE', 'PRIME', 'GLOBAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable if column does not exist
DO $$ BEGIN
    ALTER TABLE "versements_employes" ADD COLUMN "type_versement" "versement_employe_type" NOT NULL DEFAULT 'SALAIRE';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- CreateTable if not exists
CREATE TABLE IF NOT EXISTS "primes_employes" (
    "id" SERIAL NOT NULL,
    "id_paiement_employe" INTEGER NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "date_prime" DATE NOT NULL,
    "motif" VARCHAR(255),
    "cree_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "primes_employes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "primes_employes_id_paiement_employe_idx" ON "primes_employes"("id_paiement_employe");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "primes_employes_date_prime_idx" ON "primes_employes"("date_prime");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "primes_employes" ADD CONSTRAINT "primes_employes_id_paiement_employe_fkey" FOREIGN KEY ("id_paiement_employe") REFERENCES "paiements_employes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
