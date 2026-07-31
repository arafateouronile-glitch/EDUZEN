-- Migration: Support des avoirs (credit notes) sur les factures
-- Date: 2026-08-01
--
-- Un avoir est enregistré comme une ligne dans `invoices` (même mécanisme
-- que factures/devis, qui ont déjà des séquences de numérotation séparées
-- FAC-YYYY-NNN / DEV-YYYY-NNN — l'avoir obtient sa propre séquence AVO-YYYY-NNN
-- via InvoiceService), avec :
--   - document_type = 'credit_note' (nouvelle valeur, distincte de 'invoice'
--     pour ne pas polluer les listes/statistiques de factures normales)
--   - original_invoice_id : lien réel vers la facture créditée (remplace le
--     brouillon précédent qui tentait d'utiliser une colonne `metadata`
--     inexistante sur `invoices`, cf. app/(dashboard)/dashboard/payments/[id]/page.tsx)
--   - amount/tax_amount/total_amount négatifs

-- 1) Élargir la contrainte CHECK sur document_type (nom auto-généré par
-- Postgres lors de sa création initiale, on le retrouve dynamiquement)
DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT pgc.conname
    FROM pg_constraint pgc
    JOIN pg_class rel ON rel.oid = pgc.conrelid
    WHERE rel.relname = 'invoices'
      AND pgc.contype = 'c'
      AND pg_get_constraintdef(pgc.oid) LIKE '%document_type%'
  LOOP
    EXECUTE format('ALTER TABLE invoices DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE invoices ADD CONSTRAINT invoices_document_type_check
  CHECK (document_type IN ('quote', 'invoice', 'credit_note'));

-- 2) Lien vers la facture créditée
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS original_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_original_invoice_id ON invoices(original_invoice_id);

COMMENT ON COLUMN invoices.original_invoice_id IS
  'Pour un avoir (document_type=credit_note) : facture créditée. NULL sinon.';
