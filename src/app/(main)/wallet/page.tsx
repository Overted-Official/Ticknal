import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BankAccountsLedgerView from '@/components/platform/BankAccountsLedgerView';
import WalletPositionsWrapper from './WalletPositionsWrapper';
import { getCachedRecentPrices } from '@/lib/data-cache';

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab || 'positions';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Get current USD rate from cached daily_prices
  let usdRate = 50.20;
  try {
    const recentPrices = await getCachedRecentPrices();
    const usdRow = recentPrices.find((r) => r.ticker_symbol === 'USDEGP' && Number(r.rn) === 1);
    if (usdRow && Number(usdRow.close) > 0) {
      usdRate = Number(usdRow.close);
    }
  } catch (err) {
    console.error('Error fetching USDEGP rate:', err);
  }

  if (tab === 'banks') {
    return <BankAccountsLedgerView usdRate={usdRate} />;
  }

  return <WalletPositionsWrapper />;
}
