const fs = require('fs');
const path = require('path');

const tickersPath = path.join(process.cwd(), 'Data', 'tickers_new.csv');
const pricesPath = path.join(process.cwd(), 'Data', 'consolidated_prices_new.csv');

// Fix tickers
let tickersContent = fs.readFileSync(tickersPath, 'utf8');
const firstLineEnd = tickersContent.indexOf('\n');
tickersContent = 'symbol,company_name,website,exchange,sector,industry' + tickersContent.substring(firstLineEnd);
fs.writeFileSync(tickersPath, tickersContent);
console.log('Fixed tickers_new.csv');

// Fix prices
let pricesContent = fs.readFileSync(pricesPath, 'utf8');
const firstLineEndPrices = pricesContent.indexOf('\n');
pricesContent = 'ticker_symbol,date,open,high,low,close,volume' + pricesContent.substring(firstLineEndPrices);
fs.writeFileSync(pricesPath, pricesContent);
console.log('Fixed consolidated_prices_new.csv');
