// ============================================================================
// SEVERITY SCORING TEST FIXTURES
// ============================================================================
// Test cases to verify the technical vs economic severity scoring logic
// Run: node src/lib/severityScoring.test.js
// ============================================================================

import {
  calculateSeverityBreakdown,
  calculateTechnicalSeverity,
  calculateEconomicSeverity,
  enrichReportWithSeverityBreakdown,
  percentToLabel
} from './severityScoring.js';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * FIXTURE A: High technical severity, Low economic severity
 * Scenario: Missing headlight, damaged fender, bumper - but cheap repair in Dubai
 * This is the "70% but only 2000€" case from the screenshot
 */
const FIXTURE_A = {
  name: 'High Technical, Low Economic (Screenshot Case)',
  input: {
    schweregrad: 7, // High technical damage
    bauteil: 'Frontscheinwerfer links',
    schadenAnalyse: 'Scheinwerfer fehlt komplett, Kotflügel stark verbeult, Stoßstange gebrochen. Beleuchtung nicht funktionsfähig.',
    reparaturWeg: 'Gebrauchtteile + Denting',
    kostenAed: { teile: 3200, arbeit: 4800, gesamt: 8000 },
    kostenEur: { gesamt: 2000, kurs: 4.0 },
    frameRisk: 'niedrig',
    fahrbereit: true,
    affectedAreas: ['Frontscheinwerfer', 'Kotflügel', 'Stoßstange'],
    damageDetails: [
      { area: 'Scheinwerfer links', type: 'Ersatz', repairHours: 2 },
      { area: 'Kotflügel vorne links', type: 'Denting + Lackierung', repairHours: 6 },
      { area: 'Stoßstange vorne', type: 'Gebrauchtteil', repairHours: 3 }
    ],
    totalRepairHours: 11,
    estimatedRepairCost: 2000
  },
  expected: {
    technical: { label: 'SCHWER', percentMin: 55 },
    economic: { label: 'MITTEL', percentMax: 45 }
  }
};

/**
 * FIXTURE B: Medium technical severity, High economic severity
 * Scenario: Many parts need replacement, extensive paint work, high labor hours
 */
const FIXTURE_B = {
  name: 'Medium Technical, High Economic',
  input: {
    schweregrad: 5, // Medium technical
    bauteil: 'Seitenteil rechts',
    schadenAnalyse: 'Viele Blechteile beschädigt, extensive Lackierarbeiten erforderlich. Keine sicherheitsrelevanten Teile betroffen.',
    reparaturWeg: 'Neuteile + Komplettlackierung',
    kostenAed: { teile: 12000, arbeit: 14000, gesamt: 26000 },
    kostenEur: { gesamt: 6500, kurs: 4.0 },
    frameRisk: 'niedrig',
    fahrbereit: true,
    affectedAreas: ['Seitenteil rechts', 'Tür hinten rechts', 'Tür vorne rechts', 'Schweller'],
    damageDetails: [
      { area: 'Seitenteil', type: 'Ersatz', repairHours: 10 },
      { area: 'Türen', type: 'Lackierung', repairHours: 12 },
      { area: 'Schweller', type: 'Denting', repairHours: 8 }
    ],
    totalRepairHours: 30,
    estimatedRepairCost: 6500
  },
  expected: {
    technical: { label: 'MITTEL', percentMax: 55 },
    economic: { label: 'SCHWER', percentMin: 60 }
  }
};

/**
 * FIXTURE C: High technical AND High economic severity
 * Scenario: Frame damage suspected, airbag system affected, expensive repair
 */
const FIXTURE_C = {
  name: 'High Technical AND High Economic (Worst Case)',
  input: {
    schweregrad: 9, // Very high technical
    bauteil: 'Längsträger vorne',
    schadenAnalyse: 'Rahmenschaden vermutet, Airbag ausgelöst, Motorraum stark beschädigt. Strukturelle Integrität fraglich.',
    reparaturWeg: 'Rahmenrichtbank + Strukturreparatur',
    kostenAed: { teile: 20000, arbeit: 32000, gesamt: 52000 },
    kostenEur: { gesamt: 13000, kurs: 4.0 },
    frameRisk: 'hoch',
    fahrbereit: false,
    affectedAreas: ['Längsträger', 'Motorhaube', 'Kühlerpaket', 'Airbag', 'Scheinwerfer'],
    damageDetails: [
      { area: 'Rahmen', type: 'Strukturreparatur', repairHours: 20 },
      { area: 'Motorraum', type: 'Ersatz', repairHours: 15 },
      { area: 'Airbag System', type: 'Ersatz', repairHours: 5 }
    ],
    totalRepairHours: 40,
    estimatedRepairCost: 13000
  },
  expected: {
    technical: { label: 'SCHWER', percentMin: 75 },
    economic: { label: 'SCHWER', percentMin: 75 }
  }
};

// ============================================================================
// TEST RUNNER
// ============================================================================

