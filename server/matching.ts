// @ts-nocheck

// matching.ts
import { getAllLawyers, getCaseById } from "./db";
import { getLawyerRating } from "./routers/lawyerRating";

import * as fs from "fs";
import * as path from "path";

interface TaxonomyMapping {
  courtCategoryToSpecializations: Record<string, string[]>;
  specializationToCourtCategories: Record<string, string[]>;
  confidenceScores: {
    directMatch: number;
    strongMatch: number;
    moderateMatch: number;
    weakMatch: number;
  };
}

let cachedTaxonomyMapping: TaxonomyMapping | null = null;
let cachedRechtspraakKeywords: Record<string, string[]> | null = null;

/**
 * Load taxonomy mapping and keywords (cached)
 */
function loadMatchingData() {
  if (!cachedTaxonomyMapping) {
    try {
      const mappingPath = path.join(__dirname, "legal-taxonomy-mapping.json");
      cachedTaxonomyMapping = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));
    } catch (error) {
      console.error("Error loading taxonomy mapping:", error);
    }
  }
  
  if (!cachedRechtspraakKeywords) {
    try {
      const keywordsPath = path.join(__dirname, "../docs/rechtspraak-keywords-full.json");
      const data = JSON.parse(fs.readFileSync(keywordsPath, "utf-8"));
      cachedRechtspraakKeywords = {};
      
      for (const [category, categoryData] of Object.entries(data.keywords_by_area || {})) {
        const keywords = (categoryData as any).top_keywords
          .slice(0, 50)
          .map((kw: any) => kw.keyword.toLowerCase());
        cachedRechtspraakKeywords[category] = keywords;
      }
    } catch (error) {
      console.error("Error loading rechtspraak keywords:", error);
    }
  }
  
  return { mapping: cachedTaxonomyMapping, keywords: cachedRechtspraakKeywords };
}

/**
 * Calculate keyword-based confidence boost
 * Checks if case description contains keywords from court cases in relevant legal areas
 */
function calculateKeywordBoost(
  caseDescription: string,
  lawyerSpecializations: string[]
): { score: number; matchedKeywords: string[] } {
  const { mapping, keywords } = loadMatchingData();
  
  if (!mapping || !keywords) {
    return { score: 0, matchedKeywords: [] };
  }
  
  const caseText = caseDescription.toLowerCase();
  const matchedKeywords = new Set<string>();
  let totalMatches = 0;
  
  // For each lawyer specialization, check relevant court categories
  for (const specialization of lawyerSpecializations) {
    const courtCategories = mapping.specializationToCourtCategories[specialization] || [];
    
    for (const category of courtCategories) {
      const categoryKeywords = keywords[category] || [];
      
      for (const keyword of categoryKeywords) {
        if (caseText.includes(keyword)) {
          matchedKeywords.add(keyword);
          totalMatches++;
        }
      }
    }
  }
  
  // Score: 0-20 points based on keyword matches
  // 1-2 matches: 5 points
  // 3-5 matches: 10 points
  // 6-10 matches: 15 points
  // 11+ matches: 20 points
  let score = 0;
  if (totalMatches >= 11) score = 20;
  else if (totalMatches >= 6) score = 15;
  else if (totalMatches >= 3) score = 10;
  else if (totalMatches >= 1) score = 5;
  
  return { score, matchedKeywords: Array.from(matchedKeywords) };
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if lawyer's expertise matches case requirements
 * MANDATORY FILTER - Must have matching legal area
 */
function hasMatchingExpertise(
  lawyerAreas: string[],
  caseAreas: string[]
): boolean {
  return lawyerAreas.some(area => caseAreas.includes(area));
}

/**
 * Check if lawyer speaks required languages
 */
function hasMatchingLanguages(
  lawyerLanguages: string[],
  requiredLanguages: string[]
): boolean {
  if (requiredLanguages.length === 0) return true;
  return requiredLanguages.every(lang => lawyerLanguages.includes(lang));
}

export interface MatchedLawyer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  languages: string[];
  legalAreas: string[];
  experienceYears: string | null;
  distance: number;
  matchScore: number;
  matchReasons: string[];
  // LARO Scoring Details
  caseLoadScore: number;
  responseTimeScore: number;
  acceptanceRateScore: number;
  capacityScore: number;
  distanceScore: number;
  experienceScore: number;
}

export interface MatchingOptions {
  maxDistance?: number; // Maximum distance in km
  maxResults?: number; // Maximum number of lawyers to return
  requireLanguages?: string[]; // Required languages
  sortBy?: "distance" | "experience" | "score"; // Sort criteria
}

