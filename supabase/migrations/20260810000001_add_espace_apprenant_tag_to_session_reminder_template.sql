-- Ajoute la balise {espace_apprenant} au modèle d'email "Rappel de session"
-- (type 'session_reminder'), aussi utilisé comme contenu par défaut de la
-- fenêtre "Envoi en masse" de l'onglet Convocations d'une session.
--
-- Ne touche que les modèles encore identiques au texte par défaut d'origine
-- (ancre "Nous vous attendons !" / "Cordialement," présente, balise absente)
-- pour ne jamais écraser un modèle qu'une organisation aurait personnalisé.

UPDATE email_templates
SET body_html = REPLACE(
      body_html,
      '<p>Nous vous attendons !</p>',
      '<p>Retrouvez toutes les informations de votre formation sur votre espace apprenant : <a href="{espace_apprenant}">{espace_apprenant}</a></p>
      <p>Nous vous attendons !</p>'
    ),
    body_text = REPLACE(
      body_text,
      'Cordialement,',
      'Retrouvez toutes les informations de votre formation sur votre espace apprenant : {espace_apprenant}\n\nCordialement,'
    ),
    updated_at = now()
WHERE email_type = 'session_reminder'
  AND body_html LIKE '%Nous vous attendons !%'
  AND body_html NOT LIKE '%{espace_apprenant}%';
