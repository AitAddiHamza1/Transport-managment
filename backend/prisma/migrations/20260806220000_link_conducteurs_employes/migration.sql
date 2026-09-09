ALTER TABLE "conducteurs" ADD COLUMN IF NOT EXISTS "id_employe" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conducteurs_id_employe_fkey'
  ) THEN
    ALTER TABLE "conducteurs"
      ADD CONSTRAINT "conducteurs_id_employe_fkey"
      FOREIGN KEY ("id_employe")
      REFERENCES "employes"("id")
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "conducteurs_id_employe_unique"
ON "conducteurs"("id_employe")
WHERE "id_employe" IS NOT NULL;
