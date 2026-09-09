-- Migration: 20260802170000_add_kilometrage_numero_bon_to_bons_carburant

ALTER TABLE "bons_carburant"
ADD COLUMN IF NOT EXISTS "numero_bon" VARCHAR(50);

ALTER TABLE "bons_carburant"
ADD COLUMN IF NOT EXISTS "kilometrage" BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS
"idx_boncarb_numero_bon_unique"
ON "bons_carburant" (UPPER("numero_bon"))
WHERE "numero_bon" IS NOT NULL;

CREATE INDEX IF NOT EXISTS
"idx_boncarb_kilometrage"
ON "bons_carburant" ("kilometrage");
