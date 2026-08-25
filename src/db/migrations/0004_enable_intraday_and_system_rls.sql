-- Migration 0004: Enable Row Level Security (RLS) & Policies for Intraday & System Tables
-- Resolves Supabase linter 0013_rls_disabled_in_public & 0024_permissive_rls_policy for all public tables

-- 1. system_logs
ALTER TABLE IF EXISTS public.system_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_logs_read_all" ON public.system_logs;
DROP POLICY IF EXISTS "system_logs_service_role_all" ON public.system_logs;
CREATE POLICY "system_logs_read_all" ON public.system_logs
  FOR SELECT TO authenticated, anon
  USING (true);
CREATE POLICY "system_logs_service_role_all" ON public.system_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. psi_combinations
ALTER TABLE IF EXISTS public.psi_combinations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "psi_combinations_read_all" ON public.psi_combinations;
DROP POLICY IF EXISTS "psi_combinations_service_role_all" ON public.psi_combinations;
CREATE POLICY "psi_combinations_read_all" ON public.psi_combinations
  FOR SELECT TO authenticated, anon
  USING (true);
CREATE POLICY "psi_combinations_service_role_all" ON public.psi_combinations
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. intraday_bot_settings
ALTER TABLE IF EXISTS public.intraday_bot_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "intraday_bot_settings_read_all" ON public.intraday_bot_settings;
DROP POLICY IF EXISTS "intraday_bot_settings_authenticated_all" ON public.intraday_bot_settings;
DROP POLICY IF EXISTS "intraday_bot_settings_service_role_all" ON public.intraday_bot_settings;
CREATE POLICY "intraday_bot_settings_read_all" ON public.intraday_bot_settings
  FOR SELECT TO authenticated, anon
  USING (true);
CREATE POLICY "intraday_bot_settings_service_role_all" ON public.intraday_bot_settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. intraday_bot_tickers
ALTER TABLE IF EXISTS public.intraday_bot_tickers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "intraday_bot_tickers_read_all" ON public.intraday_bot_tickers;
DROP POLICY IF EXISTS "intraday_bot_tickers_authenticated_all" ON public.intraday_bot_tickers;
DROP POLICY IF EXISTS "intraday_bot_tickers_service_role_all" ON public.intraday_bot_tickers;
CREATE POLICY "intraday_bot_tickers_read_all" ON public.intraday_bot_tickers
  FOR SELECT TO authenticated, anon
  USING (true);
CREATE POLICY "intraday_bot_tickers_service_role_all" ON public.intraday_bot_tickers
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. intraday_positions
ALTER TABLE IF EXISTS public.intraday_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "intraday_positions_read_all" ON public.intraday_positions;
DROP POLICY IF EXISTS "intraday_positions_authenticated_all" ON public.intraday_positions;
DROP POLICY IF EXISTS "intraday_positions_service_role_all" ON public.intraday_positions;
CREATE POLICY "intraday_positions_read_all" ON public.intraday_positions
  FOR SELECT TO authenticated, anon
  USING (true);
CREATE POLICY "intraday_positions_service_role_all" ON public.intraday_positions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. intraday_signals_log
ALTER TABLE IF EXISTS public.intraday_signals_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "intraday_signals_log_read_all" ON public.intraday_signals_log;
DROP POLICY IF EXISTS "intraday_signals_log_authenticated_all" ON public.intraday_signals_log;
DROP POLICY IF EXISTS "intraday_signals_log_service_role_all" ON public.intraday_signals_log;
CREATE POLICY "intraday_signals_log_read_all" ON public.intraday_signals_log
  FOR SELECT TO authenticated, anon
  USING (true);
CREATE POLICY "intraday_signals_log_service_role_all" ON public.intraday_signals_log
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 7. intraday_system_logs
ALTER TABLE IF EXISTS public.intraday_system_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "intraday_system_logs_read_all" ON public.intraday_system_logs;
DROP POLICY IF EXISTS "intraday_system_logs_authenticated_all" ON public.intraday_system_logs;
DROP POLICY IF EXISTS "intraday_system_logs_service_role_all" ON public.intraday_system_logs;
CREATE POLICY "intraday_system_logs_read_all" ON public.intraday_system_logs
  FOR SELECT TO authenticated, anon
  USING (true);
CREATE POLICY "intraday_system_logs_service_role_all" ON public.intraday_system_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
