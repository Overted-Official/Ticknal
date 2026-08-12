import fs from 'fs';
import path from 'path';
import TradingView from '@mathieuc/tradingview';

const symbol = 'COMI';
const timeframe = '15'; // 15-minute timeframe

async function testFetchMore() {
  console.log(`Attempting to fetch deeply historical data for ${symbol}...`);
  
  const client = new TradingView.Client();
  const tvSymbol = `EGX:${symbol}`;
  const chart = new client.Session.Chart();

  chart.setMarket(tvSymbol, {
    timeframe: timeframe,
    range: 5000
  });

  let initialFetchDone = false;

  chart.onUpdate(async () => {
    if (initialFetchDone) return;
    
    const data = chart.periods || [];
    if (data.length > 0) {
      initialFetchDone = true;
      data.sort((a, b) => a.time - b.time);
      console.log(`Initial fetch: Got ${data.length} bars. Oldest bar is ${new Date(data[0].time * 1000).toISOString()}`);
      
      console.log('Attempting to fetch MORE bars backwards in time...');
      try {
        // fetchMore takes the number of extra bars to fetch backwards
        const moreData = await chart.fetchMore(5000);
        console.log(`Success! Fetched ${moreData.length} MORE bars!`);
        console.log(`New oldest bar is ${new Date(moreData[moreData.length - 1].time * 1000).toISOString()}`);
      } catch (err: any) {
        console.error('Failed to fetch more data. TradingView Server rejected the request:');
        console.error(err.message);
      }
      
      chart.delete();
      client.end();
      process.exit(0);
    }
  });

  chart.onError((err: any) => {
    console.error('Chart error:', err);
    chart.delete();
    client.end();
    process.exit(1);
  });
}

testFetchMore();
