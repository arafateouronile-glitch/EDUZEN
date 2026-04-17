-- Met à jour la devise des organisations qui ont encore XOF par défaut vers EUR
-- Seules les orgs qui n'ont jamais modifié leur devise manuellement sont concernées
UPDATE public.organizations
SET currency = 'EUR', updated_at = now()
WHERE currency = 'XOF';
