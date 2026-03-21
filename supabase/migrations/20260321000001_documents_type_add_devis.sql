-- Mettre à jour la contrainte CHECK sur documents.type pour inclure tous les types
-- définis dans DocumentType (lib/types/document-templates.ts), notamment 'devis'

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_check;

ALTER TABLE documents ADD CONSTRAINT documents_type_check CHECK (
  type IN (
    'convention',
    'facture',
    'devis',
    'convocation',
    'contrat',
    'attestation',
    'attestation_reussite',
    'certificat_realisation',
    'certificat_scolarite',
    'releve_notes',
    'attestation_entree',
    'reglement_interieur',
    'cgv',
    'programme',
    'attestation_assiduite',
    'livret_accueil',
    'emargement'
  )
);
