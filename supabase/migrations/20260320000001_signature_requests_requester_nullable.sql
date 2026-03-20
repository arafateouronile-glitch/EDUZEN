-- Rendre requester_id nullable pour permettre les demandes de signature
-- créées via API key (sans session utilisateur)
ALTER TABLE signature_requests ALTER COLUMN requester_id DROP NOT NULL;
