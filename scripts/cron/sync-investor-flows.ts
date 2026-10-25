import { syncDailyInvestorFlows } from '../../src/lib/investor-flows/sync-investor-flows';

async function main() {
  console.log('[Runner] Starting automated investor flows synchronization...');
  const startTime = Date.now();

  try {
    const res = await syncDailyInvestorFlows();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Runner] Completed in ${duration}s:`, JSON.stringify(res, null, 2));

    if (!res.success && res.message.includes('weekend')) {
      console.log('[Runner] Market is closed (weekend/holiday). Skipping cleanly.');
      process.exit(0);
    }

    if (!res.success) {
      console.warn(`[Runner] Sync did not produce new rows: ${res.message}`);
      // Don't fail the CI job if official data isn't ready yet, to allow subsequent cron retries to run
      process.exit(0);
    }

    console.log(`[Runner] Successfully synced investor flows for ${res.date}`);
    process.exit(0);
  } catch (err: any) {
    console.error('[Runner] Fatal error during investor flows sync:', err.message, err.stack);
    process.exit(1);
  }
}

main();
