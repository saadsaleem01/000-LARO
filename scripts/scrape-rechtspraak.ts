/**
 * Rechtspraak.nl Full Dataset Scraper
 * 
 * Scrapes all 876,422 published court cases from https://uitspraken.rechtspraak.nl/
 * for comprehensive keyword analysis and legal area classification.
 * 
 * API: https://data.rechtspraak.nl/uitspraken/zoeken
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

interface CourtCase {
  ecli: string;
  title: string;
  summary: string;
  date: string;
  type?: string;
  subject?: string;
  procedure?: string;
  court?: string;
}

interface ScraperProgress {
  totalCases: number;
  scrapedCases: number;
  currentPage: number;
  startTime: Date;
  lastSaveTime: Date;
  errors: number;
}

const RECHTSPRAAK_API = 'https://data.rechtspraak.nl/uitspraken/zoeken';
const CASES_PER_PAGE = 1000; // Max allowed by API
const MAX_REQUESTS_PER_SECOND = 10;
const SAVE_INTERVAL = 10000; // Save every 10k cases
const OUTPUT_DIR = path.join(process.cwd(), 'data/rechtspraak');
const PROGRESS_FILE = path.join(OUTPUT_DIR, 'scraper-progress.json');
const CASES_FILE = path.join(OUTPUT_DIR, 'all-cases.jsonl'); // JSON Lines format for streaming

/**
 * Fetch a page of cases from the API
 */
async function fetchCasesPage(page: number, maxRetries = 3): Promise<any> {
  const url = `${RECHTSPRAAK_API}?max=${CASES_PER_PAGE}&page=${page}&return=DOC`;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Rechtspraak] Fetching page ${page} (attempt ${attempt}/${maxRetries})...`);
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/xml',
          'User-Agent': 'LARO-Legal-Automation/1.0 (Research purposes)',
        },
        timeout: 30000,
      });
      
      return response.data;
    } catch (error: any) {
      console.error(`[Rechtspraak] Error fetching page ${page} (attempt ${attempt}):`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
}

/**
 * Parse XML response and extract case data
 */
async function parseCasesFromXML(xml: string): Promise<CourtCase[]> {
  try {
    const result: any = await parseXML(xml);
    const cases: CourtCase[] = [];
    
    // Navigate XML structure (adjust based on actual API response)
    const entries = result?.feed?.entry || [];
    
    for (const entry of entries) {
      try {
        const caseData: CourtCase = {
          ecli: entry.id?.[0] || '',
          title: entry.title?.[0] || '',
          summary: entry.summary?.[0] || '',
          date: entry.updated?.[0] || entry.published?.[0] || '',
        };
        
        // Extract metadata if available
        if (entry['dcterms:type']) {
          caseData.type = entry['dcterms:type'][0];
        }
        if (entry['dcterms:subject']) {
          caseData.subject = entry['dcterms:subject'][0];
        }
        if (entry['dcterms:procedure']) {
          caseData.procedure = entry['dcterms:procedure'][0];
        }
        if (entry['dcterms:creator']) {
          caseData.court = entry['dcterms:creator'][0];
        }
        
        cases.push(caseData);
      } catch (parseError) {
        console.error('[Rechtspraak] Error parsing case entry:', parseError);
      }
    }
    
    return cases;
  } catch (error) {
    console.error('[Rechtspraak] Error parsing XML:', error);
    return [];
  }
}

/**
 * Load progress from file
 */
function loadProgress(): ScraperProgress | null {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[Rechtspraak] Error loading progress:', error);
  }
  return null;
}

/**
 * Save progress to file
 */
function saveProgress(progress: ScraperProgress): void {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (error) {
    console.error('[Rechtspraak] Error saving progress:', error);
  }
}

/**
 * Append cases to JSONL file
 */
function appendCases(cases: CourtCase[]): void {
  try {
    const lines = cases.map(c => JSON.stringify(c)).join('\n') + '\n';
    fs.appendFileSync(CASES_FILE, lines);
  } catch (error) {
    console.error('[Rechtspraak] Error appending cases:', error);
  }
}

/**
 * Main scraper function
 */
async function scrapeAllCases(resume = true): Promise<void> {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Load or initialize progress
  let progress: ScraperProgress | null = resume ? loadProgress() : null;
  
  if (!progress) {
    progress = {
      totalCases: 876422, // Known total from rechtspraak.nl
      scrapedCases: 0,
      currentPage: 0,
      startTime: new Date(),
      lastSaveTime: new Date(),
      errors: 0,
    };
    
    // Clear existing data file if starting fresh
    if (fs.existsSync(CASES_FILE)) {
      fs.unlinkSync(CASES_FILE);
    }
  }
  
  console.log('[Rechtspraak] Starting scraper...');
  console.log(`[Rechtspraak] Target: ${progress.totalCases.toLocaleString()} cases`);
  console.log(`[Rechtspraak] Resume from: page ${progress.currentPage}, ${progress.scrapedCases.toLocaleString()} cases`);
  
  const totalPages = Math.ceil(progress.totalCases / CASES_PER_PAGE);
  const delayBetweenRequests = 1000 / MAX_REQUESTS_PER_SECOND;
  
  for (let page = progress.currentPage; page < totalPages; page++) {
    try {
      // Fetch page
      const xml = await fetchCasesPage(page);
      const cases = await parseCasesFromXML(xml);
      
      if (cases.length === 0) {
        console.log(`[Rechtspraak] No more cases found at page ${page}`);
        break;
      }
      
      // Append to file
      appendCases(cases);
      
      // Update progress
      progress.scrapedCases += cases.length;
      progress.currentPage = page + 1;
      
      // Save progress periodically
      if (progress.scrapedCases % SAVE_INTERVAL < CASES_PER_PAGE) {
        progress.lastSaveTime = new Date();
        saveProgress(progress);
        
        const elapsed = Date.now() - progress.startTime.getTime();
        const rate = progress.scrapedCases / (elapsed / 1000);
        const remaining = (progress.totalCases - progress.scrapedCases) / rate;
        
        console.log(`[Rechtspraak] Progress: ${progress.scrapedCases.toLocaleString()}/${progress.totalCases.toLocaleString()} (${((progress.scrapedCases / progress.totalCases) * 100).toFixed(2)}%)`);
        console.log(`[Rechtspraak] Rate: ${rate.toFixed(1)} cases/sec, ETA: ${(remaining / 60).toFixed(1)} minutes`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
      
    } catch (error: any) {
      console.error(`[Rechtspraak] Error on page ${page}:`, error.message);
      progress.errors++;
      
      // Save progress on error
      saveProgress(progress);
      
      // Continue to next page
      progress.currentPage = page + 1;
    }
  }
  
  // Final save
  saveProgress(progress);
  
  console.log('[Rechtspraak] Scraping complete!');
  console.log(`[Rechtspraak] Total cases: ${progress.scrapedCases.toLocaleString()}`);
  console.log(`[Rechtspraak] Errors: ${progress.errors}`);
  console.log(`[Rechtspraak] Data saved to: ${CASES_FILE}`);
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const resume = !args.includes('--fresh');
  
  console.log('[Rechtspraak] Full Dataset Scraper');
  console.log('[Rechtspraak] Target: 876,422 cases from rechtspraak.nl');
  console.log('[Rechtspraak] Mode:', resume ? 'Resume' : 'Fresh start');
  console.log('');
  
  try {
    await scrapeAllCases(resume);
  } catch (error) {
    console.error('[Rechtspraak] Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly (ES module check)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { scrapeAllCases, CourtCase, ScraperProgress };

