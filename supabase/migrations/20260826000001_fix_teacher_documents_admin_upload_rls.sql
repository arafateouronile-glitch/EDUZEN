-- L'upload d'un document par un admin/secrétaire pour le compte d'un enseignant
-- (target_teacher_user_id dans /api/teacher-documents/upload) échoue avec
-- "new row violates row-level security policy" : la policy INSERT existante
-- n'autorise que (storage.foldername(name))[1] = auth.uid()::text, donc un
-- admin ne peut écrire que dans son propre dossier, jamais dans celui d'un
-- enseignant. Contrairement aux policies SELECT/DELETE, aucune policy INSERT
-- n'accordait ce droit aux admins/secrétaires.

CREATE POLICY "Admins and secretaries can upload documents for teachers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'teacher-documents'
  AND EXISTS (
    SELECT 1 FROM public.users uploader
    WHERE uploader.id = auth.uid()
    AND uploader.role IN ('admin', 'secretary')
    AND EXISTS (
      SELECT 1 FROM public.users teacher
      WHERE teacher.id::text = (storage.foldername(storage.objects.name))[1]
      AND teacher.organization_id = uploader.organization_id
    )
  )
);

-- Même problème sur la table teacher_documents elle-même : seule la policy
-- "Teachers can create their own documents" existe pour l'INSERT, elle exige
-- teacher_id = auth.uid(). Aucune policy n'autorise un admin/secrétaire à
-- créer une ligne pour un enseignant de son organisation.
CREATE POLICY "Admins and secretaries can create documents for teachers"
ON public.teacher_documents FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.users uploader
    WHERE uploader.id = auth.uid()
    AND uploader.role IN ('admin', 'secretary')
    AND uploader.organization_id = teacher_documents.organization_id
  )
  AND EXISTS (
    SELECT 1 FROM public.users teacher
    WHERE teacher.id = teacher_documents.teacher_id
    AND teacher.organization_id = teacher_documents.organization_id
  )
);
