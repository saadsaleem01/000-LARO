#!/usr/bin/env tsx

/**
 * Test lawyer data extraction from actual page
 */

import { chromium } from 'playwright';

async function testExtraction() {
  console.log('[Test] Launching browser...');
  const browser = await chromium.launch({ headless: true });
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

  console.log('[Test] Navigating to search page...');
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  console.log('[Test] Finding lawyer cards...');
  
  // Try multiple selectors
  const selectors = [
    '[class*="lawyer"] > div',
    '[class*="lawyer"] > *',
    '[class*="result"] a[href*="/advocaten/"]',
    'a[href*="/advocaten/"]'
  ];
  
  let lawyerCards: any[] = [];
  let usedSelector = '';
  
  for (const selector of selectors) {
    const cards = await page.$$(selector);
    console.log(`  ${selector}: ${cards.length} elements`);
    if (cards.length >= 10 && cards.length <= 30) {
      lawyerCards = cards;
      usedSelector = selector;
      break;
    }
  }
  
  console.log(`\n[Test] Using selector: ${usedSelector}`);
  console.log(`[Test] Found ${lawyerCards.length} lawyer cards\n`);

  // Test extraction on first 3 lawyers
  for (let i = 0; i < Math.min(3, lawyerCards.length); i++) {
    const card = lawyerCards[i];
    console.log(`[Test] ===== LAWYER ${i + 1} =====`);
    
    try {
      // Extract all text and links from card
      const cardData = await card.evaluate((el: any) => {
        // Find all links
        const links = Array.from(el.querySelectorAll('a')).map((a: any) => ({
          text: a.textContent?.trim(),
          href: a.getAttribute('href'),
          class: a.className
        }));

        // Find all text content
        const allText = el.textContent?.trim();

        // Find badges/tags
        const badges = Array.from(el.querySelectorAll('[class*="badge"], [class*="tag"], button, span')).map((b: any) => 
          b.textContent?.trim()
        ).filter((t: string) => t && t.length > 0 && t.length < 50);

        return {
          links,
          allText,
          badges: [...new Set(badges)] // Remove duplicates
        };
      });

      console.log('Links:', JSON.stringify(cardData.links, null, 2));
      console.log('Badges:', cardData.badges);
      console.log('');

      // Extract structured data
      const nameLink = cardData.links.find((l: any) => l.href?.includes('/advocaten/'));
      const firmLink = cardData.links.find((l: any) => l.href?.includes('/kantoren/'));
      
      if (nameLink) {
        console.log('Name:', nameLink.text);
        console.log('Profile URL:', nameLink.href);
        
        // Extract NOvA ID from URL
        const idMatch = nameLink.href?.match(/\/(\d+)$/);
        if (idMatch) {
          console.log('NOvA ID:', idMatch[1]);
        }
      }
      
      if (firmLink) {
        console.log('Firm:', firmLink.text);
      }

      // Extract city from text
      const cities = ['ROTTERDAM', 'AMSTERDAM', 'UTRECHT', 'BARENDRECHT', "'S-GRAVENHAGE"];
      const city = cities.find(c => cardData.allText?.includes(c));
      if (city) {
        console.log('City:', city);
      }

      // Legal areas are in badges, excluding "Niet bekend", "Geen"
      const legalAreas = cardData.badges.filter((b: string) => 
        b && 
        b !== 'Niet bekend' && 
        b !== 'Geen' && 
        b !== 'RECHTSGEBIED(EN)' &&
        b !== 'SPECIALISATIEVERENIGING(EN)' &&
        b.length > 3
      );
      console.log('Legal Areas:', legalAreas);

      console.log('');
    } catch (error) {
      console.error('Error extracting lawyer:', error);
    }
  }

  await browser.close();
  console.log('[Test] Done!');
}

testExtraction().catch(console.error);

