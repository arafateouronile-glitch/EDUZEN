# Edge Function : sign-reminder

Relance automatique des signatures et émargements par email.

Si, **1 heure** après l'envoi du lien, le stagiaire n'a pas signé/émargé, un rappel est envoyé via Resend (maximum 3 rappels).

## Déclenchement

- **Cron** : configurer un cron (ex. toutes les 15 min) qui appelle `POST /functions/v1/sign-reminder` avec `Authorization: Bearer <anon key>`.
- **Manuel** : appeler l’URL de la Edge Function depuis le dashboard ou un script.

## Secrets Supabase

À définir dans **Supabase Dashboard → Edge Functions → sign-reminder → Secrets** :

| Secret | Description |
|--------|-------------|
| `RESEND_API_KEY` | Clé API Resend ([resend.com](https://resend.com)) |
| `EDUZEN_APP_URL` | (optionnel) URL de l’app, ex. `https://eduzen.app` |

## Exemple cron (Supabase)

```yaml
# supabase/functions/sign-reminder ou via Dashboard → Database → Extensions → pg_cron
# Exemple : toutes les 15 minutes
SELECT cron.schedule(
  'sign-reminder',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/sign-reminder',
    headers := '{"Authorization": "Bearer <anon-key>"}'::jsonb
  );
  $$
);
```

## Réponse

```json
{
  "ok": true,
  "reminders": { "attendance": 2, "signature": 1 }
}
```
