import fs from 'fs';
import path from 'path';

function fixCSV() {
  const inputPath = path.join(process.cwd(), 'consolidated_prices.csv');
  const outputPath = path.join(process.cwd(), 'consolidated_prices_fixed.csv');
  
  const content = fs.readFileSync(inputPath, 'utf8');
  const lines = content.split('\n');
  
  // Open write stream
  const outStream = fs.createWriteStream(outputPath);
  // Using the postgres column name 'ticker_symbol' instead of 'tickerSymbol'
  outStream.write('ticker_symbol,date,open,high,low,close,volume\n');
  
  let validRecords = 0;
  let invalidRecords = 0;
  
  // Skip header (index 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    
    // Check if it has exactly 7 fields and none of them are undefined/NaN strings
    if (parts.length === 7 && !parts.includes('undefined') && !parts.includes('NaN')) {
      // Validate that volume and prices are numbers, date is string
      if (parts[1].length === 10 && parts[1].includes('-')) {
        outStream.write(`${line}\n`);
        validRecords++;
      } else {
        invalidRecords++;
      }
    } else {
      invalidRecords++;
    }
  }
  
  outStream.end();
  console.log(`Successfully wrote ${validRecords} records. Removed ${invalidRecords} malformed records.`);
}

fixCSV();
