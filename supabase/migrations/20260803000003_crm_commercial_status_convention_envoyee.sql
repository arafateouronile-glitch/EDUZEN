-- Ajoute "convention_envoyee" aux statuts commerciaux autorisés, pour symétrie
-- avec le cycle des devis (envoyé/signé) : Nouveau → Devis envoyé → Devis signé
-- → Convention envoyée → Convention signée (En réflexion / Perdu restent manuels).

DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT pgc.conname
    FROM pg_constraint pgc
    JOIN pg_class rel ON rel.oid = pgc.conrelid
    WHERE rel.relname = 'crm_prospect_tracking'
      AND pgc.contype = 'c'
      AND pg_get_constraintdef(pgc.oid) LIKE '%commercial_status%'
  LOOP
    EXECUTE format('ALTER TABLE crm_prospect_tracking DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE public.crm_prospect_tracking ADD CONSTRAINT crm_prospect_tracking_commercial_status_check
  CHECK (commercial_status IN ('devis_envoye', 'en_reflexion', 'devis_signe', 'convention_envoyee', 'convention_signee', 'perdu'));
