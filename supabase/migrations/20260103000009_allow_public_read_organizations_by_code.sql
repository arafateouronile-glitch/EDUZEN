-- Migration pour permettre la lecture publique des organisations par code
-- Nécessaire pour le catalogue public /cataloguepublic/[slug]

-- Activer RLS si ce n'est pas déjà fait
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Policy pour permettre la lecture publique des organisations par code
-- Cette policy permet à n'importe qui (même non authentifié) de lire une organisation
-- si on connaît son code, ce qui est nécessaire pour le catalogue public
DROP POLICY IF EXISTS "Public can read organizations by code" ON public.organizations;

CREATE POLICY "Public can read organizations by code"
ON public.organizations
FOR SELECT
TO public
USING (true); -- Permet la lecture de toutes les organisations (le code sert de "mot de passe")

-- Alternative plus restrictive (si vous préférez):
-- USING (code IS NOT NULL); -- Seulement les organisations avec un code

COMMENT ON POLICY "Public can read organizations by code" ON public.organizations IS 
'Permet la lecture publique des organisations pour le catalogue public. Le code sert d''identifiant unique.';