function runTest(fixture) {
  console.log('\n' + '='.repeat(60));
  console.log(`TEST: ${fixture.name}`);
  console.log('='.repeat(60));

  const result = calculateSeverityBreakdown(fixture.input);

  console.log('\nInput Summary:');
  console.log(`  - Schweregrad (AI): ${fixture.input.schweregrad}/10`);
  console.log(`  - Bauteil: ${fixture.input.bauteil}`);
  console.log(`  - Repair Cost: ${fixture.input.estimatedRepairCost}€`);
  console.log(`  - Labor Hours: ${fixture.input.totalRepairHours}h`);
  console.log(`  - Frame Risk: ${fixture.input.frameRisk}`);
  console.log(`  - Fahrbereit: ${fixture.input.fahrbereit}`);

  console.log('\nResult:');
  console.log(`  Technical: ${result.technical.percent}% (${result.technical.label})`);
  console.log(`    Reasons: ${result.technical.reasons.join(', ')}`);
  console.log(`  Economic: ${result.economic.percent}% (${result.economic.label})`);
  console.log(`    Reasons: ${result.economic.reasons.join(', ')}`);
  console.log(`  Summary Badge: "${result.summaryBadge}"`);

  // Validate expectations
  let passed = true;
  const errors = [];

  // Check technical label
  if (fixture.expected.technical.label && result.technical.label !== fixture.expected.technical.label) {
    errors.push(`Technical label: expected ${fixture.expected.technical.label}, got ${result.technical.label}`);
    passed = false;
  }

  // Check technical percent bounds
  if (fixture.expected.technical.percentMin && result.technical.percent < fixture.expected.technical.percentMin) {
    errors.push(`Technical percent too low: expected >= ${fixture.expected.technical.percentMin}, got ${result.technical.percent}`);
    passed = false;
  }
  if (fixture.expected.technical.percentMax && result.technical.percent > fixture.expected.technical.percentMax) {
    errors.push(`Technical percent too high: expected <= ${fixture.expected.technical.percentMax}, got ${result.technical.percent}`);
    passed = false;
  }

  // Check economic label
  if (fixture.expected.economic.label && result.economic.label !== fixture.expected.economic.label) {
    errors.push(`Economic label: expected ${fixture.expected.economic.label}, got ${result.economic.label}`);
    passed = false;
  }

  // Check economic percent bounds
  if (fixture.expected.economic.percentMin && result.economic.percent < fixture.expected.economic.percentMin) {
    errors.push(`Economic percent too low: expected >= ${fixture.expected.economic.percentMin}, got ${result.economic.percent}`);
    passed = false;
  }
  if (fixture.expected.economic.percentMax && result.economic.percent > fixture.expected.economic.percentMax) {
    errors.push(`Economic percent too high: expected <= ${fixture.expected.economic.percentMax}, got ${result.economic.percent}`);
    passed = false;
  }

  if (passed) {
    console.log('\n✅ TEST PASSED');
  } else {
    console.log('\n❌ TEST FAILED');
    errors.forEach(e => console.log(`  - ${e}`));
  }

  return passed;
}

function runAllTests() {
  console.log('\n' + '🧪 SEVERITY SCORING TESTS '.padEnd(60, '='));
  console.log('Testing technical vs economic severity separation');

  const fixtures = [FIXTURE_A, FIXTURE_B, FIXTURE_C];
  let passed = 0;
  let failed = 0;

  for (const fixture of fixtures) {
    if (runTest(fixture)) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60) + '\n');

  // Test edge cases
  console.log('\n📋 Edge Case Tests:');

  // Test null input
  const nullResult = calculateSeverityBreakdown(null);
  console.log(`  Null input: ${nullResult === null ? '✅ Returns null' : '❌ Should return null'}`);

  // Test empty input
  const emptyResult = calculateSeverityBreakdown({});
  console.log(`  Empty input: ${emptyResult?.technical ? '✅ Has defaults' : '❌ Missing defaults'}`);

  // Test percent to label mapping
  console.log('\n📊 Label Mapping Tests:');
  console.log(`  0%  -> ${percentToLabel(0)} (expected: LEICHT) ${percentToLabel(0) === 'LEICHT' ? '✅' : '❌'}`);
  console.log(`  29% -> ${percentToLabel(29)} (expected: LEICHT) ${percentToLabel(29) === 'LEICHT' ? '✅' : '❌'}`);
  console.log(`  30% -> ${percentToLabel(30)} (expected: MITTEL) ${percentToLabel(30) === 'MITTEL' ? '✅' : '❌'}`);
  console.log(`  59% -> ${percentToLabel(59)} (expected: MITTEL) ${percentToLabel(59) === 'MITTEL' ? '✅' : '❌'}`);
  console.log(`  60% -> ${percentToLabel(60)} (expected: SCHWER) ${percentToLabel(60) === 'SCHWER' ? '✅' : '❌'}`);
  console.log(`  100% -> ${percentToLabel(100)} (expected: SCHWER) ${percentToLabel(100) === 'SCHWER' ? '✅' : '❌'}`);

  return failed === 0;
}

// Run tests if executed directly
if (typeof window === 'undefined') {
  runAllTests();
}

// Export for use in other modules
export { FIXTURE_A, FIXTURE_B, FIXTURE_C, runAllTests };
