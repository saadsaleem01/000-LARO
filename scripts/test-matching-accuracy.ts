#!/usr/bin/env tsx
/**
 * Test Matching Accuracy with Sample Cases
 * 
 * Creates sample cases and tests the matching algorithm's accuracy
 * including keyword-based confidence boosting from 877k court cases.
 */

import { getDb, createCase } from "../db";
import { lawyers, cases } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { findMatchingLawyers } from "../matching";
import { inferLegalAreas } from "../ai-legal-inference";

interface TestCase {
  title: string;
  summary: string;
  expectedAreas: string[];
  expectedKeywords?: string[];
}

const testCases: TestCase[] = [
  {
    title: "Workplace Discrimination Case",
    summary: "Ik ben ontslagen na het melden van discriminatie op de werkplek. Mijn werkgever heeft mijn contract beëindigd zonder geldige reden. Ik wil mijn baan terug of een vergoeding.",
    expectedAreas: ["Arbeidsrecht"],
    expectedKeywords: ["ontslag", "discriminatie", "werkgever", "contract"],
  },
  {
    title: "Rental Dispute",
    summary: "Mijn verhuurder weigert mijn borg terug te geven na het beëindigen van het huurcontract. De woning was in goede staat bij vertrek. Er zijn geen schades.",
    expectedAreas: ["Huurrecht"],
    expectedKeywords: ["verhuurder", "borg", "huurcontract", "woning"],
  },
  {
    title: "Traffic Accident Injury",
    summary: "Ik ben gewond geraakt bij een verkeersongeval. De andere bestuurder reed door rood licht. Ik heb medische kosten en kan niet werken. Ik wil schadevergoeding.",
    expectedAreas: ["Letselschade", "Aansprakelijkheidsrecht"],
    expectedKeywords: ["verkeersongeval", "gewond", "schadevergoeding", "bestuurder"],
  },
  {
    title: "Criminal Defense",
    summary: "Ik ben beschuldigd van diefstal maar ik ben onschuldig. De politie heeft mij gearresteerd op basis van verkeerde informatie. Ik heb een advocaat nodig voor mijn verdediging.",
    expectedAreas: ["Strafrecht"],
    expectedKeywords: ["beschuldigd", "diefstal", "politie", "verdediging"],
  },
  {
    title: "Tax Dispute",
    summary: "De Belastingdienst heeft een naheffingsaanslag opgelegd die ik onterecht vind. Ik wil bezwaar maken tegen deze aanslag en zoek juridische bijstand.",
    expectedAreas: ["Belastingrecht"],
    expectedKeywords: ["belastingdienst", "naheffingsaanslag", "bezwaar", "aanslag"],
  },
];

