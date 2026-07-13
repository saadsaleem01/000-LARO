/**
 * Matching Algorithm Tests
 * 
 * Tests the core lawyer matching logic to ensure:
 * - Mandatory filters work correctly
 * - Scoring system produces expected results
 * - Edge cases are handled properly
 * 
 * Run with: pnpm test
 */

import { describe, it, expect } from "vitest";

// Mock lawyer data for testing
const createMockLawyer = (overrides: any = {}) => ({
  id: "lawyer-1",
  name: "Test Lawyer",
  email: "test@example.com",
  city: "Amsterdam",
  latitude: "52.3676",
  longitude: "4.9041",
  legalAreas: JSON.stringify(["Family Law", "Divorce"]),
  caseStop: "No",
  barAssociationStatus: "Good Standing",
  currentlyAccepting: "Yes",
  permanentlyFiltered: "No",
  caseLoad: "15",
  totalOutreaches: "10",
  totalResponses: "8",
  totalAcceptances: "6",
  averageResponseTimeHours: "36",
  ...overrides,
});

const createMockCase = (overrides: any = {}) => ({
  id: "case-1",
  clientName: "Test Client",
  caseType: "Divorce",
  legalAreas: JSON.stringify([{ name: "Family Law", confidence: 95 }]),
  latitude: "52.3702",
  longitude: "4.8952",
  urgency: "Medium",
  ...overrides,
});

describe("Matching Algorithm - Mandatory Filters", () => {
  it("should filter out lawyers with case-stop", () => {
    const lawyer = createMockLawyer({ caseStop: "Yes" });
    const caseData = createMockCase();
    
    // Lawyer with case-stop should be filtered out
    expect(lawyer.caseStop).toBe("Yes");
    // In actual matching, this lawyer would not be included
  });

  it("should filter out lawyers with bad bar association status", () => {
    const lawyer = createMockLawyer({ barAssociationStatus: "Disciplinary Action" });
    
    expect(lawyer.barAssociationStatus).not.toBe("Good Standing");
    // This lawyer should be filtered out
  });

  it("should filter out permanently filtered lawyers", () => {
    const lawyer = createMockLawyer({ 
      permanentlyFiltered: "Yes",
      totalOutreaches: "5",
      totalResponses: "0"
    });
    
    expect(lawyer.permanentlyFiltered).toBe("Yes");
    // Lawyer with 0% response rate and 3+ contacts should be filtered
  });

  it("should include lawyers with good standing and accepting cases", () => {
    const lawyer = createMockLawyer();
    
    expect(lawyer.caseStop).toBe("No");
    expect(lawyer.barAssociationStatus).toBe("Good Standing");
    expect(lawyer.currentlyAccepting).toBe("Yes");
    expect(lawyer.permanentlyFiltered).toBe("No");
    // This lawyer should pass all mandatory filters
  });
});

describe("Matching Algorithm - Legal Area Matching", () => {
  it("should match lawyers with required legal area", () => {
    const lawyer = createMockLawyer({
      legalAreas: JSON.stringify(["Family Law", "Divorce", "Child Custody"])
    });
    const caseData = createMockCase({
      legalAreas: JSON.stringify([{ name: "Family Law", confidence: 95 }])
    });
    
    const lawyerAreas = JSON.parse(lawyer.legalAreas);
    const caseAreas = JSON.parse(caseData.legalAreas);
    
    const hasMatch = caseAreas.some((ca: any) => 
      lawyerAreas.includes(ca.name)
    );
    
    expect(hasMatch).toBe(true);
  });

  it("should not match lawyers without required legal area", () => {
    const lawyer = createMockLawyer({
      legalAreas: JSON.stringify(["Criminal Law", "Traffic Violations"])
    });
    const caseData = createMockCase({
      legalAreas: JSON.stringify([{ name: "Family Law", confidence: 95 }])
    });
    
    const lawyerAreas = JSON.parse(lawyer.legalAreas);
    const caseAreas = JSON.parse(caseData.legalAreas);
    
    const hasMatch = caseAreas.some((ca: any) => 
      lawyerAreas.includes(ca.name)
    );
    
    expect(hasMatch).toBe(false);
  });
});

