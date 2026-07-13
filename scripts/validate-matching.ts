/**
 * Comprehensive Matching Algorithm Validation
 * 
 * Tests the matching algorithm with diverse cases across all legal areas
 * Measures precision, recall, and match quality
 * 
 * Usage:
 *   pnpm tsx server/scripts/validate-matching.ts [--verbose]
 */

import { getDb } from "../db";
import { cases, lawyers } from "../../drizzle/schema";
import { findMatchingLawyers } from "../matching";
import { inferLegalAreas } from "../ai-legal-inference";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

interface TestCase {
  id: string;
  name: string;
  description: string;
  expectedLegalArea: string;
  expectedKeywords?: string[];
  clientLocation?: { lat: number; lng: number };
  urgency: "Low" | "Medium" | "High";
}

// Comprehensive test cases covering all 5 legal areas
const testCases: TestCase[] = [
  // Arbeidsrecht (Employment Law)
  {
    id: nanoid(),
    name: "Wrongful Termination",
    description: "I was fired without proper notice after 5 years of employment. My employer claims it was due to performance issues, but I believe it was retaliation for reporting safety violations. I need help with wrongful dismissal and potential discrimination claims.",
    expectedLegalArea: "Arbeidsrecht",
    expectedKeywords: ["ontslag", "arbeidsovereenkomst", "werkgever"],
    clientLocation: { lat: 52.3676, lng: 4.9041 }, // Amsterdam
    urgency: "High",
  },
  {
    id: nanoid(),
    name: "Workplace Discrimination",
    description: "I've been experiencing discrimination at work based on my age. Younger colleagues are getting promotions while I'm being passed over despite better qualifications. Need legal advice on age discrimination in the workplace.",
    expectedLegalArea: "Arbeidsrecht",
    expectedKeywords: ["discriminatie", "leeftijd", "werk"],
    clientLocation: { lat: 51.9225, lng: 4.47917 }, // Rotterdam
    urgency: "Medium",
  },
  {
    id: nanoid(),
    name: "Unpaid Overtime",
    description: "My employer has not paid me for 6 months of overtime work. I have documented all the extra hours but they refuse to compensate me. I need help recovering my wages.",
    expectedLegalArea: "Arbeidsrecht",
    expectedKeywords: ["loon", "overwerk", "betaling"],
    clientLocation: { lat: 52.0907, lng: 5.12142 }, // Utrecht
    urgency: "High",
  },

  // Huurrecht (Rental Law)
  {
    id: nanoid(),
    name: "Landlord Refusing Repairs",
    description: "My landlord refuses to fix a leaking roof that's causing mold in my apartment. I've reported it multiple times but nothing has been done. The mold is affecting my health and I want to know my rights.",
    expectedLegalArea: "Huurrecht",
    expectedKeywords: ["verhuurder", "onderhoud", "huurwoning"],
    clientLocation: { lat: 52.0907, lng: 5.12142 }, // Utrecht
    urgency: "High",
  },
  {
    id: nanoid(),
    name: "Unfair Rent Increase",
    description: "My landlord wants to increase my rent by 25% which seems excessive. I've been a good tenant for 3 years and always paid on time. Is this legal and what can I do?",
    expectedLegalArea: "Huurrecht",
    expectedKeywords: ["huurverhoging", "huurprijs", "huurcontract"],
    clientLocation: { lat: 52.3676, lng: 4.9041 }, // Amsterdam
    urgency: "Medium",
  },
  {
    id: nanoid(),
    name: "Eviction Notice",
    description: "I received an eviction notice but I don't understand why. I've paid all my rent on time and haven't violated any terms of the lease. The landlord wants me out in 30 days.",
    expectedLegalArea: "Huurrecht",
    expectedKeywords: ["ontruiming", "opzegging", "huurovereenkomst"],
    clientLocation: { lat: 51.9225, lng: 4.47917 }, // Rotterdam
    urgency: "High",
  },

  // Letselschaderecht (Personal Injury)
  {
    id: nanoid(),
    name: "Car Accident Injury",
    description: "I was hit by a car while crossing the street. I suffered a broken leg and have been unable to work for 3 months. The driver's insurance is offering a low settlement that doesn't cover my medical bills or lost wages.",
    expectedLegalArea: "Letselschaderecht",
    expectedKeywords: ["verkeersongeval", "letselschade", "schadevergoeding"],
    clientLocation: { lat: 52.3676, lng: 4.9041 }, // Amsterdam
    urgency: "High",
  },
  {
    id: nanoid(),
    name: "Workplace Injury",
    description: "I injured my back at work due to faulty equipment. My employer is claiming it was my fault and won't cover my medical expenses. I need help with a workplace injury claim.",
    expectedLegalArea: "Letselschaderecht",
    expectedKeywords: ["arbeidsongeval", "letsel", "werkgever"],
    clientLocation: { lat: 51.9225, lng: 4.47917 }, // Rotterdam
    urgency: "Medium",
  },
  {
    id: nanoid(),
    name: "Medical Malpractice",
    description: "I had surgery that went wrong due to the surgeon's negligence. I now have permanent complications and need ongoing treatment. I want to pursue a medical malpractice claim.",
    expectedLegalArea: "Letselschaderecht",
    expectedKeywords: ["medische fout", "arts", "ziekenhuis"],
    clientLocation: { lat: 52.0907, lng: 5.12142 }, // Utrecht
    urgency: "High",
  },

  // Strafrecht (Criminal Law)
  {
    id: nanoid(),
    name: "Theft Accusation",
    description: "I've been accused of theft at my workplace but I'm innocent. The police want to question me and I need legal representation. I'm worried about being wrongly convicted.",
    expectedLegalArea: "Strafrecht",
    expectedKeywords: ["diefstal", "beschuldiging", "politie"],
    clientLocation: { lat: 52.3676, lng: 4.9041 }, // Amsterdam
    urgency: "High",
  },
  {
    id: nanoid(),
    name: "Assault Charge",
    description: "I'm being charged with assault after a fight at a bar. It was self-defense but the other person is pressing charges. I need a criminal defense lawyer urgently.",
    expectedLegalArea: "Strafrecht",
    expectedKeywords: ["mishandeling", "zelfverdediging", "aanklacht"],
    clientLocation: { lat: 51.9225, lng: 4.47917 }, // Rotterdam
    urgency: "High",
  },
  {
    id: nanoid(),
    name: "Drug Possession",
    description: "I was stopped by police and they found a small amount of drugs in my car. I'm facing criminal charges and need legal advice on how to handle this situation.",
    expectedLegalArea: "Strafrecht",
    expectedKeywords: ["drugs", "bezit", "strafbaar"],
    clientLocation: { lat: 52.0907, lng: 5.12142 }, // Utrecht
    urgency: "High",
  },

  // Belastingrecht (Tax Law)
  {
    id: nanoid(),
    name: "Tax Audit Dispute",
    description: "The tax authority is auditing my business and claiming I owe significant back taxes. I disagree with their assessment and need help challenging their findings.",
    expectedLegalArea: "Belastingrecht",
    expectedKeywords: ["belasting", "controle", "bezwaar"],
    clientLocation: { lat: 52.3676, lng: 4.9041 }, // Amsterdam
    urgency: "Medium",
  },
  {
    id: nanoid(),
    name: "VAT Compliance Issue",
    description: "I'm a small business owner and I'm having trouble with VAT compliance. The tax office says I made errors in my filings and wants to impose penalties. I need expert tax law advice.",
    expectedLegalArea: "Belastingrecht",
    expectedKeywords: ["btw", "aangifte", "boete"],
    clientLocation: { lat: 51.9225, lng: 4.47917 }, // Rotterdam
    urgency: "Medium",
  },
  {
    id: nanoid(),
    name: "Inheritance Tax",
    description: "I inherited property from my parents and now face a large inheritance tax bill. I want to know if there are legal ways to reduce this tax burden.",
    expectedLegalArea: "Belastingrecht",
    expectedKeywords: ["erfbelasting", "nalatenschap", "onroerend goed"],
    clientLocation: { lat: 52.0907, lng: 5.12142 }, // Utrecht
    urgency: "Low",
  },
];

