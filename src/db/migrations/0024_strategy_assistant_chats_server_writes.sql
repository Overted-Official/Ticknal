-- Chats are written through the validated, account-scoped Strategy Studio API only.
DROP POLICY IF EXISTS strategy_assistant_chats_user_isolation ON public.strategy_assistant_chats;
CREATE POLICY strategy_assistant_chats_user_read ON public.strategy_assistant_chats
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.strategy_assistant_chats FROM anon, authenticated;
