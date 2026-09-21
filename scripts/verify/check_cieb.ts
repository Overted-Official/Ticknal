import fs from 'fs';
import path from 'path';

const csvPath = path.join(process.cwd(), '_data', 'consolidated_prices_new.csv');
const lines = fs.readFileSync(csvPath, 'utf8').split('\n');

const ciebDates = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.startsWith('CIEB,')) {
    const parts = line.split(',');
    ciebDates.push(parts[1]);
  }
}

if (ciebDates.length === 0) {
  console.log('No data found for CIEB in the CSV.');
} else {
  console.log(`Found ${ciebDates.length} rows for CIEB.`);
  console.log(`First date: ${ciebDates[0]}`);
  console.log(`Last date: ${ciebDates[ciebDates.length - 1]}`);
  
  // Find gaps
  let previousYear = parseInt(ciebDates[0].split('-')[0]);
  let gapFound = false;
  for (let i = 1; i < ciebDates.length; i++) {
    const currentYear = parseInt(ciebDates[i].split('-')[0]);
    if (currentYear > previousYear + 1) {
      console.log(`Gap found! Jumps from ${ciebDates[i-1]} to ${ciebDates[i]}`);
      gapFound = true;
    }
    previousYear = currentYear;
  }
  if (!gapFound) {
    console.log('No multi-year gaps found!');
  }
}
