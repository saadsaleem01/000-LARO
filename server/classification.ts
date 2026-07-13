/**
 * Phase 025 — AI/provider abstraction and deterministic fallback.
 *
 * Legal-area classification. Previously a case's legalAreas simply echoed the
 * caseType the user picked (no classification at all — Phase 014 finding). This
 * module provides a REAL, DETERMINISTIC classifier that maps case text to the
 * canonical VALID_LEGAL_AREAS using Dutch + English keyword signals. It requires
 * no API key and always produces a stable result, so it doubles as the
 * deterministic fallback for the AI layer.
 *
 * When an LLM provider is configured it may be used to refine/augment the
 * result, but the deterministic classifier is authoritative and always runs, so
 * behaviour is predictable with or without a key.
 */
import { VALID_LEGAL_AREAS, type LegalArea } from "./legalAreasValidator";

// Keyword signals (lowercase) -> canonical legal area. Dutch and English terms.
const KEYWORD_MAP: Record<string, LegalArea> = {
  // Employment / Labor
  "arbeidsovereenkomst": "Employment Law",
  "ontslag": "Employment Law",
  "werkgever": "Employment Law",
  "werknemer": "Employment Law",
  "loon": "Employment Law",
  "employment": "Employment Law",
  "dismissal": "Employment Law",
  "employer": "Employment Law",
  "employee": "Employment Law",
  "wage": "Employment Law",
  "cao": "Labor Law",
  "vakbond": "Labor Law",
  "collective labour": "Labor Law",
  "union": "Labor Law",
  // Family
  "echtscheiding": "Family Law",
  "scheiding": "Family Law",
  "alimentatie": "Family Law",
  "voogdij": "Family Law",
  "omgangsregeling": "Family Law",
  "divorce": "Family Law",
  "custody": "Family Law",
  "alimony": "Family Law",
  // Criminal
  "strafrecht": "Criminal Law",
  "verdachte": "Criminal Law",
  "aangifte": "Criminal Law",
  "misdrijf": "Criminal Law",
  "criminal": "Criminal Law",
  "prosecution": "Criminal Law",
  "theft": "Criminal Law",
  "fraud": "Criminal Law",
  // Real estate
  "huurcontract": "Real Estate",
  "huurder": "Real Estate",
  "verhuurder": "Real Estate",
  "woning": "Real Estate",
  "vastgoed": "Real Estate",
  "lease": "Real Estate",
  "tenant": "Real Estate",
  "landlord": "Real Estate",
  "property": "Real Estate",
  // Contract
  "contract": "Contract Law",
  "overeenkomst": "Contract Law",
  "wanprestatie": "Contract Law",
  "breach": "Contract Law",
  "agreement": "Contract Law",
  // Tax
  "belasting": "Tax Law",
  "btw": "Tax Law",
  "fiscaal": "Tax Law",
  "tax": "Tax Law",
  "vat": "Tax Law",
  // Immigration
  "verblijfsvergunning": "Immigration Law",
  "immigratie": "Immigration Law",
  "asiel": "Immigration Law",
  "immigration": "Immigration Law",
  "asylum": "Immigration Law",
  "visa": "Immigration Law",
  "residence permit": "Immigration Law",
  // Corporate / M&A / Securities
  "bv": "Corporate Law",
  "vennootschap": "Corporate Law",
  "aandeelhouder": "Corporate Law",
  "bestuurder": "Corporate Law",
  "corporate": "Corporate Law",
  "shareholder": "Corporate Law",
  "director": "Corporate Law",
  "overname": "Mergers & Acquisitions",
  "fusie": "Mergers & Acquisitions",
  "merger": "Mergers & Acquisitions",
  "acquisition": "Mergers & Acquisitions",
  "effecten": "Securities Law",
  "securities": "Securities Law",
  // IP
  "auteursrecht": "Intellectual Property",
  "merkrecht": "Intellectual Property",
  "octrooi": "Intellectual Property",
  "patent": "Intellectual Property",
  "copyright": "Intellectual Property",
  "trademark": "Intellectual Property",
  // Bankruptcy
  "faillissement": "Bankruptcy",
  "schuldsanering": "Bankruptcy",
  "bankruptcy": "Bankruptcy",
  "insolvency": "Bankruptcy",
  // Administrative / Environmental / Healthcare
  "bestuursrecht": "Administrative Law",
  "vergunning": "Administrative Law",
  "administrative": "Administrative Law",
  "milieu": "Environmental Law",
  "environmental": "Environmental Law",
  "zorg": "Healthcare Law",
  "medisch": "Healthcare Law",
  "healthcare": "Healthcare Law",
  "medical": "Healthcare Law",
  // Litigation / Estates
  "dagvaarding": "Litigation",
  "rechtszaak": "Litigation",
  "geschil": "Litigation",
  "litigation": "Litigation",
  "lawsuit": "Litigation",
  "dispute": "Litigation",
  "erfenis": "Trusts & Estates",
  "testament": "Trusts & Estates",
  "nalatenschap": "Trusts & Estates",
  "estate": "Trusts & Estates",
  "inheritance": "Trusts & Estates",
};

// Map a user-picked caseType string onto a canonical area, if it matches one.
function caseTypeToArea(caseType?: string): LegalArea | null {
  if (!caseType) return null;
  const ct = caseType.trim();
  const exact = VALID_LEGAL_AREAS.find((a) => a.toLowerCase() === ct.toLowerCase());
  if (exact) return exact;
  // Fall back to keyword lookup on the caseType text itself.
  const kw = classifyByKeywords(ct);
  return kw.length > 0 ? kw[0] : null;
}

function scoreByKeywords(text: string): { areas: LegalArea[]; totalHits: number; topScore: number } {
  const hay = (text || "").toLowerCase();
  const scores = new Map<LegalArea, number>();
  let totalHits = 0;
  for (const [kw, area] of Object.entries(KEYWORD_MAP)) {
    if (hay.includes(kw)) {
      scores.set(area, (scores.get(area) || 0) + 1);
      totalHits += 1;
    }
  }
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  return {
    areas: ranked.map(([area]) => area),
    totalHits,
    topScore: ranked.length > 0 ? ranked[0][1] : 0,
  };
}

function classifyByKeywords(text: string): LegalArea[] {
  return scoreByKeywords(text).areas;
}

export interface ClassificationResult {
  areas: LegalArea[];
  method: "deterministic";
  confidence: "low" | "medium" | "high";
}

/**
 * Deterministically classify case text into legal areas. Always returns at least
 * one area (falls back to the caseType mapping, then "Other").
 */
export function classifyLegalAreas(caseSummary: string, caseType?: string): ClassificationResult {
  const scored = scoreByKeywords(caseSummary);
  const typeArea = caseTypeToArea(caseType);

  const ordered: LegalArea[] = [];
  const push = (a: LegalArea | null) => {
    if (a && !ordered.includes(a)) ordered.push(a);
  };
  // Prefer keyword hits from the description, then the mapped case type.
  scored.areas.forEach(push);
  push(typeArea);

  if (ordered.length === 0) push("Other");

  // Confidence from total keyword hits in the description: 2+ => high,
  // exactly 1 => medium, none (only caseType/Other) => low.
  let confidence: ClassificationResult["confidence"] = "low";
  if (scored.totalHits >= 2) confidence = "high";
  else if (scored.totalHits === 1) confidence = "medium";

  return { areas: ordered.slice(0, 5), method: "deterministic", confidence };
}
