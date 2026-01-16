-- =====================================================
-- EDUZEN - Ajout de session_id à email_schedules
-- =====================================================
-- Description: Ajoute un champ session_id pour lier une règle d'automatisation à une session spécifique
-- Date: 2026-01-03
-- =====================================================

-- Ajouter le champ session_id à la table email_schedules
ALTER TABLE public.email_schedules
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE;

-- Créer un index pour améliorer les performances des requêtes filtrées par session
CREATE INDEX IF NOT EXISTS idx_email_schedules_session ON public.email_schedules(session_id) WHERE session_id IS NOT NULL;



