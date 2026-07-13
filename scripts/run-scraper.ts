/**
 * CLI Script to run the Dutch Bar Association scraper
 * 
 * Usage:
 *   pnpm tsx server/scripts/run-scraper.ts [options]
 * 
 * Options:
 *   --pages <number>     Number of pages to scrape (default: 1)
 *   --delay <ms>         Delay between requests in ms (default: 1000)
 *   --legal-area <area>  Filter by legal area
 *   --city <city>        Filter by city
 *   --test               Run test mode (1 page only)
 *   --save               Save results to database
 */

import { scrapeLawyers, testScraper, type ScrapedLawyer } from '../scraper-nova';
import { getDb } from '../db';
import { lawyers } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

interface CliOptions {
  pages: number;
  delay: number;
  legalArea?: string;
  city?: string;
  test: boolean;
  save: boolean;
  deep: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    pages: 1,
    delay: 1000,
    test: false,
    save: false,
    deep: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--pages':
        options.pages = parseInt(args[++i]);
        break;
      case '--delay':
        options.delay = parseInt(args[++i]);
        break;
      case '--legal-area':
        options.legalArea = args[++i];
        break;
      case '--city':
        options.city = args[++i];
        break;
      case '--test':
        options.test = true;
        break;
      case '--save':
        options.save = true;
        break;
      case '--deep':
        options.deep = true;
        break;
      case '--help':
        console.log(`
Dutch Bar Association Scraper

Usage:
  pnpm tsx server/scripts/run-scraper.ts [options]

Options:
  --pages <number>     Number of pages to scrape (default: 1)
  --delay <ms>         Delay between requests in ms (default: 1000)
  --legal-area <area>  Filter by legal area
  --city <city>        Filter by city
  --test               Run test mode (1 page only)
  --save               Save results to database
  --deep               Visit profile pages for detailed info (slower but complete)
  --help               Show this help message

Examples:
  # Test scraper (1 page, no save)
  pnpm tsx server/scripts/run-scraper.ts --test

  # Scrape 5 pages and save to database
  pnpm tsx server/scripts/run-scraper.ts --pages 5 --save

  # Scrape lawyers in Amsterdam
  pnpm tsx server/scripts/run-scraper.ts --city Amsterdam --pages 10 --save

  # Scrape criminal lawyers
  pnpm tsx server/scripts/run-scraper.ts --legal-area "Strafrecht" --pages 20 --save
        `);
        process.exit(0);
    }
  }

  return options;
}

async function saveLawyerToDatabase(lawyer: ScrapedLawyer): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');
    
    // Check if lawyer already exists by novaId
    const existingResult = await db
      .select()
      .from(lawyers)
      .where(eq(lawyers.id, lawyer.novaId))
      .limit(1);
    
    const existing = existingResult.length > 0 ? existingResult[0] : null;

    // Prepare lawyer data
    const lawyerData = {
      id: lawyer.novaId || nanoid(),
      name: lawyer.name,
      email: lawyer.email || null,
      phone: lawyer.phone || null,
      address: lawyer.address || null,
      city: lawyer.city || null,
      postalCode: lawyer.postalCode || null,
      website: lawyer.website || null,
      languages: JSON.stringify(['Nederlands']), // Default to Dutch
      legalAreas: JSON.stringify(lawyer.legalAreas),
      experienceYears: calculateExperience(lawyer.admissionDate).toString(),
      specializationAssociations: JSON.stringify(lawyer.specializations),
      latitude: null, // Will be geocoded later
      longitude: null, // Will be geocoded later
      caseStop: 'No' as const,
      barAssociationStatus: 'Good Standing',
      currentlyAccepting: 'Yes' as const,
      caseLoad: '0',
      capacityPercentage: '0',
      totalOutreaches: '0',
      totalResponses: '0',
      totalAcceptances: '0',
      averageResponseTimeHours: null,
      lastContactedAt: null,
      permanentlyFiltered: 'No' as const,
      filterUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (existing) {
      // Update existing lawyer
      await db
        .update(lawyers)
        .set({
          name: lawyerData.name,
          email: lawyerData.email,
          phone: lawyerData.phone,
          address: lawyerData.address,
          city: lawyerData.city,
          postalCode: lawyerData.postalCode,
          website: lawyerData.website,
          legalAreas: lawyerData.legalAreas,
          experienceYears: lawyerData.experienceYears,
          specializationAssociations: lawyerData.specializationAssociations,
          barAssociationStatus: lawyerData.barAssociationStatus,
          updatedAt: lawyerData.updatedAt,
        })
        .where(eq(lawyers.id, lawyer.novaId));
      
      console.log(`✅ Updated: ${lawyer.name} (${lawyer.city})`);
    } else {
      // Insert new lawyer
      await db.insert(lawyers).values(lawyerData);
      console.log(`✨ Added: ${lawyer.name} (${lawyer.city})`);
    }
  } catch (error) {
    console.error(`❌ Error saving ${lawyer.name}:`, error);
    throw error;
  }
}

