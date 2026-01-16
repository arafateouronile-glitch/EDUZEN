-- Migration pour distinguer Programmes, Formations et Sessions
-- Structure : Programme > Formation > Session

-- ============================================================================
-- ÉTAPE 1 : Vérifier si on doit renommer la table "programs" actuelle
-- ============================================================================
-- La table "programs" actuelle contient en fait des formations
-- On la renomme d'abord pour libérer le nom "programs"

DO $$
BEGIN
  -- Vérifier si la table programs existe et si elle n'est pas déjà renommée
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'programs' AND table_schema = 'public') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'formations_temp' AND table_schema = 'public') THEN
    ALTER TABLE public.programs RENAME TO formations_temp;
    RAISE NOTICE 'Table programs renommée en formations_temp';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 2 : Créer la nouvelle table "programs" pour les vrais programmes
-- ============================================================================

-- Créer la table programs seulement si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter la contrainte unique seulement si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'programs_organization_code_unique'
  ) THEN
    ALTER TABLE public.programs 
      ADD CONSTRAINT programs_organization_code_unique UNIQUE (organization_id, code);
  END IF;
END $$;

-- Créer les index seulement s'ils n'existent pas
CREATE INDEX IF NOT EXISTS idx_programs_organization ON public.programs(organization_id);
CREATE INDEX IF NOT EXISTS idx_programs_active ON public.programs(is_active);

-- ============================================================================
-- ÉTAPE 3 : Créer la table "formations" à partir de "formations_temp"
-- ============================================================================
-- Créer la table formations avec tous les champs de formations_temp + program_id

