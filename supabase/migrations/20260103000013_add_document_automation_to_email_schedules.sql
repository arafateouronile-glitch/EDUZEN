-- =====================================================
-- EDUZEN - Ajout de l'envoi automatique de documents
-- =====================================================
-- Description: Ajoute la possibilité d'envoyer des documents automatiquement via les règles de planification d'emails
-- Date: 2026-01-03
-- =====================================================

-- Ajouter une colonne pour le type de document à envoyer
ALTER TABLE public.email_schedules 
ADD COLUMN IF NOT EXISTS document_type TEXT, -- 'convocation', 'certificat_realisation', 'evaluation_pre_formation', 'evaluation_post_formation', 'attestation', 'bulletin', 'releve_notes', 'certificat_presence', NULL (pas de document)
ADD COLUMN IF NOT EXISTS send_document BOOLEAN DEFAULT false, -- Indique si un document doit être envoyé
ADD COLUMN IF NOT EXISTS document_template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL; -- Template de document à utiliser (optionnel)

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_email_schedules_document_type ON public.email_schedules(document_type) WHERE document_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_schedules_send_document ON public.email_schedules(send_document) WHERE send_document = true;

-- Commentaires
COMMENT ON COLUMN public.email_schedules.document_type IS 'Type de document à joindre: convocation, certificat_realisation, evaluation_pre_formation, evaluation_post_formation, attestation, bulletin, releve_notes, certificat_presence';
COMMENT ON COLUMN public.email_schedules.send_document IS 'Indique si un document doit être généré et joint à l''email';
COMMENT ON COLUMN public.email_schedules.document_template_id IS 'Template de document personnalisé à utiliser pour la génération (optionnel)';