function calculateExperience(admissionDate?: string): number {
  if (!admissionDate) return 0;
  
  try {
    const [day, month, year] = admissionDate.split('-').map(Number);
    const admission = new Date(year, month - 1, day);
    const now = new Date();
    const years = (now.getTime() - admission.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return Math.max(0, Math.floor(years));
  } catch {
    return 0;
  }
}

async function main() {
  const options = parseArgs();

  console.log('🚀 Dutch Bar Association Scraper');
  console.log('================================\n');

  if (options.test) {
    console.log('Running in TEST mode (1 page, no save)\n');
    const result = await testScraper();
    console.log('\n✅ Test complete!');
    console.log(`Found ${result.lawyers.length} lawyers`);
    
    if (result.lawyers.length > 0) {
      console.log('\nSample lawyer:');
      console.log(JSON.stringify(result.lawyers[0], null, 2));
    }
    
    process.exit(0);
  }

  console.log('Configuration:');
  console.log(`  Pages: ${options.pages}`);
  console.log(`  Delay: ${options.delay}ms`);
  console.log(`  Deep Scrape: ${options.deep ? 'Yes (visits profile pages)' : 'No (basic info only)'}`);
  if (options.legalArea) console.log(`  Legal Area: ${options.legalArea}`);
  if (options.city) console.log(`  City: ${options.city}`);
  console.log(`  Save to DB: ${options.save ? 'Yes' : 'No'}`);
  console.log('');

  const estimatedTime = (options.pages * 10 * options.delay) / 1000 / 60;
  console.log(`⏱️  Estimated time: ~${estimatedTime.toFixed(1)} minutes\n`);

  // Run scraper
  console.log('🔍 Starting scraper...\n');
  const result = await scrapeLawyers({
    maxPages: options.pages,
    delayMs: options.delay,
    legalArea: options.legalArea,
    city: options.city,
    headless: true,
    deepScrape: options.deep,
  });

  console.log('\n📊 Scraping Results:');
  console.log(`  Lawyers found: ${result.stats.lawyersScraped}`);
  console.log(`  Pages processed: ${result.stats.pagesProcessed}`);
  console.log(`  Errors: ${result.stats.errors}`);
  console.log(`  Duration: ${(result.stats.duration! / 1000).toFixed(1)}s`);

  // Save to database if requested
  if (options.save) {
    console.log('\n💾 Saving to database...\n');
    
    let saved = 0;
    let failed = 0;
    
    for (const lawyer of result.lawyers) {
      try {
        await saveLawyerToDatabase(lawyer);
        saved++;
      } catch (error) {
        failed++;
        console.error(`Failed to save ${lawyer.name}:`, error);
      }
    }
    
    console.log(`\n✅ Database save complete!`);
    console.log(`  Saved: ${saved}`);
    console.log(`  Failed: ${failed}`);
  } else {
    console.log('\n⚠️  Results not saved (use --save to save to database)');
    console.log('\nSample lawyers:');
    result.lawyers.slice(0, 3).forEach((lawyer, i) => {
      console.log(`\n${i + 1}. ${lawyer.name}`);
      console.log(`   Firm: ${lawyer.firmName}`);
      console.log(`   City: ${lawyer.city}`);
      console.log(`   Areas: ${lawyer.legalAreas.join(', ')}`);
      console.log(`   Email: ${lawyer.email || 'N/A'}`);
    });
  }

  console.log('\n🎉 Scraping complete!');
  process.exit(0);
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

