import fs from 'fs';
import path from 'path';

function consolidate() {
  const dataDir = path.join(process.cwd(), 'data');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv') && f !== 'consolidated_prices.csv');
  
  const consolidatedPath = path.join(process.cwd(), 'consolidated_prices.csv');
  
  console.log(`Found ${files.length} CSV files. Consolidating into ${consolidatedPath}...`);
  
  // Open write stream
  const outStream = fs.createWriteStream(consolidatedPath);
  outStream.write('tickerSymbol,date,open,high,low,close,volume\n');
  
  let totalRecords = 0;
  
  for (const file of files) {
    // ticker is the filename without .csv
    const ticker = file.replace('.csv', '');
    const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
    const lines = content.split('\n');
    
    // Skip the first line (header) and empty lines
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        outStream.write(`${ticker},${line}\n`);
        totalRecords++;
      }
    }
  }
  
  outStream.end();
  console.log(`Successfully consolidated ${totalRecords} records into consolidated_prices.csv`);
}

consolidate();
