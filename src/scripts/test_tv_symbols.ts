import TradingView from '@mathieuc/tradingview';

const symbols = ['OANDA:XAUUSD', 'TVC:GOLD', 'OANDA:XAGUSD', 'TVC:SILVER', 'FX_IDC:USDEGP'];

async function testSymbols() {
  const client = new TradingView.Client();
  
  for (const sym of symbols) {
    await new Promise(resolve => {
      console.log(`Testing ${sym}...`);
      const chart = new client.Session.Chart();
      chart.setMarket(sym, {
        timeframe: 'D',
        range: 5000
      });
      
      const timeout = setTimeout(() => {
        console.log(`Timeout for ${sym}`);
        chart.delete();
        resolve(null);
      }, 5000);

      chart.onUpdate(() => {
        clearTimeout(timeout);
        const data = chart.periods || [];
        console.log(`${sym} returned ${data.length} bars.`);
        chart.delete();
        resolve(null);
      });

      chart.onError(() => {
        clearTimeout(timeout);
        console.log(`Error for ${sym}`);
        chart.delete();
        resolve(null);
      });
    });
  }
  client.end();
}

testSymbols();
