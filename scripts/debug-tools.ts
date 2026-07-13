/**
 * Debugging Tools for Matching System
 * 
 * Quick inspection tools for diagnosing issues with:
 * - AI legal inference
 * - Matching algorithm
 * - Lawyer data
 * - Single case testing
 * 
 * Usage:
 *   pnpm tsx server/scripts/debug-tools.ts <command> [args]
 * 
 * Commands:
 *   inference <description>     - Test AI inference with raw output
 *   matching <caseId>           - Test matching with filter trace
 *   lawyer <lawyerId>           - Inspect lawyer data
 *   single-case <description>   - End-to-end single case test
 */

import { getDb } from "../db";
import { cases, lawyers } from "../../drizzle/schema";
import { inferLegalAreas } from "../ai-legal-inference";
import { findMatchingLawyers } from "../matching";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

// ANSI color codes for better readability
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title: string) {
  console.log("\n" + "=".repeat(70));
  log("bright", title);
  console.log("=".repeat(70) + "\n");
}

/**
 * Test AI inference and show raw output
 */
async function quickTestInference(description: string) {
  section("🤖 AI Legal Inference Test");
  
  console.log("Input Description:");
  console.log(description);
  console.log();
  
  try {
    log("cyan", "Calling AI inference...");
    const startTime = Date.now();
    const result = await inferLegalAreas(description);
    const duration = Date.now() - startTime;
    
    log("green", `✓ Inference completed in ${duration}ms`);
    console.log();
    
    // Show raw result structure
    log("bright", "Raw Result Object:");
    console.log(JSON.stringify(result, null, 2));
    console.log();
    
    // Show parsed legal areas
    log("bright", "Parsed Legal Areas:");
    if (result.legalAreas && result.legalAreas.length > 0) {
      result.legalAreas.forEach((area, i) => {
        console.log(`\n  ${i + 1}. ${colors.green}${area.areaNl || "(empty)"}${colors.reset} / ${area.areaEn || "(empty)"}`);
        console.log(`     Confidence: ${area.confidence}`);
        console.log(`     Reasoning: ${area.reasoning}`);
      });
    } else {
      log("red", "  No legal areas returned!");
    }
    console.log();
    
    // Show primary area
    log("bright", "Primary Area:");
    console.log(`  ${result.primaryArea || "(none)"}`);
    console.log();
    
    // Show summary
    log("bright", "Summary:");
    console.log(`  ${result.summary || "(none)"}`);
    console.log();
    
    // Extract Dutch names for database
    const dutchNames = result.legalAreas?.map(a => a.area).filter(Boolean) || [];
    log("bright", "Dutch Names for Database:");
    console.log(`  ${JSON.stringify(dutchNames)}`);
    console.log();
    
    if (dutchNames.length === 0) {
      log("red", "⚠️  WARNING: No Dutch legal area names extracted!");
      log("yellow", "This will cause matching to fail (empty legalAreas array)");
    }
    
  } catch (error) {
    log("red", `✗ Error: ${error}`);
    console.error(error);
  }
}

/**
 * Test matching algorithm with detailed filter trace
 */
