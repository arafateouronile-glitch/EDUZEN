-- =============================================================================
-- Learner Events — Timeline de conformité par apprenant (CRM Apprenant)
--
-- Différent de customer_events (niveau organisation) :
-- learner_events est centré sur le PARCOURS INDIVIDUEL d'un apprenant.
-- Chaque ligne = une action/étape horodatée dans le dossier de l'apprenant.
-- =============================================================================

CREATE TABLE IF NOT EXISTS learner_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id      UUID        REFERENCES sessions(id) ON DELETE SET NULL,
  event_type      TEXT        NOT NULL,
  -- Types courants :
  -- 'enrollment_created'   — Inscription créée
  -- 'convocation_envoyee'  — Email de convocation envoyé
  -- 'convocation_ouverte'  — Email de convocation ouvert (via webhook Resend)
  -- 'contrat_genere'       — Contrat de formation généré
  -- 'contrat_signe'        — Contrat signé (eIDAS)
  -- 'reglement_signe'      — Règlement intérieur signé
  -- 'presence_validee'     — Émargement/présence validé(e)
  -- 'evaluation_faite'     — Évaluation à chaud complétée
  -- 'diplome_emis'         — Diplôme/certificat émis
  -- 'document_genere'      — Autre document généré
  -- 'paiement_recu'        — Paiement reçu
  -- 'note_admin'           — Note manuelle ajoutée par un admin
  -- 'email_bounced'        — Email rejeté (alerte)
  metadata        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  -- Exemples de métadonnées :
  -- { "document_id": "uuid", "document_type": "convocation" }
  -- { "ip_address": "1.2.3.4", "signature_id": "uuid" }
  -- { "score": 4.5, "max_score": 5 }
  -- { "email_log_id": "uuid", "resend_id": "re_xxx" }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL
  -- NULL = événement automatique (système)
  -- UUID = admin/formateur qui a déclenché l'action
);

-- ─── Index ─────────────────────────────────────────────────────────────────────

-- Principal : timeline par apprenant + date
CREATE INDEX idx_learner_events_student_date
  ON learner_events (student_id, created_at DESC);

-- Par organisation + date : pour les dashboards globaux
CREATE INDEX idx_learner_events_org_date
  ON learner_events (organization_id, created_at DESC);

-- Par session : pour voir les événements d'une session
CREATE INDEX idx_learner_events_session
  ON learner_events (session_id, created_at DESC);

-- Par type : pour les agrégations et filtres
CREATE INDEX idx_learner_events_type
  ON learner_events (event_type);

-- ─── RLS (Row Level Security) ──────────────────────────────────────────────────

ALTER TABLE learner_events ENABLE ROW LEVEL SECURITY;

-- Politique 1 : Les membres authentifiés de l'organisation lisent LEURS apprenants uniquement
CREATE POLICY "org_members_read_own_learner_events"
  ON learner_events FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Politique 2 : Les membres authentifiés peuvent insérer des événements pour leur org
CREATE POLICY "org_members_insert_learner_events"
  ON learner_events FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Politique 3 : Le service role a accès total (pour les automations serveur)
CREATE POLICY "service_role_all_learner_events"
  ON learner_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Politique 4 : Les super-admins peuvent tout lire
CREATE POLICY "platform_admins_read_all_learner_events"
  ON learner_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins
      WHERE user_id = auth.uid()
    )
  );

-- ─── Commentaires ──────────────────────────────────────────────────────────────

COMMENT ON TABLE learner_events IS
'Timeline de conformité par apprenant — chaque ligne est une étape horodatée du parcours de formation. Utilisé par le CRM Apprenant pour la vue 360° et la checklist Qualiopi.';

COMMENT ON COLUMN learner_events.metadata IS
'Données contextuelles JSON : document_id, signature_id, ip_address, score, email_log_id, etc.';

COMMENT ON COLUMN learner_events.created_by IS
'UUID de l''utilisateur qui a déclenché l''action. NULL = événement automatique (webhook, système).';
