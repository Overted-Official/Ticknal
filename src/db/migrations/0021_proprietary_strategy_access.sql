CREATE TABLE IF NOT EXISTS public.proprietary_strategy_access (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  notifications_enabled boolean NOT NULL DEFAULT false,
  granted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proprietary_strategy_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS proprietary_strategy_access_select_own ON public.proprietary_strategy_access;
CREATE POLICY proprietary_strategy_access_select_own ON public.proprietary_strategy_access
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS proprietary_strategy_access_service_role_all ON public.proprietary_strategy_access;
CREATE POLICY proprietary_strategy_access_service_role_all ON public.proprietary_strategy_access
  FOR ALL TO service_role USING (true) WITH CHECK (true);
