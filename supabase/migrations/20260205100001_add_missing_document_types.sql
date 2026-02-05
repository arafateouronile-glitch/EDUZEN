-- Migration: Ajouter les types de documents manquants à l'enum document_type
-- Date: 2026-02-05
-- Description: Ajoute les types livret_accueil, emargement, certificat_realisation et attestation

-- Ajouter les nouveaux types à l'enum document_type
DO $$
BEGIN
  -- Ajouter 'livret_accueil' s'il n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'livret_accueil'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'document_type')
  ) THEN
    ALTER TYPE document_type ADD VALUE 'livret_accueil';
  END IF;
END $$;

DO $$
BEGIN
  -- Ajouter 'emargement' s'il n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'emargement'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'document_type')
  ) THEN
    ALTER TYPE document_type ADD VALUE 'emargement';
  END IF;
END $$;

DO $$
BEGIN
  -- Ajouter 'certificat_realisation' s'il n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'certificat_realisation'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'document_type')
  ) THEN
    ALTER TYPE document_type ADD VALUE 'certificat_realisation';
  END IF;
END $$;

DO $$
BEGIN
  -- Ajouter 'attestation' s'il n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'attestation'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'document_type')
  ) THEN
    ALTER TYPE document_type ADD VALUE 'attestation';
  END IF;
END $$;

-- Commentaire pour documentation
COMMENT ON TYPE document_type IS 'Types de documents disponibles pour les modèles: convention, facture, devis, convocation, contrat, attestation_reussite, certificat_scolarite, releve_notes, attestation_entree, reglement_interieur, cgv, programme, attestation_assiduite, livret_accueil, emargement, certificat_realisation, attestation';
