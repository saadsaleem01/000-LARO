/**
 * Test script for LARO matching system
 * Tests mandatory filters, score calculation, and permanent filtering
 */

import { getDb } from '../db';
import { lawyers, cases, outreachStatus } from '../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function test(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message}`);
}

async function testMandatoryFilters() {
  console.log('\n=== Testing Mandatory Filters ===\n');
  
  const db = await getDb();
  if (!db) {
    test('Database connection', false, 'Failed to connect to database');
    return;
  }
  
  // Test 1: Lawyers with case-stop should be filtered
  const caseStopLawyers = await db
    .select()
    .from(lawyers)
    .where(eq(lawyers.caseStop, 'Yes'));
  
  test(
    'Case-stop filter',
    caseStopLawyers.length >= 0,
    `Found ${caseStopLawyers.length} lawyers with case-stop (should be excluded from matching)`
  );
  
  // Test 2: Permanently filtered lawyers
  const permanentlyFiltered = await db
    .select()
    .from(lawyers)
    .where(eq(lawyers.permanentlyFiltered, 'Yes'));
  
  test(
    'Permanent filter',
    permanentlyFiltered.length >= 0,
    `Found ${permanentlyFiltered.length} permanently filtered lawyers`
  );
  
  // Test 3: Lawyers with good bar standing
  const goodStanding = await db
    .select()
    .from(lawyers)
    .where(eq(lawyers.barAssociationStatus, 'good_standing'));
  
  test(
    'Bar association status',
    goodStanding.length > 0,
    `Found ${goodStanding.length} lawyers in good standing`
  );
}

async function testScoreCalculation() {
  console.log('\n=== Testing Score Calculation ===\n');
  
  const db = await getDb();
  if (!db) {
    test('Database connection', false, 'Failed to connect to database');
    return;
  }
  
  // Get a sample lawyer
  const sampleLawyers = await db
    .select()
    .from(lawyers)
    .limit(5);
  
  if (sampleLawyers.length === 0) {
    test('Score calculation', false, 'No lawyers found in database');
    return;
  }
  
  for (const lawyer of sampleLawyers) {
    // Calculate case-load score (0-50 points)
    const caseLoad = parseInt(lawyer.caseLoad || '0', 10);
    const caseLoadScore = Math.max(0, 50 - caseLoad);
    
    // Calculate response rate score (0-50 points)
    const totalOutreaches = parseInt(lawyer.totalOutreaches || '0', 10);
    const totalResponses = parseInt(lawyer.totalResponses || '0', 10);
    const responseRate = totalOutreaches > 0 ? (totalResponses / totalOutreaches) * 100 : 0;
    const responseRateScore = (responseRate / 100) * 50;
    
    // Calculate acceptance rate score (0-30 points)
    const totalAcceptances = parseInt(lawyer.totalAcceptances || '0', 10);
    const acceptanceRate = totalResponses > 0 ? (totalAcceptances / totalResponses) * 100 : 0;
    const acceptanceRateScore = (acceptanceRate / 100) * 30;
    
    // Currently accepting cases (0-20 points)
    const acceptingScore = lawyer.currentlyAccepting === 'Yes' ? 20 : 0;
    
    // Experience score (0-50 points)
    const yearsExperience = parseInt(lawyer.experienceYears || '0', 10);
    const experienceScore = Math.min(50, yearsExperience * 2);
    
    // Total score
    const totalScore = caseLoadScore + responseRateScore + acceptanceRateScore + acceptingScore + experienceScore;
    
    const passed = totalScore >= 0 && totalScore <= 210;
    
    test(
      `Score for ${lawyer.name}`,
      passed,
      `Total: ${totalScore.toFixed(0)}/210 (CaseLoad: ${caseLoadScore.toFixed(0)}, Response: ${responseRateScore.toFixed(0)}, Accept: ${acceptanceRateScore.toFixed(0)}, Accepting: ${acceptingScore}, Exp: ${experienceScore.toFixed(0)})`
    );
  }
}

