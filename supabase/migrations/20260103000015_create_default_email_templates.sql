-- =====================================================
-- EDUZEN - Création de templates d'emails par défaut
-- =====================================================
-- Description: Insère des templates d'emails par défaut pour tous les types d'emails
-- Date: 2026-01-03
-- =====================================================

-- Fonction helper pour insérer un template seulement s'il n'existe pas déjà
CREATE OR REPLACE FUNCTION insert_default_email_template_if_not_exists(
  p_org_id UUID,
  p_email_type VARCHAR(100),
  p_name VARCHAR(255),
  p_subject TEXT,
  p_body_html TEXT,
  p_body_text TEXT,
  p_description TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insérer seulement s'il n'existe pas déjà de template par défaut pour ce type
  IF NOT EXISTS (
    SELECT 1 FROM public.email_templates 
    WHERE organization_id = p_org_id 
    AND email_type = p_email_type 
    AND is_default = true
  ) THEN
    INSERT INTO public.email_templates (
      organization_id,
      email_type,
      name,
      subject,
      body_html,
      body_text,
      is_default,
      is_active,
      description
    ) VALUES (
      p_org_id,
      p_email_type,
      p_name,
      p_subject,
      p_body_html,
      p_body_text,
      true,
      true,
      p_description
    );
  END IF;
END;
$$;

-- Fonction pour créer des templates par défaut pour une organisation
CREATE OR REPLACE FUNCTION create_default_email_templates_for_organization(org_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Template: Document généré
  PERFORM insert_default_email_template_if_not_exists(
    org_id,
    'document_generated',
    'Document généré - Standard',
    'Votre document : {document_title}',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #274472; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{organization_name}</h1>
    </div>
    <div class="content">
      <p>Bonjour {student_name},</p>
      <p>Votre document <strong>{document_title}</strong> a été généré avec succès.</p>
      <p>Vous pouvez le consulter en pièce jointe de cet email.</p>
      <p>Cordialement,<br>L''équipe {organization_name}</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>',
    'Bonjour {student_name},\n\nVotre document {document_title} a été généré avec succès.\n\nVous pouvez le consulter en pièce jointe de cet email.\n\nCordialement,\nL''équipe {organization_name}',
    'Template par défaut pour les documents générés'
  );

  -- Template: Facture envoyée
  PERFORM insert_default_email_template_if_not_exists(
    org_id,
    'invoice_sent',
    'Facture envoyée - Standard',
    'Votre facture {invoice_number}',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #274472; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{organization_name}</h1>
    </div>
    <div class="content">
      <p>Bonjour {student_name},</p>
      <p>Votre facture <strong>{invoice_number}</strong> d''un montant de <strong>{invoice_amount}</strong> est disponible en pièce jointe.</p>
      <p>Date d''émission : {invoice_date}</p>
      <p>Merci de votre confiance.</p>
      <p>Cordialement,<br>L''équipe {organization_name}</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>',
    'Bonjour {student_name},\n\nVotre facture {invoice_number} d''un montant de {invoice_amount} est disponible en pièce jointe.\n\nDate d''émission : {invoice_date}\n\nCordialement,\nL''équipe {organization_name}',
    'Template par défaut pour les factures envoyées'
  );

  -- Template: Rappel de paiement
  PERFORM insert_default_email_template_if_not_exists(
    org_id,
    'payment_reminder',
    'Rappel de paiement - Standard',
    'Rappel : Paiement en attente pour la facture {invoice_number}',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #274472; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{organization_name}</h1>
    </div>
    <div class="content">
      <p>Bonjour {student_name},</p>
      <p>Nous vous rappelons que le paiement de la facture <strong>{invoice_number}</strong> d''un montant de <strong>{invoice_amount}</strong> est toujours en attente.</p>
      <p>Date d''échéance : {due_date}</p>
      <p>Merci de procéder au règlement dans les plus brefs délais.</p>
      <p>Cordialement,<br>L''équipe {organization_name}</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>',
    'Bonjour {student_name},\n\nNous vous rappelons que le paiement de la facture {invoice_number} d''un montant de {invoice_amount} est toujours en attente.\n\nDate d''échéance : {due_date}\n\nCordialement,\nL''équipe {organization_name}',
    'Template par défaut pour les rappels de paiement'
  );

  -- Template: Notification
  PERFORM insert_default_email_template_if_not_exists(
    org_id,
    'notification',
    'Notification - Standard',
    '{notification_title}',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #274472; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{organization_name}</h1>
    </div>
    <div class="content">
      <p>Bonjour {student_name},</p>
      <p>{notification_message}</p>
      <p>Cordialement,<br>L''équipe {organization_name}</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>',
    'Bonjour {student_name},\n\n{notification_message}\n\nCordialement,\nL''équipe {organization_name}',
    'Template par défaut pour les notifications'
  );

  -- Template: Confirmation d'inscription
  PERFORM insert_default_email_template_if_not_exists(
    org_id,
    'enrollment_confirmation',
    'Confirmation d''inscription - Standard',
    'Confirmation d''inscription : {session_name}',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #274472; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{organization_name}</h1>
    </div>
    <div class="content">
      <p>Bonjour {student_name},</p>
      <p>Votre inscription à la session <strong>{session_name}</strong> a été confirmée.</p>
      <p><strong>Détails de la session :</strong></p>
      <ul>
        <li>Date de début : {session_start_date}</li>
        <li>Date de fin : {session_end_date}</li>
        <li>Lieu : {session_location}</li>
      </ul>
      <p>Nous vous attendons avec impatience !</p>
      <p>Cordialement,<br>L''équipe {organization_name}</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>',
    'Bonjour {student_name},\n\nVotre inscription à la session {session_name} a été confirmée.\n\nDétails de la session :\n- Date de début : {session_start_date}\n- Date de fin : {session_end_date}\n- Lieu : {session_location}\n\nCordialement,\nL''équipe {organization_name}',
    'Template par défaut pour les confirmations d''inscription'
  );

  -- Template: Rappel de session
  PERFORM insert_default_email_template_if_not_exists(
    org_id,
    'session_reminder',
    'Rappel de session - Standard',
    'Rappel : Session {session_name} dans {days_before} jour(s)',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #274472; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{organization_name}</h1>
    </div>
    <div class="content">
      <p>Bonjour {student_name},</p>
      <p>Nous vous rappelons que la session <strong>{session_name}</strong> débutera dans {days_before} jour(s).</p>
      <p><strong>Détails de la session :</strong></p>
      <ul>
        <li>Date de début : {session_start_date}</li>
        <li>Heure : {session_start_time}</li>
        <li>Lieu : {session_location}</li>
      </ul>
      <p>Nous vous attendons !</p>
      <p>Cordialement,<br>L''équipe {organization_name}</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>',
    'Bonjour {student_name},\n\nNous vous rappelons que la session {session_name} débutera dans {days_before} jour(s).\n\nDétails de la session :\n- Date de début : {session_start_date}\n- Heure : {session_start_time}\n- Lieu : {session_location}\n\nCordialement,\nL''équipe {organization_name}',
    'Template par défaut pour les rappels de session'
  );

  -- Template: Certificat délivré
  PERFORM insert_default_email_template_if_not_exists(
    org_id,
    'certificate_issued',
    'Certificat délivré - Standard',
    'Votre certificat : {certificate_title}',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #274472; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{organization_name}</h1>
    </div>
    <div class="content">
      <p>Félicitations {student_name} !</p>
      <p>Votre certificat <strong>{certificate_title}</strong> a été délivré avec succès.</p>
      <p>Vous pouvez le consulter en pièce jointe de cet email.</p>
      <p>Nous vous félicitons pour votre réussite et vous souhaitons beaucoup de succès dans votre parcours professionnel.</p>
      <p>Cordialement,<br>L''équipe {organization_name}</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>',
    'Félicitations {student_name} !\n\nVotre certificat {certificate_title} a été délivré avec succès.\n\nVous pouvez le consulter en pièce jointe de cet email.\n\nCordialement,\nL''équipe {organization_name}',
    'Template par défaut pour les certificats délivrés'
  );

  -- Template: Rappel d'évaluation
  PERFORM insert_default_email_template_if_not_exists(
    org_id,
    'evaluation_reminder',
    'Rappel d''évaluation - Standard',
    'Rappel : Évaluation à compléter pour {session_name}',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #274472; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{organization_name}</h1>
    </div>
    <div class="content">
      <p>Bonjour {student_name},</p>
      <p>Nous vous rappelons qu''une évaluation est disponible pour la session <strong>{session_name}</strong>.</p>
      <p>Merci de prendre quelques minutes pour compléter cette évaluation.</p>
      <p>Cordialement,<br>L''équipe {organization_name}</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>',
    'Bonjour {student_name},\n\nNous vous rappelons qu''une évaluation est disponible pour la session {session_name}.\n\nMerci de prendre quelques minutes pour compléter cette évaluation.\n\nCordialement,\nL''équipe {organization_name}',
    'Template par défaut pour les rappels d''évaluation'
  );

  -- Template: Annulation de session
  PERFORM insert_default_email_template_if_not_exists(
    org_id,
    'session_cancellation',
    'Annulation de session - Standard',
    'Annulation de la session : {session_name}',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #274472; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{organization_name}</h1>
    </div>
    <div class="content">
      <p>Bonjour {student_name},</p>
      <p>Nous vous informons que la session <strong>{session_name}</strong> prévue le {session_start_date} a été annulée.</p>
      <p>{cancellation_reason}</p>
      <p>Nous vous remercions de votre compréhension et restons à votre disposition pour toute information complémentaire.</p>
      <p>Cordialement,<br>L''équipe {organization_name}</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>',
    'Bonjour {student_name},\n\nNous vous informons que la session {session_name} prévue le {session_start_date} a été annulée.\n\n{cancellation_reason}\n\nCordialement,\nL''équipe {organization_name}',
    'Template par défaut pour les annulations de session'
  );

  -- Template: Évaluation disponible
  PERFORM insert_default_email_template_if_not_exists(
    org_id,
    'evaluation_available',
    'Évaluation disponible - Standard',
    'Une nouvelle évaluation est disponible : {evaluation_name}',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #274472; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{organization_name}</h1>
    </div>
    <div class="content">
      <p>Bonjour {student_name},</p>
      <p>Une nouvelle évaluation <strong>{evaluation_name}</strong> est maintenant disponible pour la session <strong>{session_name}</strong>.</p>
      <p>Vous pouvez y accéder depuis votre espace apprenant.</p>
      <p>Merci de prendre quelques minutes pour compléter cette évaluation.</p>
      <p>Cordialement,<br>L''équipe {organization_name}</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>',
    'Bonjour {student_name},\n\nUne nouvelle évaluation {evaluation_name} est maintenant disponible pour la session {session_name}.\n\nVous pouvez y accéder depuis votre espace apprenant.\n\nCordialement,\nL''équipe {organization_name}',
    'Template par défaut pour les évaluations disponibles'
  );

END;
$$;

-- Créer les templates pour toutes les organisations existantes
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM public.organizations
  LOOP
    PERFORM create_default_email_templates_for_organization(org_record.id);
  END LOOP;
END;
$$;

-- Commentaires
COMMENT ON FUNCTION insert_default_email_template_if_not_exists(UUID, VARCHAR, VARCHAR, TEXT, TEXT, TEXT, TEXT) IS 'Insère un template d''email par défaut seulement s''il n''existe pas déjà';
COMMENT ON FUNCTION create_default_email_templates_for_organization(UUID) IS 'Crée des templates d''emails par défaut pour une organisation donnée';
