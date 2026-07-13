import { chromium } from 'playwright';

async function checkPagination() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Try different page numbers
  const pagesToCheck = [1, 100, 247, 248, 300, 500, 1000];

  for (const pageNum of pagesToCheck) {
    const url = `https://zoekeenadvocaat.advocatenorde.nl/zoeken?type=advocaten&q=&locatie[adres]=&locatie[geo]=false&locatie[hash]=&filters[rechtsgebieden]=[]&filters[specialisatieverenigingen]=[]&filters[toevoegingen]=0&pagina=${pageNum}`;
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      const results = await page.$$('.result.advocaten');
      const totalText = await page.textContent('.results-header') || '';
      
      console.log(`Page ${pageNum}: ${results.length} results found | Header: ${totalText.trim()}`);
    } catch (error) {
      console.log(`Page ${pageNum}: Error - ${error}`);
    }
  }

  await browser.close();
}

checkPagination();

