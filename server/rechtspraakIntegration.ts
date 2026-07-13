/**
 * Rechtspraak.nl Integration Service
 * 
 * This service integrates with the Dutch court records database (rechtspraak.nl)
 * to find precedent cases and opponent's litigation history.
 * 
 * API Documentation: https://www.rechtspraak.nl/Uitspraken/Paginas/Open-Data.aspx
 * 
 * Features:
 * - Search court decisions by company name, KvK number, or case type
 * - Retrieve ECLI (European Case Law Identifier) metadata
 * - Find precedent cases for legal arguments
 * - Discover opponent's litigation history
 * - Extract case outcomes and legal reasoning
 * 
 * Technical Details:
 * - RESTful webservice with XML output
 * - Two-step process: 1) Query ECLI index, 2) Retrieve documents
 * - Rate limit: 10 requests per second
 * - Free and public service
 */

interface ECLIMetadata {
  ecli: string; // European Case Law Identifier (e.g., ECLI:NL:RBAMS:2024:1234)
  instantie: string; // Court name
  zaaknummer?: string; // Case number
  datum: string; // Decision date (YYYY-MM-DD)
  rechtsgebied?: string; // Legal area (e.g., "Civiel recht", "Arbeidsrecht")
  proceduresoort?: string; // Procedure type
  inhoudsindicatie?: string; // Content summary
  vindplaatsen?: string[]; // Publication references
}

export interface CourtDecision {
  ecli: string;
  title: string;
  court: string;
  date: string;
  caseNumber?: string;
  legalArea?: string;
  summary?: string;
  fullText?: string;
  outcome?: "granted" | "denied" | "partial" | "unknown";
  relevanceScore?: number; // 0-100, how relevant to current case
}

export interface RechtspraakSearchResult {
  success: boolean;
  totalResults: number;
  decisions: CourtDecision[];
  error?: string;
  legalSignificance?: string;
}

class RechtspraakIntegrationService {
  private readonly BASE_URL = "http://data.rechtspraak.nl/uitspraken";
  private readonly RATE_LIMIT_MS = 100; // 10 requests per second = 100ms between requests
  private lastRequestTime = 0;

