-- Supprimer la contrainte CHECK sur invoices.type
-- Les valeurs autorisées (tuition, registration, other) ne correspondent pas
-- aux valeurs insérées via l'API publique. La validation est assurée côté application.

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_type_check;
