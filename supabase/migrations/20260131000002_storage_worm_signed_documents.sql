-- Migration WORM : les documents signés (dossier signed/) ne peuvent plus être modifiés ni supprimés.
-- Conformité : conservation intègre des preuves de signature.
-- RLS restreint les utilisateurs authentifiés ; le trigger ci-dessous impose le WORM pour tous (y compris service role).

-- 1. Exclure le dossier 'signed' des mises à jour (UPDATE) — WORM
DROP POLICY IF EXISTS "Users can update documents in their organization" ON storage.objects;
CREATE POLICY "Users can update documents in their organization"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (string_to_array(name, '/'))[1] <> 'signed'
  AND (
    (string_to_array(name, '/'))[1] = 'documents'
    AND (string_to_array(name, '/'))[2] IN (
      SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
    OR (string_to_array(name, '/'))[1] IN (
      SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND (string_to_array(name, '/'))[1] <> 'signed'
  AND (
    (string_to_array(name, '/'))[1] = 'documents'
    AND (string_to_array(name, '/'))[2] IN (
      SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
    OR (string_to_array(name, '/'))[1] IN (
      SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  )
);

-- 2. Exclure le dossier 'signed' des suppressions (DELETE) — WORM
DROP POLICY IF EXISTS "Users can delete documents in their organization" ON storage.objects;
CREATE POLICY "Users can delete documents in their organization"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (string_to_array(name, '/'))[1] <> 'signed'
  AND (
    (string_to_array(name, '/'))[1] = 'documents'
    AND (string_to_array(name, '/'))[2] IN (
      SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
    OR (string_to_array(name, '/'))[1] IN (
      SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  )
);

-- 2b. Politique explicite : aucun UPDATE sur le dossier signed (WITH CHECK false)
DROP POLICY IF EXISTS "Les documents signés sont immuables" ON storage.objects;
CREATE POLICY "Les documents signés sont immuables"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (string_to_array(name, '/'))[1] = 'signed'
)
WITH CHECK (false);

-- 2c. Aucune politique n'autorise le DELETE sur signed/ (exclusion déjà faite en 2.)

-- 3. Permettre l'INSERT dans signed/{org_id}/ (écriture une seule fois ; pas d'UPDATE ensuite)
DROP POLICY IF EXISTS "Users can upload to their organization folder" ON storage.objects;
CREATE POLICY "Users can upload to their organization folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (
    (string_to_array(name, '/'))[1] = 'documents'
    AND (string_to_array(name, '/'))[2] IN (
      SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
    OR (string_to_array(name, '/'))[1] IN (
      SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
    OR (
      (string_to_array(name, '/'))[1] = 'signed'
      AND (string_to_array(name, '/'))[2] IN (
        SELECT organization_id::text FROM public.users WHERE id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  )
);

-- 4. Permettre le SELECT sur signed/{org_id}/ (lecture des PDF signés)
DROP POLICY IF EXISTS "Users can view documents in their organization" ON storage.objects;
CREATE POLICY "Users can view documents in their organization"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    (string_to_array(name, '/'))[1] = 'documents'
    AND (string_to_array(name, '/'))[2] IN (
      SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
    OR (string_to_array(name, '/'))[1] IN (
      SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
    OR (
      (string_to_array(name, '/'))[1] = 'signed'
      AND (string_to_array(name, '/'))[2] IN (
        SELECT organization_id::text FROM public.users WHERE id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  )
);

-- 5. Trigger : interdire UPDATE et DELETE sur le dossier signed/ (WORM pour tous les rôles, y compris service role)
CREATE OR REPLACE FUNCTION public.storage_reject_signed_folder_mutations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE')
     AND OLD.bucket_id = 'documents'
     AND (string_to_array(OLD.name, '/'))[1] = 'signed'
  THEN
    RAISE EXCEPTION 'WORM: les objets dans documents/signed/ ne peuvent pas être modifiés ni supprimés.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_worm_signed_documents ON storage.objects;
CREATE TRIGGER enforce_worm_signed_documents
  BEFORE UPDATE OR DELETE ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.storage_reject_signed_folder_mutations();
