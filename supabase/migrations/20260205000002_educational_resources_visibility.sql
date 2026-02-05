-- Visibilité des ressources pédagogiques : tous les utilisateurs, ou limitée à un programme / une formation / une session

ALTER TABLE public.educational_resources
  ADD COLUMN IF NOT EXISTS visibility_scope text NOT NULL DEFAULT 'all'
    CHECK (visibility_scope IN ('all', 'program', 'formation', 'session'));

COMMENT ON COLUMN public.educational_resources.visibility_scope IS 'all = visible à tous, program/formation/session = limité aux apprenants du programme/formation/session';

ALTER TABLE public.educational_resources
  ADD COLUMN IF NOT EXISTS visibility_program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL;

ALTER TABLE public.educational_resources
  ADD COLUMN IF NOT EXISTS visibility_formation_id uuid REFERENCES public.formations(id) ON DELETE SET NULL;

ALTER TABLE public.educational_resources
  ADD COLUMN IF NOT EXISTS visibility_session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_educational_resources_visibility_scope
  ON public.educational_resources(visibility_scope);

CREATE INDEX IF NOT EXISTS idx_educational_resources_visibility_program
  ON public.educational_resources(visibility_program_id) WHERE visibility_program_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_educational_resources_visibility_formation
  ON public.educational_resources(visibility_formation_id) WHERE visibility_formation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_educational_resources_visibility_session
  ON public.educational_resources(visibility_session_id) WHERE visibility_session_id IS NOT NULL;
