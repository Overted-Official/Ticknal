-- Migration 0008: Supabase Database Linter Remediations
-- Resolves:
-- 1. security_definer_view on public.users (0010_security_definer_view)
-- 2. anon_security_definer_function_executable on public.handle_new_user() (0028)
-- 3. authenticated_security_definer_function_executable on public.handle_new_user() (0029)
-- 4. anon_security_definer_function_executable on public.rls_auto_enable() (0028)
-- 5. authenticated_security_definer_function_executable on public.rls_auto_enable() (0029)
-- 6. rls_enabled_no_policy on public.device_push_tokens (0008)
-- 7. rls_enabled_no_policy on public.intraday_candles (0008)

-- ==============================================================================
-- 1. FIX SECURITY DEFINER VIEW: public.users
-- ==============================================================================
-- Switch public.users view to security_invoker = true so that RLS on profiles is enforced
-- for the querying user rather than the view creator.
ALTER VIEW IF EXISTS public.users SET (security_invoker = true);

-- ==============================================================================
-- 2. REVOKE PUBLIC RPC ACCESS ON SECURITY DEFINER FUNCTIONS
-- ==============================================================================
-- Trigger and maintenance functions should never be exposed over PostgREST RPC (/rest/v1/rpc/...).
-- Revoke EXECUTE from PUBLIC, anon, and authenticated so PostgREST blocks direct execution,
-- while internal PostgreSQL triggers and superusers continue executing normally.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- ==============================================================================
-- 3. RLS POLICIES FOR TABLES WITH RLS ENABLED BUT NO POLICIES
-- ==============================================================================

-- A. public.device_push_tokens: User isolation + service_role full access
ALTER TABLE IF EXISTS public.device_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "device_push_tokens_user_isolation" ON public.device_push_tokens;
DROP POLICY IF EXISTS "device_push_tokens_service_role_all" ON public.device_push_tokens;

CREATE POLICY "device_push_tokens_user_isolation" ON public.device_push_tokens
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "device_push_tokens_service_role_all" ON public.device_push_tokens
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- B. public.intraday_candles: Public read + service_role full access
ALTER TABLE IF EXISTS public.intraday_candles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "intraday_candles_read_all" ON public.intraday_candles;
DROP POLICY IF EXISTS "intraday_candles_service_role_all" ON public.intraday_candles;

CREATE POLICY "intraday_candles_read_all" ON public.intraday_candles
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "intraday_candles_service_role_all" ON public.intraday_candles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
