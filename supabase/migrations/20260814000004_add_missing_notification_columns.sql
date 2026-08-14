-- La table public.notifications en production est plus ancienne que le schéma
-- attendu par create_notification() (colonnes data/link/read_at/expires_at) :
-- confirmé en appelant la fonction directement, erreur "column link does not
-- exist". ADD COLUMN IF NOT EXISTS pour rattraper sans risque, peu importe
-- quelles colonnes existent déjà.

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
