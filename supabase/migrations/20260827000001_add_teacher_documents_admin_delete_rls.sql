-- La suppression d'un document par un admin/secrétaire échoue avec "new row
-- violates row-level security policy" (en réalité une absence de ligne
-- supprimée faute de policy) : seule "Teachers can delete their own
-- documents" existe sur public.teacher_documents (teacher_id = auth.uid()).
-- Contrairement au bucket storage 'teacher-documents' qui a déjà une policy
-- DELETE admin/secrétaire, la table elle-même n'en a jamais eu.

CREATE POLICY "Admins and secretaries can delete teacher documents"
ON public.teacher_documents FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'secretary')
    AND organization_id = teacher_documents.organization_id
  )
);