async function quickTestMatching(caseId: string) {
  section("🔍 Matching Algorithm Test");
  
  const db = await getDb();
  if (!db) {
    log("red", "✗ Database not available");
    return;
  }
  
  try {
    // Get case details
    const caseData = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    
    if (caseData.length === 0) {
      log("red", `✗ Case not found: ${caseId}`);
      return;
    }
    
    const theCase = caseData[0];
    
    log("bright", "Case Details:");
    console.log(`  ID: ${theCase.id}`);
    console.log(`  Type: ${theCase.caseType}`);
    console.log(`  Urgency: ${theCase.urgency}`);
    console.log(`  Status: ${theCase.status}`);
    console.log(`  Legal Areas: ${theCase.legalAreas}`);
    console.log(`  Location: ${theCase.latitude}, ${theCase.longitude}`);
    console.log();
    
    // Parse legal areas
    const caseLegalAreas = theCase.legalAreas ? JSON.parse(theCase.legalAreas) : [];
    log("bright", "Case Legal Areas (parsed):");
    console.log(`  ${JSON.stringify(caseLegalAreas)}`);
    console.log();
    
    if (caseLegalAreas.length === 0) {
      log("red", "⚠️  WARNING: Case has no legal areas!");
      log("yellow", "Matching will fail - case must have at least one legal area");
      return;
    }
    
    // Run matching
    log("cyan", "Running matching algorithm...");
    const startTime = Date.now();
    const matches = await findMatchingLawyers(caseId);
    const duration = Date.now() - startTime;
    
    log("green", `✓ Matching completed in ${duration}ms`);
    console.log();
    
    // Show results
    log("bright", `Found ${matches.length} matches`);
    console.log();
    
    if (matches.length > 0) {
      log("bright", "Top 5 Matches:");
      matches.slice(0, 5).forEach((match, i) => {
        console.log(`\n  ${i + 1}. ${colors.green}${match.lawyer.name}${colors.reset}`);
        console.log(`     Score: ${match.score}`);
        console.log(`     Distance: ${match.distanceKm}km`);
        console.log(`     Legal Areas: ${match.lawyer.legalAreas}`);
        console.log(`     Reason: ${match.reason}`);
      });
    } else {
      log("red", "⚠️  No matches found!");
      log("yellow", "\nPossible reasons:");
      console.log("  1. No lawyers have matching legal areas");
      console.log("  2. All lawyers filtered out by mandatory filters");
      console.log("  3. Distance limit too restrictive");
      console.log("  4. All lawyers have caseStop = Yes");
      console.log("  5. All lawyers not in good standing");
    }
    
  } catch (error) {
    log("red", `✗ Error: ${error}`);
    console.error(error);
  }
}

/**
 * Inspect lawyer data
 */
async function inspectLawyer(lawyerId: string) {
  section("👤 Lawyer Inspection");
  
  const db = await getDb();
  if (!db) {
    log("red", "✗ Database not available");
    return;
  }
  
  try {
    const lawyerData = await db.select().from(lawyers).where(eq(lawyers.id, lawyerId)).limit(1);
    
    if (lawyerData.length === 0) {
      log("red", `✗ Lawyer not found: ${lawyerId}`);
      return;
    }
    
    const lawyer = lawyerData[0];
    
    log("bright", "Basic Information:");
    console.log(`  ID: ${lawyer.id}`);
    console.log(`  Name: ${lawyer.name}`);
    console.log(`  Email: ${lawyer.email || "(none)"}`);
    console.log(`  Phone: ${lawyer.phone || "(none)"}`);
    console.log(`  Firm: ${lawyer.firmName || "(none)"}`);
    console.log();
    
    log("bright", "Location:");
    console.log(`  City: ${lawyer.city || "(none)"}`);
    console.log(`  Postal Code: ${lawyer.postalCode || "(none)"}`);
    console.log(`  Address: ${lawyer.address || "(none)"}`);
    console.log(`  Coordinates: ${lawyer.latitude || "?"}, ${lawyer.longitude || "?"}`);
    console.log();
    
    log("bright", "Legal Areas:");
    const legalAreas = lawyer.legalAreas ? JSON.parse(lawyer.legalAreas) : [];
    if (legalAreas.length > 0) {
      legalAreas.forEach((area: string, i: number) => {
        console.log(`  ${i + 1}. ${area}`);
      });
    } else {
      log("red", "  (none)");
    }
    console.log();
    
    log("bright", "Availability:");
    console.log(`  Currently Accepting: ${lawyer.currentlyAccepting || "Unknown"}`);
    console.log(`  Case Stop: ${lawyer.caseStop || "Unknown"}`);
    console.log(`  Case Load: ${lawyer.caseLoad || "Unknown"}`);
    console.log(`  Capacity: ${lawyer.capacityPercentage || "Unknown"}%`);
    console.log();
    
    log("bright", "Status:");
    console.log(`  Bar Association: ${lawyer.barAssociationStatus || "Unknown"}`);
    console.log(`  Permanently Filtered: ${lawyer.permanentlyFiltered || "No"}`);
    console.log(`  Filter Until: ${lawyer.filterUntil || "(none)"}`);
    console.log();
    
    log("bright", "Languages:");
    const languages = lawyer.languages ? JSON.parse(lawyer.languages) : [];
    console.log(`  ${languages.length > 0 ? languages.join(", ") : "(none)"}`);
    console.log();
    
    log("bright", "Experience:");
    console.log(`  Years: ${lawyer.yearsExperience || "Unknown"}`);
    console.log(`  Response History: ${lawyer.responseHistory || "(none)"}`);
    console.log();
    
  } catch (error) {
    log("red", `✗ Error: ${error}`);
    console.error(error);
  }
}

/**
 * End-to-end single case test
 */
