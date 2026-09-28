-- Migration: Customer Payments Edit & Cancellation Audit Fields
-- Adds est_annule, date_annulation, motif_annulation, annule_par_id, cree_par_id, cree_le, mis_a_jour_le to paiements_clients

ALTER TABLE "paiements_clients"
  ADD COLUMN IF NOT EXISTS "est_annule" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "date_annulation" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "motif_annulation" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "annule_par_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "cree_par_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "cree_le" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "mis_a_jour_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS "paiements_clients_est_annule_idx" ON "paiements_clients"("est_annule");
CREATE INDEX IF NOT EXISTS "paiements_clients_cree_le_idx" ON "paiements_clients"("cree_le");

-- Add Foreign Key Constraints to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'paiements_clients_cree_par_id_fkey'
  ) THEN
    ALTER TABLE "paiements_clients"
      ADD CONSTRAINT "paiements_clients_cree_par_id_fkey"
      FOREIGN KEY ("cree_par_id") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'paiements_clients_annule_par_id_fkey'
  ) THEN
    ALTER TABLE "paiements_clients"
      ADD CONSTRAINT "paiements_clients_annule_par_id_fkey"
      FOREIGN KEY ("annule_par_id") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;
