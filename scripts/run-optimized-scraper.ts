#!/usr/bin/env tsx

/**
 * Run optimized lawyer scraper with resume capability
 * 
 * Usage:
 *   pnpm tsx server/scripts/run-optimized-scraper.ts [startPage]
 * 
 * Examples:
 *   pnpm tsx server/scripts/run-optimized-scraper.ts        # Resume from last checkpoint
 *   pnpm tsx server/scripts/run-optimized-scraper.ts 1      # Start from page 1
 *   pnpm tsx server/scripts/run-optimized-scraper.ts 100    # Start from page 100
 */

import { scrapeLayersOptimized, resumeScraper } from '../scraper-optimized';

async function main() {
  const args = process.argv.slice(2);
  const startPage = args[0] ? parseInt(args[0]) : null;

  console.log('========================================');
  console.log('  Optimized NOvA Lawyer Scraper');
  console.log('========================================\n');

  try {
    if (startPage) {
      console.log(`Starting scraper from page ${startPage}...\n`);
      await scrapeLayersOptimized({
        startPage,
        maxPages: 1500,
        delayMs: 2000,
        checkpointInterval: 10,
        restartBrowserInterval: 20
      });
    } else {
      console.log('Resuming scraper from last checkpoint...\n');
      await resumeScraper();
    }

    console.log('\n✅ Scraper completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Scraper failed:', error);
    process.exit(1);
  }
}

main();