CREATE TABLE IF NOT EXISTS public.formations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT,
  photo_url TEXT,
  category TEXT,
  description TEXT,
  program_version TEXT,
  version_date DATE,
  duration_hours INTEGER,
  duration_days INTEGER,
  duration_unit TEXT CHECK (duration_unit IN ('hours', 'days')),
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XOF',
  payment_plan TEXT NOT NULL DEFAULT 'full' CHECK (payment_plan IN ('full', 'installment', 'custom')),
  prerequisites TEXT,
  capacity_max INTEGER,
  age_min INTEGER,
  age_max INTEGER,
  published_online BOOLEAN DEFAULT FALSE,
  eligible_cpf BOOLEAN DEFAULT FALSE,
  cpf_code TEXT,
  modalities TEXT,
  training_action_type TEXT,
  pedagogical_objectives TEXT,
  learner_profile TEXT,
  training_content TEXT,
  execution_follow_up TEXT,
  certification_modalities TEXT,
  quality TEXT,
  accounting_product_config TEXT,
  edof_export_fields JSONB,
  competence_domains TEXT,
  certification_issued BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter la contrainte unique seulement si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'formations_organization_code_unique'
  ) THEN
    ALTER TABLE public.formations 
      ADD CONSTRAINT formations_organization_code_unique UNIQUE (organization_id, code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_formations_organization ON public.formations(organization_id);
CREATE INDEX IF NOT EXISTS idx_formations_program ON public.formations(program_id);
CREATE INDEX IF NOT EXISTS idx_formations_active ON public.formations(is_active);

-- ============================================================================
-- ÉTAPE 4 : Migrer les données de "formations_temp" vers "formations"
-- ============================================================================

-- Copier toutes les données de formations_temp vers formations (sans program_id pour l'instant)
-- Ajouter aussi les nouveaux champs si la table formations_temp les a
DO $$
BEGIN
  -- Vérifier si formations_temp existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'formations_temp') THEN
    -- Insérer les données avec tous les champs disponibles
    INSERT INTO public.formations (
      id,
      organization_id,
      code,
      name,
      description,
      duration_hours,
      price,
      currency,
      payment_plan,
      prerequisites,
      capacity_max,
      age_min,
      age_max,
      certification_issued,
      is_active,
      created_at,
      updated_at,
      -- Nouveaux champs si ils existent
      subtitle,
      photo_url,
      category,
      program_version,
      version_date,
      duration_days,
      duration_unit,
      published_online,
      eligible_cpf,
      cpf_code,
      modalities,
      training_action_type,
      pedagogical_objectives,
      learner_profile,
      training_content,
      execution_follow_up,
      certification_modalities,
      quality,
      accounting_product_config,
      edof_export_fields,
      competence_domains
    )
    SELECT 
      id,
      organization_id,
      code,
      name,
      description,
      duration_hours,
      price,
      currency,
      payment_plan,
      prerequisites,
      capacity_max,
      age_min,
      age_max,
      certification_issued,
      is_active,
      created_at,
      updated_at,
      -- Nouveaux champs (peuvent être NULL si la colonne n'existe pas)
      subtitle,
      photo_url,
      category,
      program_version,
      version_date,
      duration_days,
      duration_unit,
      published_online,
      eligible_cpf,
      cpf_code,
      modalities,
      training_action_type,
      pedagogical_objectives,
      learner_profile,
      training_content,
      execution_follow_up,
      certification_modalities,
      quality,
      accounting_product_config,
      edof_export_fields,
      competence_domains
    FROM public.formations_temp
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 4 : Renommer program_sessions en sessions et changer program_id en formation_id
-- ============================================================================

-- Créer la nouvelle table sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id UUID NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  location TEXT,
  capacity_max INTEGER,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'ongoing', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_formation ON public.sessions(formation_id);
CREATE INDEX IF NOT EXISTS idx_sessions_dates ON public.sessions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);

-- Migrer les données de program_sessions vers sessions
-- En utilisant la relation program_id -> formations (via l'id qui a été migré)
DO $$
BEGIN
  -- Vérifier si program_sessions existe encore
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'program_sessions' AND table_schema = 'public') THEN
    INSERT INTO public.sessions (
      id,
      formation_id,
      name,
      start_date,
      end_date,
      start_time,
      end_time,
      teacher_id,
      location,
      capacity_max,
      status,
      created_at,
      updated_at
    )
    SELECT 
      ps.id,
      ps.program_id AS formation_id, -- program_id devient formation_id car l'id a été migré
      ps.name,
      ps.start_date,
      ps.end_date,
      ps.start_time,
      ps.end_time,
      ps.teacher_id,
      ps.location,
      ps.capacity_max,
      ps.status,
      ps.created_at,
      ps.updated_at
    FROM public.program_sessions ps
    INNER JOIN public.formations f ON f.id = ps.program_id
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Données de program_sessions migrées vers sessions';
  ELSE
    RAISE NOTICE 'program_sessions n''existe plus ou a déjà été migré';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 5 : Mettre à jour les contraintes FK et les colonnes avant de renommer
-- ============================================================================

-- D'abord, mettre à jour les contraintes FK pour pointer vers sessions
-- au lieu de program_sessions/sessions_temp

-- 1. Mettre à jour enrollments
DO $$
BEGIN
  -- Renommer la colonne program_session_id en session_id si elle existe
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'enrollments' AND column_name = 'program_session_id'
  ) THEN
    -- Supprimer l'ancienne contrainte FK
    ALTER TABLE public.enrollments 
      DROP CONSTRAINT IF EXISTS enrollments_program_session_id_fkey;
    
    -- Renommer la colonne
    ALTER TABLE public.enrollments 
      RENAME COLUMN program_session_id TO session_id;
    
    -- Créer la nouvelle contrainte FK pointant vers sessions
    ALTER TABLE public.enrollments
      ADD CONSTRAINT enrollments_session_id_fkey 
      FOREIGN KEY (session_id) 
      REFERENCES public.sessions(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Mettre à jour attendance
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'program_session_id'
  ) THEN
    -- Supprimer l'ancienne contrainte FK
    ALTER TABLE public.attendance 
      DROP CONSTRAINT IF EXISTS attendance_program_session_id_fkey;
    
    -- Renommer la colonne
    ALTER TABLE public.attendance 
      RENAME COLUMN program_session_id TO session_id;
    
    -- Créer la nouvelle contrainte FK pointant vers sessions
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_session_id_fkey 
      FOREIGN KEY (session_id) 
      REFERENCES public.sessions(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Mettre à jour grades si la table existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'grades' AND column_name = 'program_session_id'
  ) THEN
    -- Supprimer l'ancienne contrainte FK
    ALTER TABLE public.grades 
      DROP CONSTRAINT IF EXISTS grades_program_session_id_fkey;
    
    -- Renommer la colonne
    ALTER TABLE public.grades 
      RENAME COLUMN program_session_id TO session_id;
    
    -- Créer la nouvelle contrainte FK pointant vers sessions
    ALTER TABLE public.grades
      ADD CONSTRAINT grades_session_id_fkey 
      FOREIGN KEY (session_id) 
      REFERENCES public.sessions(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 6 : Mettre à jour les politiques RLS qui référencent program_sessions/sessions_temp
-- ============================================================================

-- Supprimer les anciennes politiques RLS sur enrollments qui référencent program_sessions
-- Note: On doit le faire en dehors du bloc DO $$ car CREATE POLICY ne peut pas être dans un bloc
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Supprimer toutes les politiques enrollments qui pourraient référencer program_sessions
  FOR r IN (
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'enrollments'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.enrollments';
  END LOOP;
END $$;

-- Recréer les politiques avec la bonne référence vers sessions (en dehors du bloc DO)
DROP POLICY IF EXISTS "Users can view enrollments in their organization" ON public.enrollments;
DROP POLICY IF EXISTS "Users can create enrollments in their organization" ON public.enrollments;
DROP POLICY IF EXISTS "Users can update enrollments in their organization" ON public.enrollments;
DROP POLICY IF EXISTS "Users can delete enrollments in their organization" ON public.enrollments;

CREATE POLICY "Users can view enrollments in their organization"
  ON public.enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      INNER JOIN public.formations f ON f.id = s.formation_id
      WHERE s.id = session_id
        AND f.organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can create enrollments in their organization"
  ON public.enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      INNER JOIN public.formations f ON f.id = s.formation_id
      WHERE s.id = session_id
        AND f.organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND
    EXISTS (
      SELECT 1
      FROM public.students st
      WHERE st.id = student_id
        AND st.organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update enrollments in their organization"
  ON public.enrollments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      INNER JOIN public.formations f ON f.id = s.formation_id
      WHERE s.id = session_id
        AND f.organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      INNER JOIN public.formations f ON f.id = s.formation_id
      WHERE s.id = session_id
        AND f.organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can delete enrollments in their organization"
  ON public.enrollments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      INNER JOIN public.formations f ON f.id = s.formation_id
      WHERE s.id = session_id
        AND f.organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- ÉTAPE 7 : Renommer program_sessions en sessions_temp (après migration des données)
-- ============================================================================

-- Renommer program_sessions en sessions_temp seulement si elle existe encore
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'program_sessions' AND table_schema = 'public') THEN
    ALTER TABLE public.program_sessions RENAME TO sessions_temp;
    RAISE NOTICE 'Table program_sessions renommée en sessions_temp';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 8 : Supprimer sessions_temp après avoir mis à jour toutes les dépendances
-- ============================================================================

-- Supprimer sessions_temp seulement si toutes les contraintes ont été mises à jour
DO $$
BEGIN
  -- Vérifier qu'il n'y a plus de contraintes FK pointant vers sessions_temp
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'sessions_temp'
  ) THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions_temp' AND table_schema = 'public') THEN
      DROP TABLE public.sessions_temp CASCADE;
      RAISE NOTICE 'Table sessions_temp supprimée (toutes les dépendances mises à jour)';
    END IF;
  ELSE
    RAISE NOTICE 'Attention : sessions_temp a encore des dépendances. Vérifiez les contraintes FK.';
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 9 : Supprimer les anciennes tables (optionnel - à faire après vérification)
-- ============================================================================
-- ATTENTION : Ne pas exécuter ces lignes immédiatement
-- Vérifiez d'abord que toutes les données ont été migrées correctement

-- On garde l'ancienne table formations_temp pour l'instant, mais on peut la supprimer après vérification
-- DROP TABLE IF EXISTS public.formations_temp CASCADE;

-- ============================================================================
-- ÉTAPE 10 : Créer les triggers pour updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_formations_updated_at BEFORE UPDATE ON public.formations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ÉTAPE 11 : Activer RLS sur les nouvelles tables
-- ============================================================================

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS de base (similaires à celles de programs)
-- Programmes
DO $$
BEGIN
  -- Supprimer les politiques existantes pour programmes si elles existent
  DROP POLICY IF EXISTS "Users can view programs in their organization" ON public.programs;
  DROP POLICY IF EXISTS "Users can create programs in their organization" ON public.programs;
  DROP POLICY IF EXISTS "Users can update programs in their organization" ON public.programs;
  DROP POLICY IF EXISTS "Users can delete programs in their organization" ON public.programs;
  
  CREATE POLICY "Users can view programs in their organization"
    ON public.programs FOR SELECT
    TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

  CREATE POLICY "Users can create programs in their organization"
    ON public.programs FOR INSERT
    TO authenticated
    WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

  CREATE POLICY "Users can update programs in their organization"
    ON public.programs FOR UPDATE
    TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
    WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

  CREATE POLICY "Users can delete programs in their organization"
    ON public.programs FOR DELETE
    TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));