async function testMatchingAccuracy() {
  console.log("=".repeat(80));
  console.log("TESTING MATCHING ACCURACY WITH SAMPLE CASES");
  console.log("=".repeat(80));
  console.log();

  const db = await getDb();
  
  // Get total lawyers in database
  const allLawyers = await db.select().from(lawyers);
  console.log(`📊 Database: ${allLawyers.length} lawyers available for matching\n`);

  let totalTests = 0;
  let successfulMatches = 0;
  let keywordBoosts = 0;

  for (const testCase of testCases) {
    totalTests++;
    console.log(`\n${"=".repeat(80)}`);
    console.log(`TEST CASE ${totalTests}: ${testCase.title}`);
    console.log(`${"=".repeat(80)}`);
    console.log(`\n📝 Summary: ${testCase.summary}\n`);

    // Step 1: Test AI Legal Area Inference
    console.log("🤖 Step 1: AI Legal Area Inference");
    console.log("-".repeat(80));
    
    const inference = await inferLegalAreas(testCase.summary);
    console.log(`Primary Area: ${inference.primaryArea}`);
    console.log(`Detected Areas (${inference.legalAreas.length}):`);
    inference.legalAreas.forEach(area => {
      console.log(`  - ${area.area} (${(area.confidence * 100).toFixed(0)}% confidence)`);
      console.log(`    Reasoning: ${area.reasoning}`);
    });

    // Check if expected areas were detected
    const detectedAreaNames = inference.legalAreas.map(a => a.area);
    const expectedFound = testCase.expectedAreas.filter(expected =>
      detectedAreaNames.includes(expected)
    );
    
    console.log(`\n✅ Expected areas found: ${expectedFound.length}/${testCase.expectedAreas.length}`);
    if (expectedFound.length < testCase.expectedAreas.length) {
      const missed = testCase.expectedAreas.filter(e => !detectedAreaNames.includes(e));
      console.log(`⚠️  Missed areas: ${missed.join(", ")}`);
    }

    // Step 2: Create a test case in database
    console.log(`\n📋 Step 2: Creating Test Case in Database`);
    console.log("-".repeat(80));
    
    const insertedCase = await createCase({
      userId: "test-user",
      clientName: "Test Client",
      clientEmail: "test@example.com",
      clientPhone: "0612345678",
      clientAddress: "Utrecht, Netherlands",
      caseType: inference.primaryArea,
      caseSummary: testCase.summary,
      urgency: "Medium",
      legalAreas: JSON.stringify(detectedAreaNames),
    });

    console.log(`✅ Case created with ID: ${insertedCase.id}`);
    
    // Add coordinates to case (Utrecht)
    await db.update(cases)
      .set({ latitude: "52.0907", longitude: "5.1214" })
      .where(eq(cases.id, insertedCase.id));

    // Step 3: Test Matching Algorithm
    console.log(`\n🎯 Step 3: Testing Matching Algorithm`);
    console.log("-".repeat(80));

    try {
      const matches = await findMatchingLawyers(insertedCase.id, {
        maxDistance: 100,
        maxResults: 10,
        sortBy: "score",
      });

      console.log(`\n📊 Matching Results: ${matches.length} lawyers found\n`);

      if (matches.length > 0) {
        successfulMatches++;
        
        // Show top 3 matches
        const topMatches = matches.slice(0, 3);
        topMatches.forEach((match, index) => {
          console.log(`${index + 1}. ${match.name} (Score: ${match.matchScore})`);
          console.log(`   Legal Areas: ${match.legalAreas.join(", ")}`);
          console.log(`   Distance: ${match.distance} km`);
          console.log(`   Match Reasons:`);
          match.matchReasons.forEach(reason => {
            console.log(`     - ${reason}`);
            if (reason.includes("Legal terminology match")) {
              keywordBoosts++;
            }
          });
          console.log();
        });

        // Analyze keyword boost effectiveness
        const matchesWithKeywordBoost = matches.filter(m =>
          m.matchReasons.some(r => r.includes("Legal terminology match"))
        );
        
        if (matchesWithKeywordBoost.length > 0) {
          console.log(`✅ Keyword Boost Active: ${matchesWithKeywordBoost.length}/${matches.length} matches`);
        } else {
          console.log(`⚠️  No keyword boost applied (case may not contain court case terminology)`);
        }
      } else {
        console.log(`⚠️  No matching lawyers found`);
        console.log(`   This could mean:`);
        console.log(`   - No lawyers with matching legal areas in database`);
        console.log(`   - All lawyers are filtered out (case-stop, distance, etc.)`);
      }

    } catch (error) {
      console.error(`❌ Matching failed:`, error);
    }

    // Clean up: delete test case
    await db.delete(cases).where(eq(cases.id, insertedCase.id));
  }

  // Summary
  console.log(`\n\n${"=".repeat(80)}`);
  console.log("TEST SUMMARY");
  console.log(`${"=".repeat(80)}`);
  console.log(`Total Test Cases: ${totalTests}`);
  console.log(`Successful Matches: ${successfulMatches}/${totalTests} (${((successfulMatches/totalTests)*100).toFixed(0)}%)`);
  console.log(`Keyword Boosts Applied: ${keywordBoosts}`);
  console.log(`\n✅ Testing complete!`);
}

// Run tests
testMatchingAccuracy().catch(console.error);