  /**
   * Search for court decisions by company name
   */
  async searchByCompany(companyName: string, limit = 10): Promise<RechtspraakSearchResult> {
    try {
      await this.enforceRateLimit();

      // Build search query
      // Note: The actual API uses RSS/XML format with query parameters
      // For now, we'll implement a simplified version that can be enhanced
      const searchUrl = `${this.BASE_URL}/rss?zoekterm=${encodeURIComponent(companyName)}&max=${limit}`;

      const response = await fetch(searchUrl, {
        headers: {
          Accept: "application/xml, text/xml",
        },
      });

      if (!response.ok) {
        throw new Error(`Rechtspraak API error: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      const decisions = await this.parseRSSFeed(xmlText);

      return {
        success: true,
        totalResults: decisions.length,
        decisions: decisions.slice(0, limit),
        legalSignificance: this.determineLegalSignificance(companyName, decisions),
      };
    } catch (error) {
      console.error("[Rechtspraak Integration] Error:", error);
      return {
        success: false,
        totalResults: 0,
        decisions: [],
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Search for precedent cases by legal issue
   */
  async searchPrecedents(
    legalIssue: string,
    legalArea: string = "Arbeidsrecht",
    limit = 5
  ): Promise<RechtspraakSearchResult> {
    try {
      await this.enforceRateLimit();

      // Search for cases in specific legal area
      const searchUrl = `${this.BASE_URL}/rss?zoekterm=${encodeURIComponent(legalIssue)}&rechtsgebied=${encodeURIComponent(legalArea)}&max=${limit}`;

      const response = await fetch(searchUrl, {
        headers: {
          Accept: "application/xml, text/xml",
        },
      });

      if (!response.ok) {
        throw new Error(`Rechtspraak API error: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      const decisions = await this.parseRSSFeed(xmlText);

      // Calculate relevance scores
      const scoredDecisions = decisions.map((decision) => ({
        ...decision,
        relevanceScore: this.calculateRelevance(decision, legalIssue),
      }));

      // Sort by relevance
      scoredDecisions.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

      return {
        success: true,
        totalResults: scoredDecisions.length,
        decisions: scoredDecisions.slice(0, limit),
        legalSignificance: `Found ${scoredDecisions.length} precedent cases for ${legalIssue}`,
      };
    } catch (error) {
      console.error("[Rechtspraak Integration] Error:", error);
      return {
        success: false,
        totalResults: 0,
        decisions: [],
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Get opponent's litigation history
   */
  async getOpponentHistory(companyName: string): Promise<{
    totalCases: number;
    wonCases: number;
    lostCases: number;
    recentCases: CourtDecision[];
    patterns: string[];
  }> {
    const searchResult = await this.searchByCompany(companyName, 50);

    if (!searchResult.success) {
      return {
        totalCases: 0,
        wonCases: 0,
        lostCases: 0,
        recentCases: [],
        patterns: [],
      };
    }

    // Analyze outcomes
    const wonCases = searchResult.decisions.filter((d) => d.outcome === "granted").length;
    const lostCases = searchResult.decisions.filter((d) => d.outcome === "denied").length;

    // Find patterns
    const patterns = this.identifyLitigationPatterns(searchResult.decisions);

    return {
      totalCases: searchResult.totalResults,
      wonCases,
      lostCases,
      recentCases: searchResult.decisions.slice(0, 5),
      patterns,
    };
  }

  /**
   * Parse RSS/XML feed from rechtspraak.nl
   */
  private async parseRSSFeed(xmlText: string): Promise<CourtDecision[]> {
    // Simplified XML parsing - in production, use a proper XML parser
    const decisions: CourtDecision[] = [];

    try {
      // Extract ECLI numbers from XML
      const ecliMatches = xmlText.match(/ECLI:NL:[A-Z]+:\d+:\d+/g);
      if (!ecliMatches) {
        return decisions;
      }

      // For each ECLI, extract metadata
      // Note: This is a simplified implementation
      // In production, use proper XML parsing library
      for (const ecli of ecliMatches.slice(0, 10)) {
        // Extract basic info from XML (simplified)
        const titleMatch = xmlText.match(new RegExp(`<title>([^<]+)</title>.*?${ecli}`, "s"));
        const dateMatch = xmlText.match(new RegExp(`${ecli}.*?<pubDate>([^<]+)</pubDate>`, "s"));

        decisions.push({
          ecli,
          title: titleMatch ? titleMatch[1] : "Unknown",
          court: this.extractCourtFromECLI(ecli),
          date: dateMatch ? this.parseDate(dateMatch[1]) : "Unknown",
          summary: "Full decision available via ECLI lookup",
        });
      }
    } catch (error) {
      console.error("[Rechtspraak Integration] XML parsing error:", error);
    }

    return decisions;
  }

  /**
   * Extract court name from ECLI
   */
  private extractCourtFromECLI(ecli: string): string {
    const courtCode = ecli.split(":")[2];
    const courtMap: Record<string, string> = {
      RBAMS: "Rechtbank Amsterdam",
      RBROT: "Rechtbank Rotterdam",
      RBDHA: "Rechtbank Den Haag",
      RBMNE: "Rechtbank Midden-Nederland",
      GHDHA: "Gerechtshof Den Haag",
      GHAMS: "Gerechtshof Amsterdam",
      HR: "Hoge Raad",
    };
    return courtMap[courtCode] || courtCode;
  }

  /**
   * Parse date from RSS feed
   */
  private parseDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch {
      return "Unknown";
    }
  }

  /**
   * Calculate relevance score for precedent case
   */
  private calculateRelevance(decision: CourtDecision, searchTerm: string): number {
    let score = 0;

    // Check if search term appears in title or summary
    const text = `${decision.title} ${decision.summary}`.toLowerCase();
    const term = searchTerm.toLowerCase();

    if (text.includes(term)) {
      score += 50;
    }

    // Bonus for recent cases (last 5 years)
    const decisionYear = parseInt(decision.date.split("-")[0]);
    const currentYear = new Date().getFullYear();
    if (currentYear - decisionYear <= 5) {
      score += 30;
    }

    // Bonus for higher courts
    if (decision.court.includes("Hoge Raad")) {
      score += 20;
    } else if (decision.court.includes("Gerechtshof")) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Identify litigation patterns
   */
  private identifyLitigationPatterns(decisions: CourtDecision[]): string[] {
    const patterns: string[] = [];

    // Check for repeat litigation
    if (decisions.length >= 3) {
      patterns.push(
        `Company has been involved in ${decisions.length} court cases - pattern of litigation`
      );
    }

    // Check for employment disputes
    const employmentCases = decisions.filter(
      (d) => d.legalArea === "Arbeidsrecht" || d.title.toLowerCase().includes("ontslag")
    );
    if (employmentCases.length >= 2) {
      patterns.push(
        `${employmentCases.length} employment-related disputes - history of employee conflicts`
      );
    }

    // Check for lost cases
    const lostCases = decisions.filter((d) => d.outcome === "denied");
    if (lostCases.length >= 2) {
      patterns.push(
        `Lost ${lostCases.length} cases - demonstrates pattern of unlawful behavior`
      );
    }

    return patterns;
  }

  /**
   * Determine legal significance of findings
   */
  private determineLegalSignificance(companyName: string, decisions: CourtDecision[]): string {
    if (decisions.length === 0) {
      return `No court records found for ${companyName} - opponent has clean litigation history.`;
    }

    const findings: string[] = [];

    findings.push(
      `${companyName} has been involved in ${decisions.length} court cases - demonstrates litigation history`
    );

    const employmentCases = decisions.filter(
      (d) => d.legalArea === "Arbeidsrecht" || d.title.toLowerCase().includes("ontslag")
    );
    if (employmentCases.length > 0) {
      findings.push(
        `${employmentCases.length} employment disputes found - relevant precedent for current case`
      );
    }

    const lostCases = decisions.filter((d) => d.outcome === "denied");
    if (lostCases.length > 0) {
      findings.push(
        `Opponent lost ${lostCases.length} cases - pattern of unlawful behavior established`
      );
    }

    return findings.join(". ");
  }

  /**
   * Enforce rate limit (10 requests per second)
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
      const waitTime = this.RATE_LIMIT_MS - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }
}

export const rechtspraakIntegrationService = new RechtspraakIntegrationService();