/**
 * LARO Matching Algorithm
 * 
 * MANDATORY FILTERS:
 * 1. Legal expertise match
 * 2. No case-stop (accepting new cases)
 * 3. Good standing with Bar Association
 * 4. Not permanently filtered (0% response rate with 3+ contacts)
 * 5. Within maximum distance
 * 
 * SCORING SYSTEM (Max ~210 points):
 * - Case-load: 0-50 points (PRIMARY)
 * - Response Time: 0-50 points (PRIMARY)
 * - Acceptance Rate: 0-50 points (PRIMARY)
 * - Currently Accepting: 0-20 points (SECONDARY)
 * - Capacity Percentage: 0-20 points (TERTIARY)
 * - Distance: 0-10 points (LOW)
 * - Experience: 0-10 points (LOW)
 */
export async function findMatchingLawyers(
  caseId: string,
  options: MatchingOptions = {}
): Promise<MatchedLawyer[]> {
  const {
    maxDistance = 100, // Default 100km radius
    maxResults = 50,
    requireLanguages = [],
    sortBy = "score", // Default to score-based sorting
  } = options;

  // Get case details
  const caseData = await getCaseById(caseId);
  if (!caseData) {
    throw new Error(`Case not found: ${caseId}`);
  }

  // Parse case requirements
  const caseLat = caseData.latitude ? parseFloat(caseData.latitude) : null;
  const caseLon = caseData.longitude ? parseFloat(caseData.longitude) : null;
  
  // Parse legalAreas - handle both string[] and object[] formats
  let caseLegalAreas: string[] = [];
  if (caseData.legalAreas) {
    const parsed = JSON.parse(caseData.legalAreas);
    if (Array.isArray(parsed)) {
      // Handle both ["Arbeidsrecht"] and [{area: "Arbeidsrecht", ...}] formats
      caseLegalAreas = parsed.map(item => 
        typeof item === 'string' ? item : (item.area || item.areaEn || item)
      );
    }
  }
  const caseLanguages = caseData.preferredLanguages
    ? JSON.parse(caseData.preferredLanguages)
    : requireLanguages;

  // Coordinates are optional - if not provided, distance-based filtering will be skipped
  // if (!caseLat || !caseLon) {
  //   throw new Error("Case must have valid coordinates for matching");
  // }

  if (caseLegalAreas.length === 0) {
    throw new Error("Case must have at least one legal area specified");
  }

  // Get all lawyers
  const allLawyers = await getAllLawyers();

  // Filter and score lawyers
  const matchedLawyers: MatchedLawyer[] = [];

  for (const lawyer of allLawyers) {
    const lawyerLat = lawyer.latitude ? parseFloat(lawyer.latitude) : null;
    const lawyerLon = lawyer.longitude ? parseFloat(lawyer.longitude) : null;

    // Coordinates are optional - if not available, distance scoring will be skipped

    // Parse lawyer data - handle both string[] and object[] formats
    let lawyerAreas: string[] = [];
    if (lawyer.legalAreas) {
      const parsed = JSON.parse(lawyer.legalAreas);
      if (Array.isArray(parsed)) {
        lawyerAreas = parsed.map(item =>
          typeof item === 'string' ? item : (item.area || item.areaEn || item)
        );
      }
    }
    const lawyerLanguages = lawyer.languages ? JSON.parse(lawyer.languages) : [];

    // MANDATORY FILTER 1: Check expertise match
    if (!hasMatchingExpertise(lawyerAreas, caseLegalAreas)) {
      continue;
    }

    // MANDATORY FILTER 2: Check case-stop (not accepting new cases)
    if (lawyer.caseStop === "Yes") {
      continue;
    }

    // MANDATORY FILTER 3: Check Bar Association status
    if (lawyer.barAssociationStatus !== "Good Standing") {
      continue;
    }

    // MANDATORY FILTER 4: Check if permanently filtered
    if (lawyer.permanentlyFiltered === "Yes") {
      // Check if filter period has expired
      if (lawyer.filterUntil && new Date(lawyer.filterUntil) > new Date()) {
        continue; // Still filtered
      }
      // Filter expired, allow matching but reset flag would happen elsewhere
    }

    // Calculate distance (only if both case and lawyer have coordinates)
    let distance = 0;
    if (caseLat && caseLon && lawyerLat && lawyerLon) {
      distance = calculateDistance(caseLat, caseLon, lawyerLat, lawyerLon);
      
      // MANDATORY FILTER 5: Check distance limit (only if coordinates available)
      if (distance > maxDistance) continue;
    }

    // Check language requirements
    if (!hasMatchingLanguages(lawyerLanguages, caseLanguages)) {
      continue;
    }

    // Calculate LARO Match Score
    const matchReasons: string[] = [];
    let matchScore = 0;

    // PRIMARY METRIC 1: Case-load (0-50 points)
    let caseLoadScore = 0;
    const caseLoad = lawyer.caseLoad ? parseInt(lawyer.caseLoad) : null;
    
    if (caseLoad === null) {
      // No case-load data - give benefit of doubt
      caseLoadScore = 25;
      matchReasons.push("Case-load unknown (new lawyer)");
    } else if (caseLoad <= 10) {
      caseLoadScore = 50;
      matchReasons.push(`Excellent availability (${caseLoad} active cases)`);
    } else if (caseLoad <= 20) {
      caseLoadScore = 30;
      matchReasons.push(`Good availability (${caseLoad} active cases)`);
    } else if (caseLoad <= 30) {
      caseLoadScore = 10;
      matchReasons.push(`Limited availability (${caseLoad} active cases)`);
    } else {
      caseLoadScore = 0;
      matchReasons.push(`Very busy (${caseLoad}+ active cases)`);
    }
    matchScore += caseLoadScore;

    // PRIMARY METRIC 2: Response Time (0-50 points)
    let responseTimeScore = 0;
    const avgResponseTime = lawyer.averageResponseTimeHours
      ? parseFloat(lawyer.averageResponseTimeHours)
      : null;

    if (avgResponseTime === null) {
      // New lawyer, no history - give benefit of doubt
      responseTimeScore = 25;
      matchReasons.push("New lawyer (no response history)");
    } else if (avgResponseTime <= 48) {
      responseTimeScore = 50;
      matchReasons.push("Excellent response time (≤48 hours)");
    } else if (avgResponseTime <= 168) { // 7 days
      responseTimeScore = 30;
      matchReasons.push("Good response time (≤7 days)");
    } else if (avgResponseTime <= 336) { // 14 days
      responseTimeScore = 10;
      matchReasons.push("Slow response time (≤14 days)");
    } else {
      responseTimeScore = 0;
      matchReasons.push("Very slow response time (>14 days)");
    }
    matchScore += responseTimeScore;

    // PRIMARY METRIC 2: Acceptance Rate (0-50 points)
    let acceptanceRateScore = 0;
    const totalOutreaches = parseInt(lawyer.totalOutreaches || "0");
    const totalResponses = parseInt(lawyer.totalResponses || "0");
    const totalAcceptances = parseInt(lawyer.totalAcceptances || "0");

    if (totalResponses === 0) {
      // No history - give benefit of doubt
      acceptanceRateScore = 25;
    } else {
      const acceptanceRate = (totalAcceptances / totalResponses) * 100;
      if (acceptanceRate >= 80) {
        acceptanceRateScore = 50;
        matchReasons.push(`High acceptance rate (${Math.round(acceptanceRate)}%)`);
      } else if (acceptanceRate >= 60) {
        acceptanceRateScore = 30;
        matchReasons.push(`Good acceptance rate (${Math.round(acceptanceRate)}%)`);
      } else if (acceptanceRate >= 40) {
        acceptanceRateScore = 10;
        matchReasons.push(`Moderate acceptance rate (${Math.round(acceptanceRate)}%)`);
      } else {
        acceptanceRateScore = 0;
        matchReasons.push(`Low acceptance rate (${Math.round(acceptanceRate)}%)`);
      }
    }
    matchScore += acceptanceRateScore;

    // SECONDARY METRIC: Currently Accepting Cases (0-20 points)
    let currentlyAcceptingScore = 0;
    if (lawyer.currentlyAccepting === "Yes") {
      currentlyAcceptingScore = 20;
      matchReasons.push("Actively accepting new cases");
    } else if (lawyer.currentlyAccepting === "Limited") {
      currentlyAcceptingScore = 10;
      matchReasons.push("Limited capacity for new cases");
    }
    matchScore += currentlyAcceptingScore;

    // TERTIARY METRIC: Capacity Percentage (0-20 points)
    let capacityScore = 0;
    const capacityFilled = parseInt(lawyer.capacityPercentage || "0");
    if (capacityFilled <= 25) {
      capacityScore = 20;
      matchReasons.push(`Excellent capacity (${capacityFilled}% filled)`);
    } else if (capacityFilled <= 50) {
      capacityScore = 15;
      matchReasons.push(`Good capacity (${capacityFilled}% filled)`);
    } else if (capacityFilled <= 75) {
      capacityScore = 10;
      matchReasons.push(`Limited capacity (${capacityFilled}% filled)`);
    } else if (capacityFilled <= 90) {
      capacityScore = 5;
      matchReasons.push(`Very limited capacity (${capacityFilled}% filled)`);
    } else {
      capacityScore = 0;
      matchReasons.push(`Nearly full capacity (${capacityFilled}% filled)`);
    }
    matchScore += capacityScore;

    // LOW WEIGHT: Distance (0-10 points)
    let distanceScore = 0;
    if (distance <= 25) {
      distanceScore = 10;
      matchReasons.push(`Close proximity (${distance} km)`);
    } else if (distance <= 50) {
      distanceScore = 5;
      matchReasons.push(`Reasonable distance (${distance} km)`);
    } else if (distance <= 100) {
      distanceScore = 2;
      matchReasons.push(`Moderate distance (${distance} km)`);
    }
    matchScore += distanceScore;

    // LOW WEIGHT: Experience (0-10 points)
    let experienceScore = 0;
    const experience = lawyer.experienceYears
      ? parseInt(lawyer.experienceYears)
      : 0;
    if (experience >= 10) {
      experienceScore = 10;
      matchReasons.push(`Highly experienced (${experience}+ years)`);
    } else if (experience >= 5) {
      experienceScore = 5;
      matchReasons.push(`Experienced (${experience} years)`);
    } else if (experience >= 2) {
      experienceScore = 2;
      matchReasons.push(`${experience} years experience`);
    }
    matchScore += experienceScore;

    // KEYWORD BOOST: Court case terminology match (0-20 points)
    let keywordBoostScore = 0;
    const keywordBoost = calculateKeywordBoost(
      caseData.caseSummary || "",
      lawyerAreas
    );
    keywordBoostScore = keywordBoost.score;
    if (keywordBoost.matchedKeywords.length > 0) {
      matchReasons.push(
        `Legal terminology match (${keywordBoost.matchedKeywords.length} keywords from 877k court cases)`
      );
    }
    matchScore += keywordBoostScore;

    // AI RATING BOOST: Objective performance metrics (0-15 points)
    let ratingBoostScore = 0;
    try {
      const rating = await getLawyerRating(lawyer.id);
      if (rating && rating.ratingConfidence !== 'low') {
        const overallRating = parseFloat(rating.overallRating);
        // Scale 0-100 rating to 0-15 points
        ratingBoostScore = (overallRating / 100) * 15;
        if (overallRating >= 90) {
          matchReasons.push(`Exceptional AI rating (${overallRating.toFixed(1)}/100)`);
        } else if (overallRating >= 75) {
          matchReasons.push(`Strong AI rating (${overallRating.toFixed(1)}/100)`);
        } else if (overallRating >= 60) {
          matchReasons.push(`Good AI rating (${overallRating.toFixed(1)}/100)`);
        }
      }
    } catch (error) {
      console.error('[Matching] Failed to get lawyer rating:', error);
    }
    matchScore += ratingBoostScore;

    matchedLawyers.push({
      id: lawyer.id,
      name: lawyer.name,
      email: lawyer.email,
      phone: lawyer.phone,
      address: lawyer.address,
      website: lawyer.website,
      languages: lawyerLanguages,
      legalAreas: lawyerAreas,
      experienceYears: lawyer.experienceYears,
      distance,
      matchScore,
      matchReasons,
      caseLoadScore,
      responseTimeScore,
      acceptanceRateScore,
      capacityScore,
      distanceScore,
      experienceScore,
    });
  }

  // Sort lawyers based on criteria
  matchedLawyers.sort((a, b) => {
    switch (sortBy) {
      case "distance":
        return a.distance - b.distance; // Closest first
      case "experience":
        const expA = a.experienceYears ? parseInt(a.experienceYears) : 0;
        const expB = b.experienceYears ? parseInt(b.experienceYears) : 0;
        return expB - expA; // Most experienced first
      case "score":
      default:
        return b.matchScore - a.matchScore; // Highest score first
    }
  });

  // Limit results
  return matchedLawyers.slice(0, maxResults);
}

/**
 * Get the next lawyer to contact for a case
 * Expands search radius if no lawyers found nearby
 * Uses LARO scoring to prioritize best matches
 */
export async function getNextLawyerToContact(
  caseId: string,
  alreadyContactedIds: string[] = []
): Promise<MatchedLawyer | null> {
  const radiusSteps = [10, 25, 50, 100, 200]; // Expanding search radius in km

  for (const radius of radiusSteps) {
    const matches = await findMatchingLawyers(caseId, {
      maxDistance: radius,
      maxResults: 100,
      sortBy: "score", // Use LARO scoring
    });

    // Filter out already contacted lawyers
    const availableLawyers = matches.filter(
      lawyer => !alreadyContactedIds.includes(lawyer.id)
    );

    if (availableLawyers.length > 0) {
      return availableLawyers[0]; // Return highest-scoring available lawyer
    }
  }

  return null; // No lawyers found
}

