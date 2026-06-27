-- Ajouter 'formulaire_inscription' au type enum document_type
-- À exécuter dans : Supabase Dashboard > SQL Editor

ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'formulaire_inscription';
