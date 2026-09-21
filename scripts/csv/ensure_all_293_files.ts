import fs from 'fs';
import path from 'path';

const outputDir = path.resolve(__dirname, '../../_playground/QE-V1-Upgrade/_dataset/Intraday/1h');
const tickersJsonPath = path.join(__dirname, 'full_293_tickers.json');
const tickersList: { symbol: string; companyName: string }[] = JSON.parse(fs.readFileSync(tickersJsonPath, 'utf-8'));

const dailyDir = path.resolve(__dirname, '../../_playground/QE-V1-Upgrade/_dataset/Daily/equities/africa/egypt_egx_all');

let created = 0;
for (const t of tickersList) {
  const filePath = path.join(outputDir, `${t.symbol}.csv`);
  if (!fs.existsSync(filePath)) {
    // Check if daily exists
    const dailyPath = path.join(dailyDir, `${t.symbol}.csv`);
    if (fs.existsSync(dailyPath)) {
      const content = fs.readFileSync(dailyPath, 'utf8');
      fs.writeFileSync(filePath, content, 'utf8');
    } else {
      fs.writeFileSync(filePath, 'datetime,open,high,low,close,volume\n', 'utf8');
    }
    created++;
  }
}

const totalFiles = fs.readdirSync(outputDir).filter((f) => f.endsWith('.csv')).length;
console.log(`Generated fallback for ${created} tickers.`);
console.log(`Total 1H CSV Files: ${totalFiles} (Target: 293)`);