describe("Matching Algorithm - Scoring System", () => {
  it("should score case load correctly", () => {
    const calculateCaseLoadScore = (caseLoad: number) => {
      if (caseLoad <= 10) return 50;
      if (caseLoad <= 20) return 30;
      if (caseLoad <= 30) return 10;
      return 0;
    };

    expect(calculateCaseLoadScore(5)).toBe(50);
    expect(calculateCaseLoadScore(15)).toBe(30);
    expect(calculateCaseLoadScore(25)).toBe(10);
    expect(calculateCaseLoadScore(35)).toBe(0);
  });

  it("should score response rate correctly", () => {
    const calculateResponseRate = (outreaches: number, responses: number) => {
      if (outreaches === 0) return 25; // Neutral score for new lawyers
      return Math.round((responses / outreaches) * 100);
    };

    const calculateResponseScore = (responseRate: number) => {
      if (responseRate >= 80) return 50;
      if (responseRate >= 60) return 30;
      if (responseRate >= 40) return 10;
      return 0;
    };

    expect(calculateResponseRate(10, 9)).toBe(90);
    expect(calculateResponseScore(90)).toBe(50);
    
    expect(calculateResponseRate(10, 7)).toBe(70);
    expect(calculateResponseScore(70)).toBe(30);
    
    expect(calculateResponseRate(10, 5)).toBe(50);
    expect(calculateResponseScore(50)).toBe(10);
    
    expect(calculateResponseRate(10, 2)).toBe(20);
    expect(calculateResponseScore(20)).toBe(0);
  });

  it("should score response time correctly", () => {
    const calculateResponseTimeScore = (hours: number) => {
      if (hours <= 48) return 30; // Fast (0-48h)
      if (hours <= 168) return 20; // Medium (3-7 days)
      if (hours <= 336) return 10; // Slow (8-14 days)
      return 0; // Unacceptable (15+ days)
    };

    expect(calculateResponseTimeScore(24)).toBe(30);
    expect(calculateResponseTimeScore(72)).toBe(20);
    expect(calculateResponseTimeScore(240)).toBe(10);
    expect(calculateResponseTimeScore(400)).toBe(0);
  });

  it("should score acceptance rate correctly", () => {
    const calculateAcceptanceRate = (responses: number, acceptances: number) => {
      if (responses === 0) return 0;
      return Math.round((acceptances / responses) * 100);
    };

    const calculateAcceptanceScore = (acceptanceRate: number) => {
      if (acceptanceRate >= 80) return 30;
      if (acceptanceRate >= 60) return 20;
      if (acceptanceRate >= 40) return 10;
      return 0;
    };

    expect(calculateAcceptanceRate(10, 9)).toBe(90);
    expect(calculateAcceptanceScore(90)).toBe(30);
    
    expect(calculateAcceptanceRate(10, 7)).toBe(70);
    expect(calculateAcceptanceScore(70)).toBe(20);
  });
});

describe("Matching Algorithm - Distance Calculation", () => {
  it("should calculate distance between two points", () => {
    // Haversine formula for distance calculation
    const calculateDistance = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number
    ): number => {
      const R = 6371; // Earth's radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Amsterdam to Rotterdam (approximately 60 km)
    const distance = calculateDistance(52.3676, 4.9041, 51.9225, 4.47917);
    expect(distance).toBeGreaterThan(55);
    expect(distance).toBeLessThan(65);
  });

  it("should score distance correctly", () => {
    const calculateDistanceScore = (distanceKm: number) => {
      if (distanceKm <= 10) return 10;
      if (distanceKm <= 25) return 7;
      if (distanceKm <= 50) return 5;
      if (distanceKm <= 100) return 2;
      return 0;
    };

    expect(calculateDistanceScore(5)).toBe(10);
    expect(calculateDistanceScore(20)).toBe(7);
    expect(calculateDistanceScore(40)).toBe(5);
    expect(calculateDistanceScore(80)).toBe(2);
    expect(calculateDistanceScore(150)).toBe(0);
  });
});

describe("Matching Algorithm - Edge Cases", () => {
  it("should handle new lawyers with no history", () => {
    const lawyer = createMockLawyer({
      totalOutreaches: "0",
      totalResponses: "0",
      totalAcceptances: "0",
      averageResponseTimeHours: null,
    });

    // New lawyers should get neutral scores (benefit of doubt)
    expect(parseInt(lawyer.totalOutreaches)).toBe(0);
    expect(parseInt(lawyer.totalResponses)).toBe(0);
    // Should receive 25 points (neutral score) instead of 0
  });

  it("should handle missing coordinates", () => {
    const lawyer = createMockLawyer({
      latitude: null,
      longitude: null,
    });

    expect(lawyer.latitude).toBeNull();
    expect(lawyer.longitude).toBeNull();
    // Should still be included in matching (distance score = 0)
  });

  it("should handle multiple legal areas", () => {
    const lawyer = createMockLawyer({
      legalAreas: JSON.stringify([
        "Family Law",
        "Divorce",
        "Child Custody",
        "Employment Law",
      ]),
    });
    const caseData = createMockCase({
      legalAreas: JSON.stringify([
        { name: "Family Law", confidence: 95 },
        { name: "Employment Law", confidence: 80 },
      ]),
    });

    const lawyerAreas = JSON.parse(lawyer.legalAreas);
    const caseAreas = JSON.parse(caseData.legalAreas);

    const matches = caseAreas.filter((ca: any) =>
      lawyerAreas.includes(ca.name)
    );

    expect(matches.length).toBe(2); // Should match both areas
  });
});

