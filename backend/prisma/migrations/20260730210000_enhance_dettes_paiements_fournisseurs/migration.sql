-- =====================================================================
--  Migration Phase 1A: Dettes & Paiements Fournisseurs Enhancements
--  Date: 2026-07-30
-- =====================================================================

-- Phase A: Pre-migration audit check
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM paiements_fournisseurs p 
    LEFT JOIN dettes_fournisseurs d ON d.nom_fournisseur = p.nom_fournisseur AND d.numero_facture = p.numero_facture 
    WHERE d.id IS NULL AND p.id IS NOT NULL AND (SELECT count(*) FROM paiements_fournisseurs) > 0
  ) THEN
    RAISE EXCEPTION 'Migration blocked: Historical payment records exist that cannot be deterministically matched to a single dette_fournisseur.';
  END IF;
END $$;

-- Phase B: Add nullable compatibility columns
ALTER TABLE dettes_fournisseurs
  ADD COLUMN IF NOT EXISTS numero_dette VARCHAR(30),
  ADD COLUMN IF NOT EXISTS reference_facture_fournisseur VARCHAR(60),
  ADD COLUMN IF NOT EXISTS id_fournisseur BIGINT,
  ADD COLUMN IF NOT EXISTS nom_fournisseur_snapshot VARCHAR(150),
  ADD COLUMN IF NOT EXISTS date_dette DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS delai_paiement_jours INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS cree_par_id BIGINT,
  ADD COLUMN IF NOT EXISTS cree_le TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS mis_a_jour_le TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS supprime_le TIMESTAMPTZ;

ALTER TABLE paiements_fournisseurs
  ADD COLUMN IF NOT EXISTS numero_paiement VARCHAR(30),
  ADD COLUMN IF NOT EXISTS id_dette_fournisseur BIGINT,
  ADD COLUMN IF NOT EXISTS montant NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS mode_paiement paiement_methode,
  ADD COLUMN IF NOT EXISTS reference_externe VARCHAR(80),
  ADD COLUMN IF NOT EXISTS notes VARCHAR(500),
  ADD COLUMN IF NOT EXISTS est_annule BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_annulation TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motif_annulation VARCHAR(255),
  ADD COLUMN IF NOT EXISTS annule_par_id BIGINT,
  ADD COLUMN IF NOT EXISTS cree_par_id BIGINT,
  ADD COLUMN IF NOT EXISTS cree_le TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS mis_a_jour_le TIMESTAMPTZ DEFAULT now();