interface ValidationResult {
  testCase: TestCase;
  matchesFound: number;
  topMatch: any;
  correctLegalArea: boolean;
  matchScore: number;
  distanceKm: number;
  matchReason: string;
}

async function runValidation(verbose: boolean = false) {
  console.log("\n🧪 Comprehensive Matching Algorithm Validation");
  console.log("=".repeat(70));
  console.log(`Test Cases: ${testCases.length}`);
  console.log(`Verbose Mode: ${verbose ? "ON" : "OFF"}`);
  console.log("=".repeat(70) + "\n");

  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    process.exit(1);
  }

  const results: ValidationResult[] = [];
  let totalCorrect = 0;
  let totalWithMatches = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    console.log(`\n[${i + 1}/${testCases.length}] ${testCase.name}`);
    console.log(`Expected: ${testCase.expectedLegalArea}`);
    console.log(`Location: ${testCase.clientLocation ? "Provided" : "None"}`);
    
    if (verbose) {
      console.log(`Description: ${testCase.description.substring(0, 100)}...`);
    }

    try {
      // Infer legal areas using AI
      const inference = await inferLegalAreas(testCase.description);
      
      // Extract Dutch legal area names from inference result
      const legalAreaNames = inference.legalAreas.map(area => area.area);
      
      if (verbose) {
        console.log(`AI Inferred: ${legalAreaNames.join(", ")}`);
      }

      // Create temporary test case in database
      await db.insert(cases).values({
        id: testCase.id,
        userId: "test-user",
        clientName: "Test Client",
        clientEmail: "test@example.com",
        caseType: testCase.name,
        caseSummary: testCase.description,
        urgency: testCase.urgency,
        status: "Matching",
        latitude: testCase.clientLocation?.lat.toString(),
        longitude: testCase.clientLocation?.lng.toString(),
        legalAreas: JSON.stringify(legalAreaNames),
      });

      // Find matching lawyers
      const matches = await findMatchingLawyers(testCase.id);

      const matchesFound = matches.length;
      totalWithMatches += matchesFound > 0 ? 1 : 0;

      if (matchesFound === 0) {
        console.log(`❌ No matches found`);
        results.push({
          testCase,
          matchesFound: 0,
          topMatch: null,
          correctLegalArea: false,
          matchScore: 0,
          distanceKm: 0,
          matchReason: "No matches",
        });
        continue;
      }

      const topMatch = matches[0];
      
      // Check if top match has the expected legal area
      const lawyerLegalAreas = topMatch.legalAreas || [];
      const correctLegalArea = lawyerLegalAreas.some((area: string) => 
        area.toLowerCase().includes(testCase.expectedLegalArea.toLowerCase())
      );

      if (correctLegalArea) {
        totalCorrect++;
        console.log(`✅ Correct! Found ${matchesFound} matches`);
      } else {
        console.log(`❌ Wrong legal area. Found ${matchesFound} matches`);
      }

      console.log(`   Top Match: ${topMatch.lawyer.name}`);
      console.log(`   Score: ${topMatch.score} | Distance: ${topMatch.distanceKm}km`);
      console.log(`   Legal Areas: ${lawyerLegalAreas.join(", ")}`);
      console.log(`   Reason: ${topMatch.reason}`);

      results.push({
        testCase,
        matchesFound,
        topMatch,
        correctLegalArea,
        matchScore: topMatch.score,
        distanceKm: topMatch.distanceKm,
        matchReason: topMatch.reason,
      });

    } catch (error) {
      console.log(`❌ Error: ${error}`);
      results.push({
        testCase,
        matchesFound: 0,
        topMatch: null,
        correctLegalArea: false,
        matchScore: 0,
        distanceKm: 0,
        matchReason: `Error: ${error}`,
      });
    }
  }

  // Calculate statistics
  console.log("\n" + "=".repeat(70));
  console.log("📊 Validation Results");
  console.log("=".repeat(70));
  console.log(`\nTotal Test Cases: ${testCases.length}`);
  console.log(`Cases with Matches: ${totalWithMatches} (${Math.round(totalWithMatches / testCases.length * 100)}%)`);
  console.log(`Correct Legal Area: ${totalCorrect} (${Math.round(totalCorrect / testCases.length * 100)}%)`);
  console.log(`Precision: ${totalWithMatches > 0 ? Math.round(totalCorrect / totalWithMatches * 100) : 0}%`);

  // Breakdown by legal area
  console.log("\n📋 Results by Legal Area:");
  const legalAreas = ["Arbeidsrecht", "Huurrecht", "Letselschaderecht", "Strafrecht", "Belastingrecht"];
  
  for (const area of legalAreas) {
    const areaResults = results.filter(r => r.testCase.expectedLegalArea === area);
    const areaCorrect = areaResults.filter(r => r.correctLegalArea).length;
    const areaWithMatches = areaResults.filter(r => r.matchesFound > 0).length;
    
    console.log(`\n  ${area}:`);
    console.log(`    Test Cases: ${areaResults.length}`);
    console.log(`    With Matches: ${areaWithMatches}`);
    console.log(`    Correct: ${areaCorrect}`);
    console.log(`    Accuracy: ${areaResults.length > 0 ? Math.round(areaCorrect / areaResults.length * 100) : 0}%`);
  }

  // Average scores and distances
  const resultsWithMatches = results.filter(r => r.matchesFound > 0);
  if (resultsWithMatches.length > 0) {
    const avgScore = resultsWithMatches.reduce((sum, r) => sum + r.matchScore, 0) / resultsWithMatches.length;
    const avgDistance = resultsWithMatches.reduce((sum, r) => sum + r.distanceKm, 0) / resultsWithMatches.length;
    
    console.log("\n📈 Average Metrics (for cases with matches):");
    console.log(`  Average Match Score: ${avgScore.toFixed(2)}`);
    console.log(`  Average Distance: ${avgDistance.toFixed(2)}km`);
  }

  console.log("\n" + "=".repeat(70) + "\n");

  // Cleanup: Delete test cases
  console.log("🧹 Cleaning up test cases...");
  for (const testCase of testCases) {
    try {
      await db.delete(cases).where(eq(cases.id, testCase.id));
    } catch (error) {
      // Ignore errors during cleanup
    }
  }
  console.log("✅ Cleanup complete\n");
  
  process.exit(0);
}

// Parse command line arguments
const verbose = process.argv.includes("--verbose");

runValidation(verbose);

