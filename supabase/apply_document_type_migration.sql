-- Migration: Ajouter document_type pour distinguer devis (quote) et facture (invoice)
-- À exécuter directement dans le Supabase Dashboard > SQL Editor

-- Ajouter la colonne document_type si elle n'existe pas déjà
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'document_type'
  ) THEN
    ALTER TABLE public.invoices 
    ADD COLUMN document_type TEXT DEFAULT 'invoice' CHECK (document_type IN ('quote', 'invoice'));
    
    -- Mettre à jour les factures existantes pour qu'elles soient des factures
    UPDATE public.invoices SET document_type = 'invoice' WHERE document_type IS NULL;
    
    -- Créer un index pour améliorer les performances
    CREATE INDEX IF NOT EXISTS idx_invoices_document_type ON public.invoices(document_type);
    
    RAISE NOTICE 'Colonne document_type ajoutée avec succès à la table invoices';
  ELSE
    RAISE NOTICE 'La colonne document_type existe déjà dans la table invoices';
  END IF;
END $$;

-- Vérification
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'invoices' 
  AND column_name = 'document_type';
