-- Sequence tables
CREATE TABLE IF NOT EXISTS dette_fournisseur_sequences (
  annee INTEGER PRIMARY KEY,
  dernier_numero INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS paiement_fournisseur_sequences (
  annee INTEGER PRIMARY KEY,
  dernier_numero INTEGER NOT NULL DEFAULT 0
);

-- Phase C: Backfill Data for dettes_fournisseurs
UPDATE dettes_fournisseurs d
SET 
  reference_facture_fournisseur = COALESCE(d.reference_facture_fournisseur, d.numero_facture),
  date_dette = COALESCE(d.date_dette, COALESCE(d.date_facture, CURRENT_DATE)),
  delai_paiement_jours = COALESCE(d.delai_paiement_jours, COALESCE(d.delai_paiement, 30)),
  nom_fournisseur_snapshot = COALESCE(d.nom_fournisseur_snapshot, d.nom_fournisseur),
  id_fournisseur = COALESCE(d.id_fournisseur, f.id)
FROM fournisseurs f
WHERE f.nom_fournisseur = d.nom_fournisseur AND d.id_fournisseur IS NULL;

-- Backfill debt numbers for any existing rows
DO $$
DECLARE
  r RECORD;
  v_year INT;
  v_seq INT;
  v_num VARCHAR(30);
BEGIN
  FOR r IN SELECT id, date_dette, date_facture, cree_le FROM dettes_fournisseurs WHERE numero_dette IS NULL LOOP
    v_year := EXTRACT(YEAR FROM COALESCE(r.date_dette, COALESCE(r.date_facture, r.cree_le)));
    
    INSERT INTO dette_fournisseur_sequences (annee, dernier_numero)
    VALUES (v_year, 1)
    ON CONFLICT (annee) DO UPDATE SET dernier_numero = dette_fournisseur_sequences.dernier_numero + 1
    RETURNING dernier_numero INTO v_seq;
    
    v_num := 'DF-' || v_year || '-' || LPAD(v_seq::text, 6, '0');
    UPDATE dettes_fournisseurs SET numero_dette = v_num WHERE id = r.id;
  END LOOP;
END $$;

-- Backfill Data for paiements_fournisseurs
UPDATE paiements_fournisseurs p
SET 
  montant = COALESCE(p.montant, p.montant_paye),
  mode_paiement = COALESCE(p.mode_paiement, p.methode_paiement),
  reference_externe = COALESCE(p.reference_externe, p.reference),
  notes = COALESCE(p.notes, p.remarques),
  id_dette_fournisseur = COALESCE(p.id_dette_fournisseur, d.id)
FROM dettes_fournisseurs d
WHERE d.nom_fournisseur_snapshot = p.nom_fournisseur 
  AND d.reference_facture_fournisseur = p.numero_facture 
  AND p.id_dette_fournisseur IS NULL;

-- Backfill payment numbers for any existing rows
DO $$
DECLARE
  r RECORD;
  v_year INT;
  v_seq INT;
  v_num VARCHAR(30);
BEGIN
  FOR r IN SELECT id, date_paiement, cree_le FROM paiements_fournisseurs WHERE numero_paiement IS NULL LOOP
    v_year := EXTRACT(YEAR FROM COALESCE(r.date_paiement, r.cree_le));
    
    INSERT INTO paiement_fournisseur_sequences (annee, dernier_numero)
    VALUES (v_year, 1)
    ON CONFLICT (annee) DO UPDATE SET dernier_numero = paiement_fournisseur_sequences.dernier_numero + 1
    RETURNING dernier_numero INTO v_seq;
    
    v_num := 'PF-' || v_year || '-' || LPAD(v_seq::text, 6, '0');
    UPDATE paiements_fournisseurs SET numero_paiement = v_num WHERE id = r.id;
  END LOOP;
END $$;

-- Phase E: Convert generated date_echeance column to regular DATE
ALTER TABLE dettes_fournisseurs ADD COLUMN IF NOT EXISTS date_echeance_temp DATE;

UPDATE dettes_fournisseurs 
SET date_echeance_temp = COALESCE(date_echeance, COALESCE(date_dette, CURRENT_DATE) + COALESCE(delai_paiement_jours, 30));

ALTER TABLE dettes_fournisseurs DROP COLUMN IF EXISTS date_echeance;
ALTER TABLE dettes_fournisseurs RENAME COLUMN date_echeance_temp TO date_echeance;
ALTER TABLE dettes_fournisseurs DROP COLUMN IF EXISTS solde;

-- Phase F: Add foreign keys & mandatory transition trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_dettes_fournisseur_id') THEN
    ALTER TABLE dettes_fournisseurs ADD CONSTRAINT fk_dettes_fournisseur_id FOREIGN KEY (id_fournisseur) REFERENCES fournisseurs (id) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_paiements_dette_id') THEN
    ALTER TABLE paiements_fournisseurs ADD CONSTRAINT fk_paiements_dette_id FOREIGN KEY (id_dette_fournisseur) REFERENCES dettes_fournisseurs (id) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_dettes_user_cree') THEN
    ALTER TABLE dettes_fournisseurs ADD CONSTRAINT fk_dettes_user_cree FOREIGN KEY (cree_par_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_paiements_user_cree') THEN
    ALTER TABLE paiements_fournisseurs ADD CONSTRAINT fk_paiements_user_cree FOREIGN KEY (cree_par_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_paiements_user_annule') THEN
    ALTER TABLE paiements_fournisseurs ADD CONSTRAINT fk_paiements_user_annule FOREIGN KEY (annule_par_id) REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- Mandatory Transition Trigger for legacy fields synchronization
CREATE OR REPLACE FUNCTION sync_dette_legacy_fields()
RETURNS TRIGGER AS $$
DECLARE
  v_dette_id BIGINT;
  v_total_paye NUMERIC(14,2);
  v_montant_du NUMERIC(14,2);
  v_solde NUMERIC(14,2);
  v_date_echeance DATE;
  v_statut dette_statut;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_dette_id := OLD.id_dette_fournisseur;
  ELSE
    v_dette_id := NEW.id_dette_fournisseur;
  END IF;

  IF v_dette_id IS NOT NULL THEN
    SELECT COALESCE(SUM(montant), 0) INTO v_total_paye
    FROM paiements_fournisseurs
    WHERE id_dette_fournisseur = v_dette_id AND est_annule = false;

    SELECT montant_du, date_echeance INTO v_montant_du, v_date_echeance
    FROM dettes_fournisseurs
    WHERE id = v_dette_id;

    IF v_montant_du IS NOT NULL THEN
      v_solde := v_montant_du - v_total_paye;

      IF v_total_paye >= v_montant_du THEN
        v_statut := 'SOLDEE'::dette_statut;
      ELSIF v_solde > 0 AND CURRENT_DATE > v_date_echeance THEN
        v_statut := 'EN_RETARD'::dette_statut;
      ELSIF v_total_paye > 0 THEN
        v_statut := 'PARTIELLE'::dette_statut;
      ELSE
        v_statut := 'OUVERTE'::dette_statut;
      END IF;

      UPDATE dettes_fournisseurs
      SET 
        montant_paye = v_total_paye,
        statut = v_statut
      WHERE id = v_dette_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_dette_legacy ON paiements_fournisseurs;
CREATE TRIGGER trg_sync_dette_legacy
AFTER INSERT OR UPDATE OR DELETE ON paiements_fournisseurs
FOR EACH ROW EXECUTE FUNCTION sync_dette_legacy_fields();

-- Phase G: Make legacy columns nullable if not already
ALTER TABLE dettes_fournisseurs
  ALTER COLUMN numero_facture DROP NOT NULL,
  ALTER COLUMN date_facture DROP NOT NULL,
  ALTER COLUMN nom_fournisseur DROP NOT NULL;

ALTER TABLE paiements_fournisseurs
  ALTER COLUMN numero_facture DROP NOT NULL,
  ALTER COLUMN nom_fournisseur DROP NOT NULL,
  ALTER COLUMN methode_paiement DROP NOT NULL,
  ALTER COLUMN montant_paye DROP NOT NULL;

-- Phase H: Add indexes & check constraints
CREATE UNIQUE INDEX IF NOT EXISTS uq_dettes_numero_dette ON dettes_fournisseurs (numero_dette);
CREATE UNIQUE INDEX IF NOT EXISTS uq_paiements_numero_paiement ON paiements_fournisseurs (numero_paiement);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dettes_fournisseur_ref_active 
ON dettes_fournisseurs (id_fournisseur, reference_facture_fournisseur) 
WHERE reference_facture_fournisseur IS NOT NULL AND supprime_le IS NULL;

CREATE INDEX IF NOT EXISTS idx_dettes_id_fournisseur ON dettes_fournisseurs (id_fournisseur);
CREATE INDEX IF NOT EXISTS idx_dettes_date_echeance ON dettes_fournisseurs (date_echeance);
CREATE INDEX IF NOT EXISTS idx_dettes_supprime_le ON dettes_fournisseurs (supprime_le);

CREATE INDEX IF NOT EXISTS idx_paiements_id_dette ON paiements_fournisseurs (id_dette_fournisseur);
CREATE INDEX IF NOT EXISTS idx_paiements_date_paiement ON paiements_fournisseurs (date_paiement);
CREATE INDEX IF NOT EXISTS idx_paiements_est_annule ON paiements_fournisseurs (est_annule);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_dettes_montant_du') THEN
    ALTER TABLE dettes_fournisseurs ADD CONSTRAINT chk_dettes_montant_du CHECK (montant_du > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_dettes_delai_jours') THEN
    ALTER TABLE dettes_fournisseurs ADD CONSTRAINT chk_dettes_delai_jours CHECK (delai_paiement_jours >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_paiements_montant') THEN
    ALTER TABLE paiements_fournisseurs ADD CONSTRAINT chk_paiements_montant CHECK (montant > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_paiements_cancellation') THEN
    ALTER TABLE paiements_fournisseurs ADD CONSTRAINT chk_paiements_cancellation CHECK (
      (est_annule = false AND date_annulation IS NULL AND motif_annulation IS NULL AND annule_par_id IS NULL) OR
      (est_annule = true AND date_annulation IS NOT NULL AND motif_annulation IS NOT NULL)
    );
  END IF;
END $$;
