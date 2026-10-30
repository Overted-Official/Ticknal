import { chromium } from 'playwright';

async function waitForRealPage(page: any, label: string, maxAttempts = 20): Promise<boolean> {
  for (let i = 1; i <= maxAttempts; i++) {
    await page.waitForTimeout(1500);
    try {
      const textLen = await page.evaluate('document.body ? document.body.innerText.length : 0');
      if (textLen > 600) {
        return true;
      }
    } catch {}
  }
  return false;
}

async function main() {
  console.log('[Inspect-EGX] Launching Playwright browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'en-US',
  });

  await context.addInitScript('Object.defineProperty(navigator, "webdriver", { get: () => undefined });');
  const page = await context.newPage();

  console.log('[Inspect-EGX] Navigating to homepage for F5 challenge...');
  await page.goto('https://www.egx.com.eg/en/homepage.aspx', { waitUntil: 'commit', timeout: 35000 });
  const homeLoaded = await waitForRealPage(page, 'Home');
  console.log('[Inspect-EGX] Home loaded:', homeLoaded);

  console.log('[Inspect-EGX] Navigating to InvestorsTypeCharts.aspx...');
  await page.goto('https://www.egx.com.eg/en/InvestorsTypeCharts.aspx', { waitUntil: 'commit', timeout: 35000 });
  const chartsLoaded = await waitForRealPage(page, 'Charts');
  console.log('[Inspect-EGX] Charts loaded:', chartsLoaded);

  const controls = await page.evaluate(`(() => {
    var inputs = Array.from(document.querySelectorAll('input, select, button, a[href*="doPostBack"]')).map(function(el) {
      return {
        tag: el.tagName,
        type: el.type || '',
        name: el.name || '',
        id: el.id || '',
        value: el.value || '',
        text: (el.innerText || el.textContent || '').trim().slice(0, 80),
        parentText: (el.parentElement ? el.parentElement.innerText : '').trim().replace(/\\s+/g, ' ').slice(0, 100),
        onclick: el.getAttribute('onclick') || '',
        href: el.getAttribute('href') || ''
      };
    });
    return inputs;
  })()`);

  console.log('[Inspect-EGX] Controls found:', JSON.stringify(controls, null, 2));

  // Extract initial table values
  const getTableData = async () => {
    return await page.evaluate(`(() => {
      var grid = document.getElementById('AllGrd');
      if (!grid) return 'No AllGrd';
      var table = grid.querySelector('table');
      if (!table) return 'No table in AllGrd';
      return Array.from(table.querySelectorAll('tr')).map(function(tr) {
        return Array.from(tr.querySelectorAll('th, td')).map(function(td) { return td.innerText.trim(); });
      });
    })()`);
  };

  console.log('[Inspect-EGX] Initial AllGrd table:');
  console.log(JSON.stringify(await getTableData(), null, 2));

  // Try interacting with any radio buttons or selects found
  const radios = await page.$$('input[type="radio"]');
  console.log('[Inspect-EGX] Found', radios.length, 'radio buttons');
  for (let i = 0; i < radios.length; i++) {
    const r = radios[i];
    const id = await r.getAttribute('id');
    const name = await r.getAttribute('name');
    const val = await r.getAttribute('value');
    console.log(`[Inspect-EGX] Clicking radio #${i}: id=${id} name=${name} val=${val}`);
    await r.click();
    await page.waitForTimeout(3000);
    console.log(`[Inspect-EGX] AllGrd after radio #${i}:`, JSON.stringify(await getTableData(), null, 2));
  }

  // Check selects
  const selects = await page.$$('select');
  console.log('[Inspect-EGX] Found', selects.length, 'select dropdowns');
  for (let s of selects) {
    const id = await s.getAttribute('id');
    const options = await s.$$eval('option', (opts: any[]) => opts.map(o => ({ value: o.value, text: o.innerText })));
    console.log(`[Inspect-EGX] Select id=${id} options:`, options);
  }

  await browser.close();
  console.log('[Inspect-EGX] Done');
}

main().catch(console.error).finally(() => process.exit(0));
