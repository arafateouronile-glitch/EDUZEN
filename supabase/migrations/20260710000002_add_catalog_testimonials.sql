-- =====================================================
-- EDUZEN - Témoignages réels pour le catalogue public
-- =====================================================
-- Description: Expose, pour le carrousel de preuve sociale du catalogue
-- public, des avis réellement issus des évaluations de fin de formation
-- (grades.assessment_type 'hot'/'cold' = évaluations à chaud/à froid des
-- apprenants), et non un contenu saisi/hardcodé.
--
-- Le texte de l'avis provient d'une réponse à une question de type
-- 'essay' (evaluation_responses.answer_text), reliée à la note de
-- satisfaction (grades.rating) via evaluation_template_instances.
--
-- Aucune policy RLS publique n'existe sur grades / evaluation_responses /
-- evaluation_template_instances (elles contiennent des données internes
-- d'apprenants réels). Plutôt que d'ouvrir une policy RLS large sur ces
-- tables sensibles, on suit la convention déjà utilisée dans le projet
-- (ex: app/api/q/[token]/route.ts qui utilise le client admin pour les
-- accès publics contrôlés) : une fonction SECURITY DEFINER qui ne peut
-- renvoyer que le strict minimum (note, citation, prénom + initiale),
-- jamais les tables sources elles-mêmes.
--
-- Filtres de qualité appliqués : note >= 4/5, réponse non vide et d'une
-- longueur minimale (évite d'afficher des réponses de test du type "ras",
-- "rien"), organisme + programme publics et actifs uniquement.
--
-- p_program_id (optionnel) : quand fourni, restreint aux avis d'UN SEUL
-- programme (page détail programme) ; laissé NULL, couvre tout l'organisme
-- (catalogue public).
-- Date: 2026-07-10
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_catalog_testimonials(
  p_organization_id uuid,
  p_limit integer DEFAULT 9,
  p_program_id uuid DEFAULT NULL
)
RETURNS TABLE (
  author_name text,
  author_role text,
  quote text,
  rating integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH candidates AS (
    SELECT DISTINCT ON (g.id)
      (s.first_name || ' ' || left(s.last_name, 1) || '.') AS author_name,
      COALESCE('Apprenant · ' || f.name, 'Apprenant') AS author_role,
      trim(er.answer_text) AS quote,
      g.rating AS rating,
      g.graded_at AS graded_at
    FROM public.grades g
    JOIN public.sessions se ON se.id = g.session_id
    JOIN public.formations f ON f.id = se.formation_id
    JOIN public.programs p ON p.id = f.program_id
    JOIN public.students s ON s.id = g.student_id
    JOIN public.evaluation_template_instances eti ON eti.grade_id = g.id
    JOIN public.evaluation_responses er ON er.instance_id = eti.id
    JOIN public.evaluation_template_questions q ON q.id = er.question_id
    WHERE p.organization_id = p_organization_id
      AND (p_program_id IS NULL OR p.id = p_program_id)
      AND p.is_public = true
      AND p.is_active = true
      AND g.assessment_type IN ('hot', 'cold')
      AND g.rating IS NOT NULL
      AND g.rating >= 4
      AND q.question_type = 'essay'
      AND er.answer_text IS NOT NULL
      AND length(trim(er.answer_text)) >= 15
    ORDER BY g.id, length(er.answer_text) DESC
  )
  SELECT candidates.author_name, candidates.author_role, candidates.quote, candidates.rating
  FROM candidates
  ORDER BY candidates.rating DESC, candidates.graded_at DESC NULLS LAST
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_catalog_testimonials IS
  'Retourne des témoignages réels (note >= 4, avis écrit substantiel) issus des évaluations de fin de formation, pour un organisme donné et ses seuls programmes publics/actifs. p_program_id optionnel pour restreindre à un seul programme. SECURITY DEFINER : ne jamais élargir le SELECT au-delà des 4 colonnes retournées.';

GRANT EXECUTE ON FUNCTION public.get_catalog_testimonials(uuid, integer, uuid) TO anon, authenticated;
