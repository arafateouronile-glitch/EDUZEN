-- Supprimer la contrainte CHECK sur documents.type
-- La table contient des valeurs historiques en anglais (report_card, certificate, invoice, quote...)
-- et des valeurs françaises (convention, facture, devis, attestation...).
-- La validation du type est assurée côté application (TypeScript).

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_check;
