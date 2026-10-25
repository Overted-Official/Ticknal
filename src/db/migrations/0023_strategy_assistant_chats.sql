CREATE TABLE IF NOT EXISTS public.strategy_assistant_chats (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title varchar(80) NOT NULL,
  strategy_id varchar(100) NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  snapshot jsonb NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strategy_assistant_chats_revision_check CHECK (revision >= 1)
);

CREATE INDEX IF NOT EXISTS strategy_assistant_chats_user_updated_idx
  ON public.strategy_assistant_chats (user_id, updated_at DESC);

ALTER TABLE public.strategy_assistant_chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS strategy_assistant_chats_user_isolation ON public.strategy_assistant_chats;
CREATE POLICY strategy_assistant_chats_user_isolation ON public.strategy_assistant_chats
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS strategy_assistant_chats_service_role_all ON public.strategy_assistant_chats;
CREATE POLICY strategy_assistant_chats_service_role_all ON public.strategy_assistant_chats
  FOR ALL TO service_role USING (true) WITH CHECK (true);
