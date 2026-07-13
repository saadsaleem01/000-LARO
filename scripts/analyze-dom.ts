#!/usr/bin/env tsx

import { chromium } from 'playwright';

async function analyzeDom() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const searchUrl = 'https://zoekeenadvocaat.advocatenorde.nl/zoeken?type=advocaten&q=&locatie%5Badres%5D=&locatie%5Bgeo%5D=false&locatie%5Bhash%5D=&filters%5Brechtsgebieden%5D=%5B%5D&filters%5Bspecialisatieverenigingen%5D=%5B%5D&filters%5Btoevoegingen%5D=0';

  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  // Find the structure around lawyer links
  const structure = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/advocaten/"]'));
    
    return links.slice(0, 3).map(link => {
      let current: any = link;
      const path = [];
      
      // Go up 5 levels to find the card container
      for (let i = 0; i < 5; i++) {
        if (!current.parentElement) break;
        current = current.parentElement;
        path.push({
          tagName: current.tagName,
          className: current.className,
          id: current.id,
          childCount: current.children.length
        });
      }
      
      return {
        linkText: link.textContent?.trim(),
        linkHref: link.getAttribute('href'),
        parentPath: path
      };
    });
  });

  console.log(JSON.stringify(structure, null, 2));

  await browser.close();
}

analyzeDom().catch(console.error);

