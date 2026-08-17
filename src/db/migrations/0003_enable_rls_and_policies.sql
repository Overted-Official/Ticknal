-- Migration 0003: Enable Row Level Security (RLS) & Security Policies
-- Resolves Supabase linter errors (0013_rls_disabled_in_public & 0023_sensitive_columns_exposed)

-- ==============================================================================
-- 1. USER-SPECIFIC DATA TABLES (Strict auth.uid() isolation + service_role)
-- ==============================================================================

-- 1. positions
ALTER TABLE IF EXISTS public.positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "positions_user_isolation" ON public.positions;
DROP POLICY IF EXISTS "positions_service_role_all" ON public.positions;
CREATE POLICY "positions_user_isolation" ON public.positions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "positions_service_role_all" ON public.positions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. user_bank_accounts (Protects sensitive financial info like account_number)
ALTER TABLE IF EXISTS public.user_bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_bank_accounts_user_isolation" ON public.user_bank_accounts;
DROP POLICY IF EXISTS "user_bank_accounts_service_role_all" ON public.user_bank_accounts;
CREATE POLICY "user_bank_accounts_user_isolation" ON public.user_bank_accounts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_bank_accounts_service_role_all" ON public.user_bank_accounts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. bank_transactions
ALTER TABLE IF EXISTS public.bank_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bank_transactions_user_isolation" ON public.bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_service_role_all" ON public.bank_transactions;
CREATE POLICY "bank_transactions_user_isolation" ON public.bank_transactions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bank_transactions_service_role_all" ON public.bank_transactions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. bank_monthly_snapshots
ALTER TABLE IF EXISTS public.bank_monthly_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bank_monthly_snapshots_user_isolation" ON public.bank_monthly_snapshots;
DROP POLICY IF EXISTS "bank_monthly_snapshots_service_role_all" ON public.bank_monthly_snapshots;
CREATE POLICY "bank_monthly_snapshots_user_isolation" ON public.bank_monthly_snapshots
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bank_monthly_snapshots_service_role_all" ON public.bank_monthly_snapshots
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. ticker_alerts
ALTER TABLE IF EXISTS public.ticker_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticker_alerts_user_isolation" ON public.ticker_alerts;
DROP POLICY IF EXISTS "ticker_alerts_service_role_all" ON public.ticker_alerts;
CREATE POLICY "ticker_alerts_user_isolation" ON public.ticker_alerts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ticker_alerts_service_role_all" ON public.ticker_alerts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. signal_notifications
ALTER TABLE IF EXISTS public.signal_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "signal_notifications_user_isolation" ON public.signal_notifications;
DROP POLICY IF EXISTS "signal_notifications_service_role_all" ON public.signal_notifications;
CREATE POLICY "signal_notifications_user_isolation" ON public.signal_notifications
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "signal_notifications_service_role_all" ON public.signal_notifications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 7. push_subscriptions
ALTER TABLE IF EXISTS public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_subscriptions_user_isolation" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_service_role_all" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_user_isolation" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_subscriptions_service_role_all" ON public.push_subscriptions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 8. user_strategy_settings
ALTER TABLE IF EXISTS public.user_strategy_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_strategy_settings_user_isolation" ON public.user_strategy_settings;
DROP POLICY IF EXISTS "user_strategy_settings_service_role_all" ON public.user_strategy_settings;
CREATE POLICY "user_strategy_settings_user_isolation" ON public.user_strategy_settings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_strategy_settings_service_role_all" ON public.user_strategy_settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);


-- ==============================================================================
-- 2. PUBLIC REFERENCE & MARKET DATA TABLES (Public Read, Service Role Write)
-- ==============================================================================

-- 9. tickers
ALTER TABLE IF EXISTS public.tickers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tickers_read_all" ON public.tickers;
DROP POLICY IF EXISTS "tickers_service_role_all" ON public.tickers;
CREATE POLICY "tickers_read_all" ON public.tickers
  FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "tickers_service_role_all" ON public.tickers
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 10. daily_prices
ALTER TABLE IF EXISTS public.daily_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "daily_prices_read_all" ON public.daily_prices;
DROP POLICY IF EXISTS "daily_prices_service_role_all" ON public.daily_prices;
CREATE POLICY "daily_prices_read_all" ON public.daily_prices
  FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "daily_prices_service_role_all" ON public.daily_prices
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 11. banks
ALTER TABLE IF EXISTS public.banks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "banks_read_all" ON public.banks;
DROP POLICY IF EXISTS "banks_service_role_all" ON public.banks;
CREATE POLICY "banks_read_all" ON public.banks
  FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "banks_service_role_all" ON public.banks
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 12. macro_inflation_rates
ALTER TABLE IF EXISTS public.macro_inflation_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "macro_inflation_rates_read_all" ON public.macro_inflation_rates;
DROP POLICY IF EXISTS "macro_inflation_rates_service_role_all" ON public.macro_inflation_rates;
CREATE POLICY "macro_inflation_rates_read_all" ON public.macro_inflation_rates
  FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "macro_inflation_rates_service_role_all" ON public.macro_inflation_rates
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 13. price_sync_logs
ALTER TABLE IF EXISTS public.price_sync_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "price_sync_logs_read_all" ON public.price_sync_logs;
DROP POLICY IF EXISTS "price_sync_logs_service_role_all" ON public.price_sync_logs;
CREATE POLICY "price_sync_logs_read_all" ON public.price_sync_logs
  FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "price_sync_logs_service_role_all" ON public.price_sync_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
