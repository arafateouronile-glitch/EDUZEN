-- Restreint un enseignant aux instances d'évaluation / réponses des sessions
-- qui lui sont assignées (via grades.session_id). Les modèles d'évaluation
-- eux-mêmes (evaluation_templates/evaluation_template_questions) restent
-- org-larges : ce sont des bibliothèques réutilisables, pas des données de
-- session — aucun changement nécessaire sur ces deux tables.

-- evaluation_template_instances

DROP POLICY IF EXISTS "Instances lisibles via grade" ON public.evaluation_template_instances;
CREATE POLICY "Instances lisibles via grade" ON public.evaluation_template_instances
  FOR SELECT USING (
    grade_id IN (
      SELECT id FROM public.grades
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
        AND (
          (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
          OR EXISTS (SELECT 1 FROM public.session_teachers st WHERE st.session_id = grades.session_id AND st.teacher_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = grades.session_id AND s.teacher_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Instances modifiables via grade" ON public.evaluation_template_instances;
CREATE POLICY "Instances modifiables via grade" ON public.evaluation_template_instances
  FOR ALL USING (
    grade_id IN (
      SELECT id FROM public.grades
      WHERE organization_id IN (
        SELECT organization_id FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'teacher')
      )
      AND (
        (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
        OR EXISTS (SELECT 1 FROM public.session_teachers st WHERE st.session_id = grades.session_id AND st.teacher_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = grades.session_id AND s.teacher_id = auth.uid())
      )
    )
  );

-- evaluation_responses

DROP POLICY IF EXISTS "Réponses lisibles via instance" ON public.evaluation_responses;
CREATE POLICY "Réponses lisibles via instance" ON public.evaluation_responses
  FOR SELECT USING (
    instance_id IN (
      SELECT id FROM public.evaluation_template_instances
      WHERE grade_id IN (
        SELECT id FROM public.grades
        WHERE (
          organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
          OR student_id = auth.uid()
        )
        AND (
          (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
          OR EXISTS (SELECT 1 FROM public.session_teachers st WHERE st.session_id = grades.session_id AND st.teacher_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = grades.session_id AND s.teacher_id = auth.uid())
          OR grades.student_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Réponses modifiables par étudiant ou enseignant" ON public.evaluation_responses;
CREATE POLICY "Réponses modifiables par étudiant ou enseignant" ON public.evaluation_responses
  FOR ALL USING (
    instance_id IN (
      SELECT id FROM public.evaluation_template_instances
      WHERE grade_id IN (
        SELECT id FROM public.grades
        WHERE (
          organization_id IN (
            SELECT organization_id FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'teacher')
          )
          OR student_id = auth.uid()
        )
        AND (
          (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
          OR EXISTS (SELECT 1 FROM public.session_teachers st WHERE st.session_id = grades.session_id AND st.teacher_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = grades.session_id AND s.teacher_id = auth.uid())
          OR grades.student_id = auth.uid()
        )
      )
    )
  );
