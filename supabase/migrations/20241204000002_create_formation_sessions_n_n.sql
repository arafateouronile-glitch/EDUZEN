-- Migration pour passer à un modèle N:N entre Formations et Sessions
-- Logique métier :
-- - Programmes : contenus de formation (indépendants)
-- - Sessions : instances de formation (peuvent avoir plusieurs programmes)
-- - Formations : parcours de formation (peuvent avoir plusieurs sessions)
-- 
-- Relations N:N :
-- - session_programs : Session ↔ Programme (N:N) - existe déjà
-- - formation_sessions : Formation ↔ Session (N:N) - à créer

-- ============================================================================
-- ÉTAPE 1 : Créer la table de liaison formation_sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.formation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id UUID NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0, -- Pour ordonner les sessions dans une formation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(formation_id, session_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_formation_sessions_formation_id ON public.formation_sessions(formation_id);
CREATE INDEX IF NOT EXISTS idx_formation_sessions_session_id ON public.formation_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_formation_sessions_organization_id ON public.formation_sessions(organization_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_formation_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_formation_sessions_updated_at ON public.formation_sessions;
CREATE TRIGGER update_formation_sessions_updated_at
  BEFORE UPDATE ON public.formation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_formation_sessions_updated_at();

-- ============================================================================
-- ÉTAPE 2 : Activer RLS et créer les politiques
-- ============================================================================

ALTER TABLE public.formation_sessions ENABLE ROW LEVEL SECURITY;

-- Politique SELECT
CREATE POLICY "Users can view formation_sessions of their organization"
  ON public.formation_sessions
  FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- Politique INSERT
CREATE POLICY "Users can create formation_sessions for their organization"
  ON public.formation_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.formations WHERE id = formation_sessions.formation_id AND organization_id = formation_sessions.organization_id
    )
    AND EXISTS (
      SELECT 1 FROM public.sessions s 
      INNER JOIN public.formations f ON f.id = s.formation_id 
      WHERE s.id = formation_sessions.session_id AND f.organization_id = formation_sessions.organization_id
    )
  );

-- Politique UPDATE
CREATE POLICY "Users can update formation_sessions of their organization"
  ON public.formation_sessions
  FOR UPDATE
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- Politique DELETE
CREATE POLICY "Users can delete formation_sessions of their organization"
  ON public.formation_sessions
  FOR DELETE
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- ============================================================================
-- ÉTAPE 3 : Migrer les données existantes (formation_id dans sessions)
-- ============================================================================

-- Copier les relations existantes vers la nouvelle table de liaison
INSERT INTO public.formation_sessions (formation_id, session_id, organization_id)
SELECT 
  s.formation_id,
  s.id AS session_id,
  f.organization_id
FROM public.sessions s
INNER JOIN public.formations f ON f.id = s.formation_id
WHERE s.formation_id IS NOT NULL
ON CONFLICT (formation_id, session_id) DO NOTHING;

-- ============================================================================
-- ÉTAPE 4 : Rendre formation_id optionnel dans sessions
-- ============================================================================

-- Modifier la contrainte pour permettre NULL (session sans formation directe)
ALTER TABLE public.sessions 
  ALTER COLUMN formation_id DROP NOT NULL;

-- Ajouter organization_id directement dans sessions pour faciliter les requêtes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    
    -- Remplir organization_id depuis formations
    UPDATE public.sessions s
    SET organization_id = f.organization_id
    FROM public.formations f
    WHERE s.formation_id = f.id AND s.organization_id IS NULL;
  END IF;
END $$;

-- Index pour organization_id
CREATE INDEX IF NOT EXISTS idx_sessions_organization ON public.sessions(organization_id);

-- ============================================================================
-- ÉTAPE 5 : Mettre à jour les politiques RLS de sessions
-- ============================================================================

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view sessions in their organization" ON public.sessions;
DROP POLICY IF EXISTS "Users can create sessions in their organization" ON public.sessions;
DROP POLICY IF EXISTS "Users can update sessions in their organization" ON public.sessions;
DROP POLICY IF EXISTS "Users can delete sessions in their organization" ON public.sessions;

-- Recréer avec organization_id direct
CREATE POLICY "Users can view sessions in their organization"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR formation_id IN (
      SELECT id FROM public.formations
      WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can create sessions in their organization"
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR formation_id IN (
      SELECT id FROM public.formations
      WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update sessions in their organization"
  ON public.sessions FOR UPDATE
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR formation_id IN (
      SELECT id FROM public.formations
      WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR formation_id IN (
      SELECT id FROM public.formations
      WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can delete sessions in their organization"
  ON public.sessions FOR DELETE
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR formation_id IN (
      SELECT id FROM public.formations
      WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

COMMENT ON TABLE public.formation_sessions IS 'Table de liaison N:N entre formations et sessions. Une formation peut inclure plusieurs sessions, une session peut appartenir à plusieurs formations.';
COMMENT ON COLUMN public.formation_sessions.formation_id IS 'ID de la formation';
COMMENT ON COLUMN public.formation_sessions.session_id IS 'ID de la session';
COMMENT ON COLUMN public.formation_sessions.organization_id IS 'ID de l''organisation (pour RLS)';
COMMENT ON COLUMN public.formation_sessions.order_index IS 'Ordre de la session dans la formation';

COMMENT ON TABLE public.session_programs IS 'Table de liaison N:N entre sessions et programmes. Une session peut contenir plusieurs programmes, un programme peut être dans plusieurs sessions.';