async function testSingleCase(description: string) {
  section("🧪 Single Case End-to-End Test");
  
  const db = await getDb();
  if (!db) {
    log("red", "✗ Database not available");
    return;
  }
  
  const caseId = nanoid();
  
  try {
    // Step 1: AI Inference
    log("cyan", "Step 1: AI Legal Inference");
    const inference = await inferLegalAreas(description);
    const dutchNames = inference.legalAreas?.map(a => a.area).filter(Boolean) || [];
    
    console.log(`  Inferred: ${dutchNames.join(", ") || "(none)"}`);
    console.log(`  Primary: ${inference.primaryArea}`);
    console.log();
    
    if (dutchNames.length === 0) {
      log("red", "✗ AI inference returned no legal areas!");
      log("yellow", "Cannot proceed with matching");
      return;
    }
    
    // Step 2: Create test case
    log("cyan", "Step 2: Create Test Case");
    await db.insert(cases).values({
      id: caseId,
      userId: "test-user",
      clientName: "Test Client",
      clientEmail: "test@example.com",
      caseType: "Debug Test",
      caseSummary: description,
      urgency: "High",
      status: "Matching",
      legalAreas: JSON.stringify(dutchNames),
    });
    console.log(`  Case ID: ${caseId}`);
    console.log();
    
    // Step 3: Run matching
    log("cyan", "Step 3: Run Matching Algorithm");
    const matches = await findMatchingLawyers(caseId);
    console.log(`  Found: ${matches.length} matches`);
    console.log();
    
    if (matches.length > 0) {
      log("green", "✓ SUCCESS: Matching working!");
      console.log();
      log("bright", "Top 3 Matches:");
      matches.slice(0, 3).forEach((match, i) => {
        console.log(`\n  ${i + 1}. ${match.name}`);
        console.log(`     Score: ${match.matchScore} | Distance: ${match.distance}km`);
        console.log(`     Reasons: ${match.matchReasons.join(", ")}`);
      });
    } else {
      log("red", "✗ FAILURE: No matches found");
      log("yellow", "\nDebugging suggestions:");
      console.log("  1. Check if lawyers have these legal areas:");
      dutchNames.forEach(area => console.log(`     - ${area}`));
      console.log("  2. Run: pnpm tsx server/scripts/debug-tools.ts matching " + caseId);
      console.log("  3. Check lawyer availability filters");
    }
    console.log();
    
    // Cleanup
    log("cyan", "Cleaning up test case...");
    await db.delete(cases).where(eq(cases.id, caseId));
    log("green", "✓ Done");
    
  } catch (error) {
    log("red", `✗ Error: ${error}`);
    console.error(error);
    
    // Cleanup on error
    try {
      await db.delete(cases).where(eq(cases.id, caseId));
    } catch {}
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  if (!command) {
    console.log("Usage: pnpm tsx server/scripts/debug-tools.ts <command> [args]");
    console.log("\nCommands:");
    console.log("  inference <description>     - Test AI inference with raw output");
    console.log("  matching <caseId>           - Test matching with filter trace");
    console.log("  lawyer <lawyerId>           - Inspect lawyer data");
    console.log("  single-case <description>   - End-to-end single case test");
    console.log("\nExamples:");
    console.log('  pnpm tsx server/scripts/debug-tools.ts inference "I was fired unfairly"');
    console.log('  pnpm tsx server/scripts/debug-tools.ts matching abc123');
    console.log('  pnpm tsx server/scripts/debug-tools.ts lawyer xyz789');
    console.log('  pnpm tsx server/scripts/debug-tools.ts single-case "Car accident injury"');
    process.exit(1);
  }
  
  switch (command) {
    case "inference":
      if (!arg) {
        log("red", "Error: Description required");
        process.exit(1);
      }
      await quickTestInference(arg);
      break;
      
    case "matching":
      if (!arg) {
        log("red", "Error: Case ID required");
        process.exit(1);
      }
      await quickTestMatching(arg);
      break;
      
    case "lawyer":
      if (!arg) {
        log("red", "Error: Lawyer ID required");
        process.exit(1);
      }
      await inspectLawyer(arg);
      break;
      
    case "single-case":
      if (!arg) {
        log("red", "Error: Description required");
        process.exit(1);
      }
      await testSingleCase(arg);
      break;
      
    default:
      log("red", `Unknown command: ${command}`);
      process.exit(1);
  }
  
  process.exit(0);
}

main();

