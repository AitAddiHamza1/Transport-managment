-- AlterTable
ALTER TABLE "lettres_de_change" ADD CONSTRAINT "chk_lettre_de_change_exactly_one_owner" CHECK (
    ("id_paiement_client" IS NOT NULL AND "id_paiement_fournisseur" IS NULL)
    OR
    ("id_paiement_client" IS NULL AND "id_paiement_fournisseur" IS NOT NULL)
);
