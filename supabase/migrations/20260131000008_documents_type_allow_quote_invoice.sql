-- Migration: Autoriser les types 'quote' et 'invoice' dans la table documents
-- Corrige l'erreur "documents_type_check" lors de l'envoi d'une demande de signature
-- depuis une facture ou un devis (send-from-invoice).

-- Supprimer la contrainte existante si elle existe
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_type_check;

-- Réajouter une contrainte qui inclut quote et invoice
ALTER TABLE public.documents
  ADD CONSTRAINT documents_type_check CHECK (
    type IN (
      'attestation',
      'certificate',
      'transcript',
      'report_card',
      'invoice',
      'receipt',
      'convocation',
      'contract',
      'convention',
      'quote',
      'other'
    )
  );

COMMENT ON COLUMN public.documents.type IS 'Type de document : attestation, certificate, transcript, report_card, invoice, receipt, convocation, contract, convention, quote, other';
