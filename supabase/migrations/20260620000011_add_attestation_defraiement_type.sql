-- Ajouter 'attestation_defraiement' au type enum document_type
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'attestation_defraiement';
