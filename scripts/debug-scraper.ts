#!/usr/bin/env tsx

/**
 * Debug script to check NOvA website structure
 */

import { chromium } from 'playwright';

async function debug() {
  console.log('[Debug] Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const baseUrl = 'https://zoekeenadvocaat.advocatenorde.nl/zoeken';
  const params = new URLSearchParams({
    type: 'advocaten',
    q: '',
    'locatie[adres]': '',
    'locatie[geo]': 'false',
    'locatie[hash]': '',
    'filters[rechtsgebieden]': '[]',
    'filters[specialisatieverenigingen]': '[]',
    'filters[toevoegingen]': '0',
  });
  const searchUrl = `${baseUrl}?${params.toString()}`;

  console.log(`[Debug] Navigating to: ${searchUrl}`);
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  
  console.log('[Debug] Waiting for page to load...');
  await page.waitForTimeout(5000);

  // Take screenshot
  await page.screenshot({ path: '/home/ubuntu/nova-debug.png', fullPage: true });
  console.log('[Debug] Screenshot saved to /home/ubuntu/nova-debug.png');

  // Try different selectors
  console.log('\n[Debug] Testing selectors:');
  
  const selectors = [
    '.zoekresultaat-item',
    'article',
    '[class*="result"]',
    '[class*="lawyer"]',
    '[class*="advocaat"]',
    '.card',
    '[data-testid*="result"]'
  ];

  for (const selector of selectors) {
    const elements = await page.$$(selector);
    console.log(`  ${selector}: ${elements.length} elements`);
  }

  // Get page HTML structure
  console.log('\n[Debug] Page structure:');
  const bodyHTML = await page.evaluate(() => {
    const body = document.body;
    const classes = Array.from(body.querySelectorAll('[class]'))
      .map(el => el.className)
      .filter(c => c && typeof c === 'string')
      .slice(0, 20);
    return {
      title: document.title,
      bodyClasses: body.className,
      uniqueClasses: [...new Set(classes)]
    };
  });
  console.log(JSON.stringify(bodyHTML, null, 2));

  // Check for results text
  const pageText = await page.textContent('body');
  if (pageText?.includes('advocaten gevonden')) {
    const match = pageText.match(/(\d+)\s+advocaten gevonden/);
    if (match) {
      console.log(`\n[Debug] Found text: "${match[0]}"`);
    }
  }

  console.log('\n[Debug] Press Ctrl+C to close browser...');
  await new Promise(() => {}); // Keep browser open
}

debug().catch(console.error);

