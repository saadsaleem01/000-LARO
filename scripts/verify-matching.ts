/**
 * Simple Matching Verification Script
 * Tests the matching algorithm with real lawyer data
 */

import { db } from '../db';
import { lawyers, cases } from '../../drizzle/schema';
import { findMatchingLawyers } from '../matching';
import { eq } from 'drizzle-orm';

async function verifyMatching() {
  console.log('\n🔍 Matching Algorithm Verification\n');
  console.log('='.repeat(50));

  // Test cases with expected legal areas
  const testCases = [
    {
      description: 'Werkgever heeft mij onterecht ontslagen na 10 jaar dienst',
      expectedArea: 'Arbeidsrecht',
    },
    {
      description: 'Verhuurder weigert mijn borg terug te geven na vertrek',
      expectedArea: 'Huurrecht',
    },
    {
      description: 'Ik ben gewond geraakt door een auto-ongeluk',
      expectedArea: 'Letselschaderecht',
    },
    {
      description: 'Ik ben beschuldigd van fraude door de belastingdienst',
      expectedArea: 'Strafrecht',
    },
    {
      description: 'Belastingdienst eist €50.000 aan achterstallige belasting',
      expectedArea: 'Belastingrecht',
    },
  ];

  let totalTests = 0;
  let passedTests = 0;

  for (const testCase of testCases) {
    totalTests++;
    console.log(`\n📋 Test Case: ${testCase.description.substring(0, 60)}...`);
    console.log(`   Expected Area: ${testCase.expectedArea}`);

    try {
      // Create temporary case
      const [newCase] = await db.insert(cases).values({
        clientName: 'Test Client',
        clientEmail: 'test@example.com',
        caseTitle: 'Test Case',
        caseDetails: testCase.description,
        aiInferredLegalArea: testCase.expectedArea,
        status: 'pending',
      }).returning();

      // Find matching lawyers
      const matches = await findMatchingLawyers(newCase.id, 5);

      console.log(`   ✅ Found ${matches.length} matching lawyers`);

      if (matches.length > 0) {
        passedTests++;
        console.log(`   Top Match:`);
        console.log(`     - ${matches[0].lawyer.name}`);
        console.log(`     - Legal Areas: ${matches[0].lawyer.legalAreas.join(', ')}`);
        console.log(`     - Match Score: ${matches[0].matchScore}/210`);
        console.log(`     - Has Expected Area: ${matches[0].lawyer.legalAreas.includes(testCase.expectedArea) ? '✅ YES' : '❌ NO'}`);
      } else {
        console.log(`   ❌ No matches found`);
      }

      // Clean up
      await db.delete(cases).where(eq(cases.id, newCase.id));

    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Results: ${passedTests}/${totalTests} tests passed`);
  console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%\n`);

  // Show database stats
  const lawyerCount = await db.select().from(lawyers).then(r => r.length);
  const lawyersWithAreas = await db.select().from(lawyers).then(r => 
    r.filter(l => l.legalAreas && l.legalAreas.length > 0).length
  );

  console.log('📈 Database Stats:');
  console.log(`   Total Lawyers: ${lawyerCount}`);
  console.log(`   Lawyers with Legal Areas: ${lawyersWithAreas}`);
  console.log(`   Coverage: ${Math.round((lawyersWithAreas / lawyerCount) * 100)}%\n`);

  process.exit(0);
}

verifyMatching().catch(console.error);

