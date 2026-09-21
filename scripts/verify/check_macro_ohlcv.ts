import TradingView from '@mathieuc/tradingview';

const symbols = ['COMEX:GC1!', 'COMEX:SI1!'];

async function checkFuturesOHLCV() {
  const client = new TradingView.Client();
  
  for (const sym of symbols) {
    await new Promise(resolve => {
      console.log(`\nChecking OHLCV for ${sym}...`);
      const chart = new client.Session.Chart();
      chart.setMarket(sym, { timeframe: 'D', range: 10 });
      
      const timeout = setTimeout(() => {
        chart.delete();
        resolve(null);
      }, 5000);

      chart.onUpdate(() => {
        clearTimeout(timeout);
        const data = chart.periods || [];
        if (data.length > 0) {
          const sample = data[data.length - 1]; // latest bar
          console.log(`Latest Bar:`);
          console.log(`  Date:   ${new Date(sample.time * 1000).toISOString().split('T')[0]}`);
          console.log(`  Open:   ${sample.open}`);
          console.log(`  High:   ${sample.max}`);
          console.log(`  Low:    ${sample.min}`);
          console.log(`  Close:  ${sample.close}`);
          console.log(`  Volume: ${sample.volume}`);
        } else {
          console.log(`No data returned. Maybe delayed data or not authorized?`);
        }
        chart.delete();
        resolve(null);
      });

      chart.onError(() => {
        clearTimeout(timeout);
        chart.delete();
        resolve(null);
      });
    });
  }
  client.end();
}

checkFuturesOHLCV();