END $$;

-- Formations
DO $$
BEGIN
  -- Supprimer les politiques existantes pour formations si elles existent
  DROP POLICY IF EXISTS "Users can view formations in their organization" ON public.formations;
  DROP POLICY IF EXISTS "Users can create formations in their organization" ON public.formations;
  DROP POLICY IF EXISTS "Users can update formations in their organization" ON public.formations;
  DROP POLICY IF EXISTS "Users can delete formations in their organization" ON public.formations;
  
  CREATE POLICY "Users can view formations in their organization"
    ON public.formations FOR SELECT
    TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

  CREATE POLICY "Users can create formations in their organization"
    ON public.formations FOR INSERT
    TO authenticated
    WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

  CREATE POLICY "Users can update formations in their organization"
    ON public.formations FOR UPDATE
    TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
    WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

  CREATE POLICY "Users can delete formations in their organization"
    ON public.formations FOR DELETE
    TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));
END $$;

-- Sessions
DO $$
BEGIN
  -- Supprimer les politiques existantes pour sessions si elles existent
  DROP POLICY IF EXISTS "Users can view sessions in their organization" ON public.sessions;
  DROP POLICY IF EXISTS "Users can create sessions in their organization" ON public.sessions;
  DROP POLICY IF EXISTS "Users can update sessions in their organization" ON public.sessions;
  DROP POLICY IF EXISTS "Users can delete sessions in their organization" ON public.sessions;
  
  CREATE POLICY "Users can view sessions in their organization"
    ON public.sessions FOR SELECT
    TO authenticated
    USING (
      formation_id IN (
        SELECT id FROM public.formations
        WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
      )
    );

  CREATE POLICY "Users can create sessions in their organization"
    ON public.sessions FOR INSERT
    TO authenticated
    WITH CHECK (
      formation_id IN (
        SELECT id FROM public.formations
        WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
      )
    );

  CREATE POLICY "Users can update sessions in their organization"
    ON public.sessions FOR UPDATE
    TO authenticated
    USING (
      formation_id IN (
        SELECT id FROM public.formations
        WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
      )
    )
    WITH CHECK (
      formation_id IN (
        SELECT id FROM public.formations
        WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
      )
    );

  CREATE POLICY "Users can delete sessions in their organization"
    ON public.sessions FOR DELETE
    TO authenticated
    USING (
      formation_id IN (
        SELECT id FROM public.formations
        WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
      )
    );
END $$;

