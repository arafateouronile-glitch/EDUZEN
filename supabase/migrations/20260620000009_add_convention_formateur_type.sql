-- Ajouter 'convention_formateur' au type enum document_type
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'convention_formateur';
