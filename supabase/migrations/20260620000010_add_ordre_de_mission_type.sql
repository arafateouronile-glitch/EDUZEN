-- Ajouter 'ordre_de_mission' au type enum document_type
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'ordre_de_mission';
