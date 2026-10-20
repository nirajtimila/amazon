/**
 * Master Test Suite Runner:
 * Executes Sub-Test 1, Sub-Test 2, and Sub-Test 3.
 */

const runSubTest1 = require('./subtest_1_crawler_ingestion');
const runSubTest2 = require('./subtest_2_time_window_isolation');
const runSubTest3 = require('./subtest_3_hourly_lifecycle_simulation');

async function main() {
  const startTime = Date.now();
  console.log('\n================================================================');
  console.log('🚀 RUNNING AMAZON WAREHOUSE HUNTER AUTOMATED TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  // Run Sub-Test 1
  try {
    await runSubTest1();
    passed++;
  } catch (err) {
    console.error('❌ SUB-TEST 1 FAILED:', err.message);
    failed++;
  }

  // Run Sub-Test 2
  try {
    await runSubTest2();
    passed++;
  } catch (err) {
    console.error('❌ SUB-TEST 2 FAILED:', err.message);
    failed++;
  }

  // Run Sub-Test 3
  try {
    await runSubTest3();
    passed++;
  } catch (err) {
    console.error('❌ SUB-TEST 3 FAILED:', err.message);
    failed++;
  }

  const durationMs = Date.now() - startTime;
  console.log('================================================================');
  console.log('📊 TEST SUITE SUMMARY:');
  console.log(`   Total Sub-Tests: 3`);
  console.log(`   Passed:          ${passed} ✅`);
  console.log(`   Failed:          ${failed} ${failed === 0 ? '🎉' : '❌'}`);
  console.log(`   Duration:        ${(durationMs / 1000).toFixed(2)}s`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main();
