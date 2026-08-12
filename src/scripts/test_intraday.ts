import fs from 'fs';
import path from 'path';
import TradingView from '@mathieuc/tradingview';

const symbol = 'COMI';
const timeframe = '15'; // 15-minute timeframe
const range = 5000;

const outputDir = path.join(process.cwd(), '_Intraday-Test');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const csvPath = path.join(outputDir, `${symbol}_${timeframe}m.csv`);

async function fetchIntradayData() {
  console.log(`Fetching latest ${range} bars on ${timeframe}m chart for ${symbol}...`);
  
  const client = new TradingView.Client();
  const tvSymbol = `EGX:${symbol}`;
  const chart = new client.Session.Chart();

  chart.setMarket(tvSymbol, {
    timeframe: timeframe,
    range: range
  });

  chart.onUpdate(() => {
    const data = chart.periods || [];
    
    if (data.length === 0) {
      console.log('No data received or still loading...');
      return;
    }
    
    // Sort ascending by time
    data.sort((a, b) => a.time - b.time);
    
    console.log(`Received ${data.length} bars! First bar time: ${new Date(data[0].time * 1000).toISOString()}`);
    
    let csvLines = 'symbol,datetime,open,high,low,close,volume\n';
    for (const d of data) {
      // TradingView time is in seconds, convert to ISO string
      const dateStr = new Date(d.time * 1000).toISOString();
      csvLines += `${symbol},${dateStr},${d.open},${d.max},${d.min},${d.close},${d.volume}\n`;
    }
    
    fs.writeFileSync(csvPath, csvLines);
    console.log(`Saved to ${csvPath}`);
    
    chart.delete();
    client.end();
    process.exit(0);
  });

  chart.onError((err: any) => {
    console.error('Chart error:', err);
    chart.delete();
    client.end();
    process.exit(1);
  });
}

fetchIntradayData();
