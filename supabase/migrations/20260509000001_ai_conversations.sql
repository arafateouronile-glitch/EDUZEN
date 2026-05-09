-- Table de persistance des conversations IA (une par utilisateur)

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL,
  messages        JSONB       NOT NULL DEFAULT '[]',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Une seule conversation active par utilisateur
CREATE UNIQUE INDEX IF NOT EXISTS ai_conversations_user_idx
  ON public.ai_conversations (user_id);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own conversation"
  ON public.ai_conversations
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
