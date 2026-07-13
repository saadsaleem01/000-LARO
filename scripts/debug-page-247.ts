import { chromium } from 'playwright';

async function debugPage247() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const pages = [246, 247, 248, 249, 250];

  for (const pageNum of pages) {
    const url = `https://zoekeenadvocaat.advocatenorde.nl/zoeken?type=advocaten&q=&locatie[adres]=&locatie[geo]=false&locatie[hash]=&filters[rechtsgebieden]=[]&filters[specialisatieverenigingen]=[]&filters[toevoegingen]=0&pagina=${pageNum}`;
    
    console.log(`\n=== Checking Page ${pageNum} ===`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check for results
    const results = await page.$$('.result.advocaten');
    console.log(`Results found: ${results.length}`);

    // Check if there's a "no results" message
    const bodyText = await page.textContent('body');
    if (bodyText?.includes('Geen resultaten') || bodyText?.includes('geen advocaten')) {
      console.log('⚠️  "No results" message detected');
    }

    // Get first lawyer name if exists
    if (results.length > 0) {
      const firstLink = await results[0].$('a');
      const name = firstLink ? await firstLink.textContent() : 'N/A';
      console.log(`First lawyer: ${name?.trim()}`);
    }

    // Take screenshot
    await page.screenshot({ path: `/tmp/page-${pageNum}.png` });
    console.log(`Screenshot saved: /tmp/page-${pageNum}.png`);
  }

  await browser.close();
}

debugPage247();

