const fs = require('fs');

const lines = fs.readFileSync('Data/consolidated_prices_new.csv', 'utf8').split('\n');
const counts = {};
let total = 0;

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const ticker = lines[i].split(',')[0];
  counts[ticker] = (counts[ticker] || 0) + 1;
  total++;
}

console.log('Total rows:', total);
console.log('Total unique tickers in data:', Object.keys(counts).length);
const max = Math.max(...Object.values(counts));
const min = Math.min(...Object.values(counts));
console.log('Max rows for a ticker:', max);
console.log('Min rows for a ticker:', min);

const zeroDataTickers = [];
const tickersJson = JSON.parse(fs.readFileSync('src/scripts/full_293_tickers.json', 'utf8'));
for(const t of tickersJson) {
  const sym = t.symbol.replace('.CA', '');
  if(!counts[sym]) {
    zeroDataTickers.push(sym);
  }
}
console.log('Tickers with 0 rows:', zeroDataTickers.length);
if (zeroDataTickers.length > 0) {
  console.log('Zero data tickers:', zeroDataTickers.join(', '));
}
