-- Add formulaire_inscription to document_type enum
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'formulaire_inscription';
