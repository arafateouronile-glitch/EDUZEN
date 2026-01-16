-- =============================================
-- Table session_courses : liaison session ↔ cours e-learning
-- Permet d'assigner des séquences e-learning aux sessions
-- =============================================

CREATE TABLE IF NOT EXISTS public.session_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT TRUE,
  due_date DATE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte d'unicité : un cours ne peut être assigné qu'une fois par session
  UNIQUE(session_id, course_id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_session_courses_session_id ON public.session_courses(session_id);
CREATE INDEX IF NOT EXISTS idx_session_courses_course_id ON public.session_courses(course_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_session_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_session_courses_updated_at ON public.session_courses;
CREATE TRIGGER trigger_session_courses_updated_at
  BEFORE UPDATE ON public.session_courses
  FOR EACH ROW
  EXECUTE FUNCTION update_session_courses_updated_at();

-- RLS Policies
ALTER TABLE public.session_courses ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir les cours assignés aux sessions de leur organisation
DROP POLICY IF EXISTS "Users can view session courses in their organization" ON public.session_courses;
CREATE POLICY "Users can view session courses in their organization"
  ON public.session_courses FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.sessions 
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

-- Les admins/formateurs peuvent gérer les cours de session
DROP POLICY IF EXISTS "Admins can manage session courses" ON public.session_courses;
CREATE POLICY "Admins can manage session courses"
  ON public.session_courses FOR ALL
  USING (
    session_id IN (
      SELECT id FROM public.sessions 
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'secretary', 'teacher')
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.sessions 
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'secretary', 'teacher')
  );

-- Commentaires
COMMENT ON TABLE public.session_courses IS 'Liaison entre sessions de formation et cours e-learning';
COMMENT ON COLUMN public.session_courses.is_required IS 'Indique si le cours est obligatoire pour les apprenants de la session';
COMMENT ON COLUMN public.session_courses.due_date IS 'Date limite pour compléter le cours';





