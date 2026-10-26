-- Émargement automatique toutes les 5 minutes via le planificateur Supabase.
--
-- Le plan Vercel Hobby limite les crons à un passage par jour : impossible
-- d'envoyer le lien de signature 5 minutes après le début de chaque séance.
-- pg_cron appelle donc /api/cron/auto-launch-attendance toutes les 5 minutes
-- (pg_net), avec l'URL de l'application et le CRON_SECRET lus dans Supabase
-- Vault — aucun secret en clair dans cette migration.
--
-- Étape manuelle unique (SQL Editor Supabase), à faire une fois :
--   select vault.create_secret('https://www.eduzen.io', 'app_url');
--   select vault.create_secret('<valeur de CRON_SECRET sur Vercel>', 'cron_secret');
-- Sans ces secrets, la tâche tourne mais ne fait rien.
--
-- Suivi : select * from cron.job_run_details order by start_time desc limit 20;
--         select * from net._http_response order by created desc limit 20;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_auto_launch_attendance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url    text;
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'app_url' LIMIT 1;
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1;

  IF v_url IS NULL OR v_secret IS NULL THEN
    RAISE NOTICE 'trigger_auto_launch_attendance : secrets Vault app_url / cron_secret absents, rien à faire';
    RETURN;
  END IF;

  PERFORM net.http_get(
    url := rtrim(v_url, '/') || '/api/cron/auto-launch-attendance',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 55000
  );
END;
$$;

-- Appelée uniquement par pg_cron
REVOKE EXECUTE ON FUNCTION public.trigger_auto_launch_attendance() FROM PUBLIC, anon, authenticated;

-- Planification idempotente
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-launch-attendance') THEN
    PERFORM cron.unschedule('auto-launch-attendance');
  END IF;
  PERFORM cron.schedule('auto-launch-attendance', '*/5 * * * *', 'select public.trigger_auto_launch_attendance()');
END;
$$;
