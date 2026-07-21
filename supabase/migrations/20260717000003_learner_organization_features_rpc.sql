-- Migration: RPC pour exposer les features du forfait à l'espace apprenant
-- Date: 2026-07-17
--
-- L'espace /learner/* n'a pas de session Supabase Auth (accès par header
-- x-learner-student-id sur un client anon, cf. lib/supabase/learner-client.ts
-- et la fonction learner_student_id() existante). Les policies RLS sur
-- `subscriptions`/`plans` filtrent par `auth.uid()` via la table `users`,
-- ce qui ne matche jamais pour un apprenant. On suit donc le même pattern
-- que get_learner_student() (migration 20251225000008) : une fonction
-- SECURITY DEFINER qui bypasse RLS, prend le student_id en paramètre
-- explicite (le header n'est pas toujours transmis de façon fiable par
-- PostgREST) et ne retourne que les données nécessaires au gating côté
-- apprenant (pas de données sensibles de facturation).

CREATE OR REPLACE FUNCTION public.get_learner_organization_features(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_features jsonb;
  v_grandfathered boolean;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM students
  WHERE id = p_student_id;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('features', '{}'::jsonb, 'grandfathered', false);
  END IF;

  SELECT ou.features, ou.grandfathered
  INTO v_features, v_grandfathered
  FROM organization_usage ou
  WHERE ou.organization_id = v_org_id;

  RETURN jsonb_build_object(
    'features', COALESCE(v_features, '{}'::jsonb),
    'grandfathered', COALESCE(v_grandfathered, false)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_learner_organization_features(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_learner_organization_features(uuid) IS
  'Retourne les features du forfait (jsonb) et le flag grandfathered de l''organisation d''un étudiant, pour le gating côté espace apprenant. SECURITY DEFINER car les apprenants n''ont pas de session auth.uid().';
