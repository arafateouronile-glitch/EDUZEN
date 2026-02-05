-- Correction RLS session_slots : permettre créneaux pour sessions avec formation ET sessions indépendantes (sans formation)
-- 1. Utiliser public.users au lieu de users
-- 2. Inclure les sessions sans formation (formation_id IS NULL, organization_id sur sessions)
-- Sinon la génération automatique des créneaux renvoie 403 pour les sessions indépendantes.

DROP POLICY IF EXISTS "Users can view session_slots of their organization" ON public.session_slots;
CREATE POLICY "Users can view session_slots of their organization"
  ON public.session_slots
  FOR SELECT
  USING (
    session_id IN (
      SELECT s.id FROM public.sessions s
      WHERE (
        (s.formation_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.formations f
          WHERE f.id = s.formation_id
          AND f.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
        ))
        OR
        (s.formation_id IS NULL AND s.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "Users can create session_slots for their organization" ON public.session_slots;
CREATE POLICY "Users can create session_slots for their organization"
  ON public.session_slots
  FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT s.id FROM public.sessions s
      WHERE (
        (s.formation_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.formations f
          WHERE f.id = s.formation_id
          AND f.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
        ))
        OR
        (s.formation_id IS NULL AND s.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "Users can update session_slots of their organization" ON public.session_slots;
CREATE POLICY "Users can update session_slots of their organization"
  ON public.session_slots
  FOR UPDATE
  USING (
    session_id IN (
      SELECT s.id FROM public.sessions s
      WHERE (
        (s.formation_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.formations f
          WHERE f.id = s.formation_id
          AND f.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
        ))
        OR
        (s.formation_id IS NULL AND s.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()))
      )
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT s.id FROM public.sessions s
      WHERE (
        (s.formation_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.formations f
          WHERE f.id = s.formation_id
          AND f.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
        ))
        OR
        (s.formation_id IS NULL AND s.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete session_slots of their organization" ON public.session_slots;
CREATE POLICY "Users can delete session_slots of their organization"
  ON public.session_slots
  FOR DELETE
  USING (
    session_id IN (
      SELECT s.id FROM public.sessions s
      WHERE (
        (s.formation_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.formations f
          WHERE f.id = s.formation_id
          AND f.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
        ))
        OR
        (s.formation_id IS NULL AND s.organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()))
      )
    )
  );
