const fs = require('fs');
const content = fs.readFileSync('C:/Users/abdelrahman.mamdouh_/.gemini/antigravity/brain/fbb45c1d-491b-4e55-9a90-eeb1e394ca20/.system_generated/steps/30/output.txt', 'utf-8');
const jsonStart = content.indexOf('```json\n') + 8;
const jsonEnd = content.lastIndexOf('```');
let jsonStr = content.substring(jsonStart, jsonEnd).trim();

// Because the subagent outputted a JSON string (e.g. `"[\n  {\n..."]"`), we need to parse it once to get the string, then parse it again to get the object, or just parse it if it's already an array.
if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
  jsonStr = JSON.parse(jsonStr);
}

fs.writeFileSync('src/scripts/full_293_tickers.json', jsonStr);
console.log('JSON parsed and extracted successfully!');
