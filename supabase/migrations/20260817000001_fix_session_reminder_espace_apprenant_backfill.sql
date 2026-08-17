-- La migration 20260810000001 ne corrigeait que les modèles "Rappel de
-- session" encore identiques au tout premier texte par défaut (ancre "Nous
-- vous attendons !"). Or 4 organisations sur 6 avaient déjà un modèle généré
-- par une version antérieure du seed, avec un texte légèrement différent
-- ("Merci de vous présenter à l'heure...") et les anciennes balises
-- {session_date}/{session_time} (jamais substituées à l'envoi, qui remplace
-- {session_start_date}/{session_start_time}) — sans balise {espace_apprenant}
-- du tout. Résultat : le lien vers l'espace apprenant n'apparaît jamais dans
-- la convocation envoyée à ces organisations, et {session_date}/{session_time}
-- restent affichées telles quelles.
--
-- Best-effort : ne touche que les lignes qui matchent encore le texte
-- attendu, pour ne jamais écraser un modèle personnalisé par une organisation.

UPDATE public.email_templates
SET
  body_html = REPLACE(
    REPLACE(
      REPLACE(
        body_html,
        '{session_date}', '{session_start_date}'
      ),
      '{session_time}', '{session_start_time}'
    ),
    '<p>Merci de vous présenter à l''heure.',
    '<p>Retrouvez toutes les informations de votre formation sur votre <a href="{espace_apprenant}">espace apprenant</a>.</p>
      <p>Merci de vous présenter à l''heure.'
  ),
  body_text = REPLACE(
    REPLACE(
      REPLACE(
        body_text,
        '{session_date}', '{session_start_date}'
      ),
      '{session_time}', '{session_start_time}'
    ),
    'Merci de vous présenter à l''heure.',
    E'Retrouvez toutes les informations de votre formation sur votre espace apprenant : {espace_apprenant}\n\nMerci de vous présenter à l''heure.'
  ),
  updated_at = now()
WHERE email_type = 'session_reminder'
  AND body_html NOT LIKE '%espace_apprenant%'
  AND body_html LIKE '%Merci de vous présenter à l''heure%';
