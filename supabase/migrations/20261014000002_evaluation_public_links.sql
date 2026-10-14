-- Lien public (QR code) pour qu'un apprenant accède directement à SON
-- évaluation depuis son téléphone, sans passer par l'email — même principe
-- que le lien public d'émargement (public_emargement_token sur
-- electronic_attendance_sessions), mais appliqué à un "lot" d'évaluations
-- créées ensemble (même session/sujet/type/date — qu'elles aient été créées
-- individuellement une à une avec les mêmes valeurs, ou en une fois via le
-- mode collectif de /dashboard/evaluations).
--
-- Le formateur clique sur l'icône QR d'une évaluation ; la page publique
-- liste tous les apprenants du même lot, l'apprenant choisit son nom et est
-- redirigé vers /learner/access/[student_id]?redirect=/learner/evaluations/[grade_id]
-- (mécanisme déjà en place pour les liens envoyés par email).

CREATE TABLE IF NOT EXISTS public.evaluation_public_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  subject text NOT NULL,
  assessment_type text NOT NULL,
  graded_at timestamptz NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Un seul lien par lot (session + sujet + type + date) — permet un upsert
-- idempotent : cliquer plusieurs fois sur l'icône QR réutilise le même lien.
CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluation_public_links_batch
  ON public.evaluation_public_links (session_id, subject, assessment_type, graded_at);

CREATE INDEX IF NOT EXISTS idx_evaluation_public_links_token
  ON public.evaluation_public_links (token);

ALTER TABLE public.evaluation_public_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage their organization's evaluation public links" ON public.evaluation_public_links;
CREATE POLICY "Staff can manage their organization's evaluation public links"
  ON public.evaluation_public_links FOR ALL
  TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

-- Pas de policy anon : la résolution par token côté page publique passe par
-- une route API utilisant le client service role (même pattern que
-- /api/electronic-attendance/public-link/[token]).
