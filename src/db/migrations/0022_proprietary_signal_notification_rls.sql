-- Direct Supabase clients may read only their own custom alerts, or their own
-- proprietary alerts while a platform-owner grant remains enabled. All alert
-- writes and deletions are handled by server endpoints instead of client RLS.
DROP POLICY IF EXISTS signal_notifications_user_isolation ON public.signal_notifications;
DROP POLICY IF EXISTS signal_notifications_user_select_entitled ON public.signal_notifications;
CREATE POLICY signal_notifications_user_select_entitled ON public.signal_notifications
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND (
      strategy NOT IN ('psi', 'psi_v2', 'hydra')
      OR EXISTS (
        SELECT 1 FROM public.proprietary_strategy_access AS grant_row
        WHERE grant_row.user_id = (SELECT auth.uid()) AND grant_row.enabled = true
      )
    )
  );

INSERT INTO public.proprietary_strategy_access (user_id, enabled, notifications_enabled)
SELECT id, true, false FROM public.profiles
WHERE lower(email) = 'abdelrahman.m.abualola@gmail.com' AND role IN ('admin', 'superadmin')
ON CONFLICT (user_id) DO UPDATE SET enabled = true, updated_at = now();
