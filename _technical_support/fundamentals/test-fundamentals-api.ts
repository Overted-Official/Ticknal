import { GET, CompanyFundamentalsResponse } from '../../src/app/api/companies/[symbol]/fundamentals/route';

async function runTests() {
  console.log('================================================================');
  console.log('EGX Company Fundamentals API Endpoint Verification Test Suite');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  }

  // ---------------------------------------------------------------------------
  // Test 1: COMI Benchmark Query (Promise params)
  // ---------------------------------------------------------------------------
  console.log('[Test 1] Testing COMI benchmark query...');
  const req1 = new Request('http://localhost:3000/api/companies/COMI/fundamentals');
  const res1 = await GET(req1, { params: Promise.resolve({ symbol: 'COMI' }) });
  
  assert(res1.status === 200, 'COMI responds with HTTP 200');
  assert(
    res1.headers.get('Cache-Control') === 'public, s-maxage=300, stale-while-revalidate=600',
    'COMI has correct Cache-Control header'
  );

  const data1: CompanyFundamentalsResponse = await res1.json();
  assert(data1.symbol === 'COMI', `COMI symbol matches: ${data1.symbol}`);
  assert(typeof data1.currency === 'string' && data1.currency.length > 0, `COMI currency is string (${data1.currency})`);
  assert(data1.valuation !== null, 'COMI valuation metric snapshot is present');
  assert(typeof data1.valuation?.marketCap === 'number' && data1.valuation.marketCap > 0, `COMI marketCap is positive (${data1.valuation?.marketCap})`);
  assert(typeof data1.valuation?.piotroskiFScore === 'number', `COMI piotroskiFScore is number (${data1.valuation?.piotroskiFScore})`);
  assert(typeof data1.valuation?.altmanZScore === 'number', `COMI altmanZScore is number (${data1.valuation?.altmanZScore})`);

  assert(Array.isArray(data1.statements.annual), 'COMI annual statements is an array');
  assert(data1.statements.annual.length >= 15, `COMI has at least 15 annual statements (got ${data1.statements.annual.length})`);
  assert(Array.isArray(data1.statements.quarterly), 'COMI quarterly statements is an array');
  assert(data1.statements.quarterly.length >= 20, `COMI has at least 20 quarterly statements (got ${data1.statements.quarterly.length})`);

  // Verify descending sort order of reportDate
  if (data1.statements.annual.length >= 2) {
    const d0 = new Date(data1.statements.annual[0].reportDate).getTime();
    const d1 = new Date(data1.statements.annual[1].reportDate).getTime();
    assert(d0 >= d1, `COMI annual statements are ordered desc by reportDate (${data1.statements.annual[0].reportDate} >= ${data1.statements.annual[1].reportDate})`);
  }
  if (data1.statements.quarterly.length >= 2) {
    const q0 = new Date(data1.statements.quarterly[0].reportDate).getTime();
    const q1 = new Date(data1.statements.quarterly[1].reportDate).getTime();
    assert(q0 >= q1, `COMI quarterly statements are ordered desc by reportDate (${data1.statements.quarterly[0].reportDate} >= ${data1.statements.quarterly[1].reportDate})`);
  }

  // ---------------------------------------------------------------------------
  // Test 2: SWDY with .CA suffix and direct object params
  // ---------------------------------------------------------------------------
  console.log('\n[Test 2] Testing SWDY with .CA suffix and synchronous context params...');
  const req2 = new Request('http://localhost:3000/api/companies/SWDY.CA/fundamentals');
  const res2 = await GET(req2, { params: { symbol: 'SWDY.CA' } });

  assert(res2.status === 200, 'SWDY.CA responds with HTTP 200');
  const data2: CompanyFundamentalsResponse = await res2.json();
  assert(data2.symbol === 'SWDY', `SWDY suffix stripped correctly to SWDY (got ${data2.symbol})`);
  assert(data2.valuation !== null, 'SWDY valuation is present');
  assert(data2.statements.annual.length >= 15, `SWDY has >= 15 annual statements (got ${data2.statements.annual.length})`);
  assert(data2.statements.quarterly.length >= 20, `SWDY has >= 20 quarterly statements (got ${data2.statements.quarterly.length})`);

  // ---------------------------------------------------------------------------
  // Test 3: TMGH with EGX: prefix and lower-case
  // ---------------------------------------------------------------------------
  console.log('\n[Test 3] Testing TMGH with EGX: prefix and lowercase...');
  const req3 = new Request('http://localhost:3000/api/companies/egx:tmgh/fundamentals');
  const res3 = await GET(req3, { params: Promise.resolve({ symbol: 'egx:tmgh' }) });

  assert(res3.status === 200, 'egx:tmgh responds with HTTP 200');
  const data3: CompanyFundamentalsResponse = await res3.json();
  assert(data3.symbol === 'TMGH', `Normalized egx:tmgh to TMGH (got ${data3.symbol})`);
  assert(data3.valuation !== null, 'TMGH valuation is present');
  assert(data3.statements.annual.length >= 15, `TMGH has >= 15 annual statements (got ${data3.statements.annual.length})`);
  assert(data3.statements.quarterly.length >= 20, `TMGH has >= 20 quarterly statements (got ${data3.statements.quarterly.length})`);

  // ---------------------------------------------------------------------------
  // Test 4: Sparse / Non-existent company handling
  // ---------------------------------------------------------------------------
  console.log('\n[Test 4] Testing non-existent ticker handling...');
  const req4 = new Request('http://localhost:3000/api/companies/UNKNOWN_XYZ/fundamentals');
  const res4 = await GET(req4, { params: Promise.resolve({ symbol: 'UNKNOWN_XYZ' }) });

  assert(res4.status === 200, 'Non-existent ticker returns 200 with empty state');
  const data4: CompanyFundamentalsResponse = await res4.json();
  assert(data4.symbol === 'UNKNOWN_XYZ', 'Returns requested normalized symbol');
  assert(data4.valuation === null, 'Valuation is null for unknown symbol');
  assert(Array.isArray(data4.statements.annual) && data4.statements.annual.length === 0, 'Annual statements array is empty');
  assert(Array.isArray(data4.statements.quarterly) && data4.statements.quarterly.length === 0, 'Quarterly statements array is empty');
  assert(data4.currency === 'EGP', 'Currency defaults cleanly to EGP');

  // ---------------------------------------------------------------------------
  // Test 5: Empty symbol validation
  // ---------------------------------------------------------------------------
  console.log('\n[Test 5] Testing empty symbol input...');
  const req5 = new Request('http://localhost:3000/api/companies/%20/fundamentals');
  const res5 = await GET(req5, { params: Promise.resolve({ symbol: '   ' }) });

  assert(res5.status === 400, 'Empty/blank symbol returns HTTP 400 Bad Request');

  console.log('\n================================================================');
  console.log(`All ${passedTests} assertions PASSED successfully!`);
  console.log('================================================================');
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