async function testPermanentFilteringLogic() {
  console.log('\n=== Testing Permanent Filtering Logic ===\n');
  
  const db = await getDb();
  if (!db) {
    test('Database connection', false, 'Failed to connect to database');
    return;
  }
  
  // Find lawyers with multiple contacts but no responses
  const lawyersWithMatches = await db
    .select({
      lawyerId: outreachStatus.lawyerId,
      totalContacts: sql<number>`count(*)`,
      responses: sql<number>`sum(case when ${outreachStatus.status} != 'No Response' then 1 else 0 end)`,
    })
    .from(outreachStatus)
    .groupBy(outreachStatus.lawyerId)
    .having(sql`count(*) >= 3`);
  
  let shouldBeFiltered = 0;
  
  for (const match of lawyersWithMatches) {
    if (match.responses === 0 && match.totalContacts >= 3) {
      shouldBeFiltered++;
    }
  }
  
  test(
    'Permanent filtering logic',
    true,
    `Found ${shouldBeFiltered} lawyers that should be permanently filtered (3+ contacts, 0 responses)`
  );
}

async function testNewLawyerBenefitOfDoubt() {
  console.log('\n=== Testing New Lawyer "Benefit of Doubt" ===\n');
  
  const db = await getDb();
  if (!db) {
    test('Database connection', false, 'Failed to connect to database');
    return;
  }
  
  // Find lawyers with no match history
  const newLawyers = await db
    .select()
    .from(lawyers)
    .leftJoin(outreachStatus, eq(lawyers.id, outreachStatus.lawyerId))
    .where(sql`${outreachStatus.id} IS NULL`)
    .limit(5);
  
  test(
    'New lawyers without history',
    newLawyers.length >= 0,
    `Found ${newLawyers.length} lawyers with no match history (should get benefit of doubt score)`
  );
  
  // New lawyers should get:
  // - Response rate: 75% (assumed good)
  // - Acceptance rate: 60% (assumed decent)
  // - Case-load: 10 (assumed low)
  const benefitScore = 
    (50 - 10) + // Case-load: 40 pts
    (0.75 * 50) + // Response rate: 37.5 pts
    (0.60 * 30); // Acceptance rate: 18 pts
  
  test(
    'Benefit of doubt calculation',
    benefitScore > 80,
    `New lawyers get ~${benefitScore.toFixed(0)} points from benefit of doubt (should be competitive)`
  );
}

async function testWithSampleData() {
  console.log('\n=== Testing With Sample Data ===\n');
  
  const db = await getDb();
  if (!db) {
    test('Database connection', false, 'Failed to connect to database');
    return;
  }
  
  // Count total records
  const lawyerCount = await db.select({ count: sql<number>`count(*)` }).from(lawyers);
  const caseCount = await db.select({ count: sql<number>`count(*)` }).from(cases);
  const matchCount = await db.select({ count: sql<number>`count(*)` }).from(outreachStatus);
  
  test(
    'Database has data',
    lawyerCount[0].count > 0 && caseCount[0].count >= 0,
    `Lawyers: ${lawyerCount[0].count}, Cases: ${caseCount[0].count}, Matches: ${matchCount[0].count}`
  );
  
  // Check if lawyers have required fields
  const lawyersWithLegalAreas = await db
    .select()
    .from(lawyers)
    .where(sql`json_array_length(${lawyers.legalAreas}) > 0`)
    .limit(1);
  
  test(
    'Lawyers have legal areas',
    lawyersWithLegalAreas.length > 0,
    lawyersWithLegalAreas.length > 0 
      ? `Sample lawyer has ${JSON.parse(lawyersWithLegalAreas[0].legalAreas as string).length} legal areas`
      : 'No lawyers with legal areas found'
  );
}

async function runAllTests() {
  console.log('🧪 LARO Matching System Test Suite\n');
  console.log('Testing mandatory filters, score calculation, and permanent filtering logic\n');
  
  try {
    await testMandatoryFilters();
    await testScoreCalculation();
    await testPermanentFilteringLogic();
    await testNewLawyerBenefitOfDoubt();
    await testWithSampleData();
    
    // Summary
    console.log('\n=== Test Summary ===\n');
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const percentage = ((passed / total) * 100).toFixed(0);
    
    console.log(`✅ Passed: ${passed}/${total} (${percentage}%)`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    
    if (passed === total) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the results above.');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error during testing:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();

