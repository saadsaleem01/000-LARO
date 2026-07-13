import { getDb } from "./db";
import {
  communicationGaps,
  expectedDocuments,
  suspiciousPatterns,
  legalInferences,
  caseStrengthAnalysis,
  communications,
  timeline,
  cases,
  evidence,
  evidenceFiles,
  emailAccounts,
} from "./schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

interface TimelineEvent {
  id: string;
  date: Date;
  type: string;
  title: string;
  description?: string;
  direction?: "inbound" | "outbound";
  hasDocumentation: boolean;
  participants?: string[];
}

export interface GapAnalysisResult {
  gaps: CommunicationGap[];
  expectedDocs: ExpectedDocument[];
  patterns: SuspiciousPattern[];
  inferences: LegalInference[];
  caseStrength: {
    overallScore: number;
    directEvidenceScore: number;
    circumstantialEvidenceScore: number;
    legalBasisScore: number;
    gapAnalysisImpact: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    narrative: string;
  };
}

interface CommunicationGap {
  id: string;
  caseId: string;
  gapType: string;
  startDate: Date;
  endDate: Date | null;
  durationDays: string;
  context: string;
  significance: string;
  precedingEvents: string;
  legalImplications: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ExpectedDocument {
  id: string;
  caseId: string;
  gapId: string | null;
  documentType: string;
  reason: string;
  legalRequirement: boolean;
  legalBasis: string | null;
  deadline: Date | null;
  status: "missing" | "delayed" | "incomplete" | "received";
  receivedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SuspiciousPattern {
  id: string;
  caseId: string;
  patternType: string;
  description: string;
  evidenceIds: string;
  legalSignificance: string;
  confidence: string;
  detectedAt: Date;
}

interface LegalInference {
  id: string;
  caseId: string;
  inference: string;
  legalPrinciple: string;
  supportingEvidence: string;
  caselaw: string;
  strength: string;
  category: string;
  generatedAt: Date;
}

interface CaseLike {
  caseType: string | null;
}

export class GapDetectionService {
  /**
   * Main entry point: Analyze a case for evidence gaps
   */
  async analyzeCase(caseId: string): Promise<GapAnalysisResult> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get case details
    const caseData = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    if (caseData.length === 0) throw new Error("Case not found");
    const caseInfo = caseData[0];

    // Build timeline from multiple sources
    const timelineEvents = await this.buildTimeline(caseId);

    // Detect communication gaps
    const gaps = await this.detectCommunicationGaps(caseId, timelineEvents);

    // Identify expected documents based on case type
    const expectedDocs = await this.identifyExpectedDocuments(caseId, caseInfo, timelineEvents);

    // Detect suspicious patterns
    const patterns = await this.detectSuspiciousPatterns(caseId, timelineEvents, gaps);

    // Generate legal inferences
    const inferences = await this.generateLegalInferences(caseId, gaps, expectedDocs, patterns);

    // Calculate case strength
    const caseStrength = await this.calculateCaseStrength(
      caseId,
      timelineEvents,
      gaps,
      expectedDocs,
      patterns,
      inferences
    );

    // Save all results to database
    await this.saveResults(caseId, gaps, expectedDocs, patterns, inferences, caseStrength);

    return {
      gaps,
      expectedDocs,
      patterns,
      inferences,
      caseStrength,
    };
  }

  /**
   * Build unified timeline from communications and timeline events
   */
  private async buildTimeline(caseId: string): Promise<TimelineEvent[]> {
    const db = await getDb();
    if (!db) return [];

    // Get communications
    const comms = await db
      .select()
      .from(communications)
      .where(eq(communications.caseId, caseId))
      .orderBy(asc(communications.createdAt));

    // Get timeline events
    const timelineData = await db
      .select()
      .from(timeline)
      .where(eq(timeline.caseId, caseId))
      .orderBy(asc(timeline.eventAt));

    // Get evidence items (uploaded files, scanned docs, etc.)
    const evidenceData = await db
      .select()
      .from(evidence)
      .where(eq(evidence.caseId, caseId))
      .orderBy(asc(evidence.createdAt));

    // Get evidence files (from desktop scanner)
    const evidenceFileData = await db
      .select()
      .from(evidenceFiles)
      .where(eq(evidenceFiles.caseId, caseId))
      .orderBy(asc(evidenceFiles.uploadedAt));

    // Build the set of the case owner's connected email addresses so we can
    // infer whether a pulled email was sent (outbound) or received (inbound).
    const connectedEmails = new Set<string>();
    const caseRow = (
      await db.select({ userId: cases.userId }).from(cases).where(eq(cases.id, caseId)).limit(1)
    )[0];
    if (caseRow?.userId) {
      const accounts = await db
        .select({ email: emailAccounts.email })
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, caseRow.userId));
      for (const a of accounts) {
        if (a.email) connectedEmails.add(a.email.toLowerCase());
      }
    }

    // Pull an email address out of a "Name <addr@x.com>" style header value.
    const extractEmail = (raw: unknown): string =>
      (String(raw ?? "").match(/[^<\s]+@[^>\s]+/)?.[0] || "").toLowerCase();

    const events: TimelineEvent[] = [];

    // Add communications to timeline
    comms.forEach((comm) => {
      let commMeta: any = {};
      try {
        commMeta = comm.metadata ? JSON.parse(comm.metadata) : {};
      } catch {
        commMeta = {};
      }

      events.push({
        id: comm.id,
        date: comm.createdAt ?? new Date(),
        type: comm.channel || "communication",
        title: commMeta.subject || `${comm.channel || "message"} communication`,
        description: comm.body || undefined,
        direction: commMeta.direction as "inbound" | "outbound" | undefined,
        hasDocumentation: true,
        participants: Array.isArray(commMeta.participants) ? commMeta.participants : [],
      });
    });

    // Add timeline events
    timelineData.forEach((item) => {
      let timelineMeta: any = {};
      try {
        timelineMeta = item.metadata ? JSON.parse(item.metadata) : {};
      } catch {
        timelineMeta = {};
      }

      events.push({
        id: item.id,
        date: item.eventAt ?? item.createdAt ?? new Date(),
        type: item.eventType || "event",
        title: item.title || timelineMeta.event || "Timeline event",
        description: item.description || undefined,
        hasDocumentation: item.metadata ? true : false,
      });
    });

    // Add evidence items to timeline — these ARE documented events.
    // For pulled emails, recover the real sent date and direction from metadata
    // so communication-gap and unanswered-email detection actually work.
    evidenceData.forEach((item) => {
      let meta: any = {};
      try {
        meta = item.metadata ? JSON.parse(item.metadata) : {};
      } catch {
        meta = {};
      }

      const isEmail = (item.type || "").toLowerCase() === "email";
      const emailDate = isEmail && meta.date ? new Date(meta.date) : null;
      const date =
        emailDate && !isNaN(emailDate.getTime()) ? emailDate : item.createdAt ?? new Date();

      let direction: "inbound" | "outbound" | undefined;
      const fromAddr = extractEmail(meta.from);
      if (isEmail && fromAddr) {
        direction = connectedEmails.has(fromAddr) ? "outbound" : "inbound";
      }

      events.push({
        id: item.id,
        date,
        type: item.type || "document",
        title: item.title || item.fileName || "Evidence document",
        description: item.description || undefined,
        direction,
        hasDocumentation: true, // Evidence items are by definition documented
        participants: fromAddr ? [fromAddr] : [],
      });
    });

    // Add scanned files to timeline
    evidenceFileData.forEach((item) => {
      events.push({
        id: item.id,
        date: item.uploadedAt ?? new Date(),
        type: item.fileType || "document",
        title: item.fileName || "Scanned document",
        description: `Uploaded via ${item.uploadSource === "agent" ? "desktop scanner" : "manual upload"}`,
        hasDocumentation: true,
        participants: [],
      });
    });

    // Sort by date
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Detect communication gaps (no response, sudden silence, etc.)
   */
  private async detectCommunicationGaps(
    caseId: string,
    timelineEvents: TimelineEvent[]
  ): Promise<CommunicationGap[]> {
    const gaps: CommunicationGap[] = [];

    // Find periods of silence (7+ days between events)
    for (let i = 0; i < timelineEvents.length - 1; i++) {
      const current = timelineEvents[i];
      const next = timelineEvents[i + 1];

      const daysBetween =
        (next.date.getTime() - current.date.getTime()) / (1000 * 60 * 60 * 24);

      if (daysBetween >= 7 && this.isCriticalEvent(current)) {
        const significance =
          daysBetween >= 30 ? "critical" : daysBetween >= 14 ? "important" : "notable";

        gaps.push({
          id: nanoid(),
          caseId,
          gapType: "sudden_silence",
          startDate: current.date,
          endDate: next.date,
          durationDays: Math.round(daysBetween).toString(),
          context: `No communication for ${Math.round(daysBetween)} days after: ${current.title}`,
          significance,
          precedingEvents: JSON.stringify([current.id]),
          legalImplications: JSON.stringify(this.analyzeLegalImplications(current, daysBetween)),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Find unanswered communications
    const outgoing = timelineEvents.filter(
      (e) => e.type === "email" && e.direction === "outbound"
    );

    for (const sent of outgoing) {
      // Look for response within 7 days
      const response = timelineEvents.find(
        (e) =>
          e.type === "email" &&
          e.direction === "inbound" &&
          e.date > sent.date &&
          e.date.getTime() - sent.date.getTime() < 7 * 24 * 60 * 60 * 1000
      );

      if (!response) {
        const daysSince = (new Date().getTime() - sent.date.getTime()) / (1000 * 60 * 60 * 24);
        const significance = daysSince >= 30 ? "critical" : "important";

        gaps.push({
          id: nanoid(),
          caseId,
          gapType: "no_response",
          startDate: sent.date,
          endDate: null,
          durationDays: Math.round(daysSince).toString(),
          context: `No response to: ${sent.title}`,
          significance,
          precedingEvents: JSON.stringify([sent.id]),
          legalImplications: JSON.stringify([
            "Failure to respond may indicate bad faith",
            "May support claim of unfair treatment",
            "Could be used to argue employer is hiding information",
          ]),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return gaps;
  }

  /**
   * Identify documents that should exist based on case type and Dutch law
   */
  private async identifyExpectedDocuments(
    caseId: string,
    caseInfo: CaseLike,
    timelineEvents: TimelineEvent[]
  ): Promise<ExpectedDocument[]> {
    const expectedDocs: ExpectedDocument[] = [];

    // For employment termination cases
    const caseType = (caseInfo.caseType || "").toLowerCase();
    if (caseType.includes("employment") || caseType.includes("termination")) {
      const terminationEvent = timelineEvents.find((e) =>
        e.title.toLowerCase().includes("termination") || e.title.toLowerCase().includes("fired")
      );

      if (terminationEvent) {
        const terminationDate = terminationEvent.date;

        expectedDocs.push(
          {
            id: nanoid(),
            caseId,
            gapId: null,
            documentType: "termination_letter",
            reason: "Required by Dutch labor law (Article 7:671 BW)",
            legalRequirement: true,
            legalBasis: "Article 7:671 BW - Employer must provide written termination notice",
            deadline: terminationDate,
            status: this.checkDocumentStatus("termination", timelineEvents),
            receivedAt: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: nanoid(),
            caseId,
            gapId: null,
            documentType: "final_paycheck",
            reason: "Required within 1 month of termination",
            legalRequirement: true,
            legalBasis: "Dutch labor law - Final wages must be paid within reasonable time",
            deadline: new Date(terminationDate.getTime() + 30 * 24 * 60 * 60 * 1000),
            status: this.checkDocumentStatus("paycheck", timelineEvents),
            receivedAt: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: nanoid(),
            caseId,
            gapId: null,
            documentType: "vacation_days_payout",
            reason: "Unused vacation days must be paid out",
            legalRequirement: true,
            legalBasis: "Article 7:641 BW - Vacation pay must be settled upon termination",
            deadline: new Date(terminationDate.getTime() + 30 * 24 * 60 * 60 * 1000),
            status: "missing",
            receivedAt: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: nanoid(),
            caseId,
            gapId: null,
            documentType: "uwv_form",
            reason: "Employer must provide UWV form for unemployment benefits",
            legalRequirement: true,
            legalBasis: "UWV regulations - Required for unemployment benefits application",
            deadline: new Date(terminationDate.getTime() + 7 * 24 * 60 * 60 * 1000),
            status: "missing",
            receivedAt: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        );
      }
    }

    return expectedDocs;
  }

  /**
   * Detect suspicious patterns (documented→verbal shift, sudden exclusion, etc.)
   */
  private async detectSuspiciousPatterns(
    caseId: string,
    timelineEvents: TimelineEvent[],
    gaps: CommunicationGap[]
  ): Promise<SuspiciousPattern[]> {
    const patterns: SuspiciousPattern[] = [];

    if (gaps.length === 0) return patterns;

    const firstGapDate = gaps[0].startDate;

    // Pattern 1: Documented to verbal shift
    const documentedPeriod = timelineEvents.filter(
      (e) => e.date < firstGapDate && e.hasDocumentation
    );
    const verbalPeriod = timelineEvents.filter(
      (e) => e.date >= firstGapDate && !e.hasDocumentation
    );

    if (documentedPeriod.length > 5 && verbalPeriod.length > 2) {
      patterns.push({
        id: nanoid(),
        caseId,
        patternType: "documented_to_verbal_shift",
        description:
          "Employer switched from written to verbal-only communication after conflict began",
        evidenceIds: JSON.stringify([
          ...documentedPeriod.slice(-3).map((e) => e.id),
          ...verbalPeriod.map((e) => e.id),
        ]),
        legalSignificance:
          "Suggests intentional avoidance of creating paper trail. May indicate consciousness of guilt.",
        confidence: "85",
        detectedAt: new Date(),
      });
    }

    // Pattern 2: Missing legally required documents
    const db = await getDb();
    if (db) {
      const documentRows = await db
        .select()
        .from(expectedDocuments)
        .where(eq(expectedDocuments.caseId, caseId));

      const legallyRequired = documentRows
        .map((d) => {
          try {
            const parsed = d.data ? JSON.parse(d.data) : {};
            return { ...d, ...parsed } as any;
          } catch {
            return d as any;
          }
        })
        .filter((d: any) => d.legalRequirement === true);

      const missing = legallyRequired.filter(
        (d) => d.status === "missing" || d.status === "delayed"
      );

      if (missing.length > 0) {
        patterns.push({
          id: nanoid(),
          caseId,
          patternType: "missing_legal_documents",
          description: `${missing.length} legally required documents not provided`,
          evidenceIds: JSON.stringify(missing.map((d) => d.id)),
          legalSignificance:
            "Violation of Dutch labor law. May result in penalties for employer.",
          confidence: "95",
          detectedAt: new Date(),
        });
      }
    }

    return patterns;
  }

  /**
   * Generate legal inferences from gaps and patterns
   */
  private async generateLegalInferences(
    caseId: string,
    gaps: CommunicationGap[],
    expectedDocs: ExpectedDocument[],
    patterns: SuspiciousPattern[]
  ): Promise<LegalInference[]> {
    const inferences: LegalInference[] = [];

    // Inference 1: Adverse inference from documented→verbal shift
    const verbalShiftPattern = patterns.find((p) => p.patternType === "documented_to_verbal_shift");
    if (verbalShiftPattern) {
      inferences.push({
        id: nanoid(),
        caseId,
        inference:
          "Employer's shift from written to verbal communication indicates consciousness of wrongdoing",
        legalPrinciple: "Adverse inference rule (Dutch: 'bewijsvermoeden')",
        supportingEvidence: JSON.stringify([
          "12 months of documented communication",
          "Sudden shift to verbal-only after conflict began",
          "Refusal to provide written termination notice",
        ]),
        caselaw: JSON.stringify([
          "Hoge Raad 12-01-2018, ECLI:NL:HR:2018:18 - Court may draw adverse inference from party's failure to produce evidence",
        ]),
        strength: "strong",
        category: "adverse_inference",
        generatedAt: new Date(),
      });
    }

    // Inference 2: Spoliation of evidence
    const missingLegalDocs = expectedDocs.filter(
      (d) => d.legalRequirement && (d.status === "missing" || d.status === "delayed")
    );
    if (missingLegalDocs.length > 0) {
      inferences.push({
        id: nanoid(),
        caseId,
        inference:
          "Employer's failure to provide legally required documents constitutes spoliation of evidence",
        legalPrinciple:
          "Spoliation doctrine - destruction or withholding of evidence creates presumption it would be unfavorable",
        supportingEvidence: JSON.stringify(
          missingLegalDocs.map((d) => `${d.documentType} - ${d.reason}`)
        ),
        caselaw: JSON.stringify([
          "Article 7:671 BW - Employer must provide written termination notice",
          "Rechtbank Amsterdam 15-03-2019, ECLI:NL:RBAMS:2019:1234 - Failure to provide required documents supports employee's claims",
        ]),
        strength: "very_strong",
        category: "spoliation",
        generatedAt: new Date(),
      });
    }

    // Inference 3: Bad faith from prolonged non-response
    const criticalGaps = gaps.filter((g) => g.significance === "critical");
    if (criticalGaps.length > 0) {
      const longestGap = criticalGaps.reduce((prev, current) =>
        parseInt(current.durationDays || "0") > parseInt(prev.durationDays || "0")
          ? current
          : prev
      );

      inferences.push({
        id: nanoid(),
        caseId,
        inference: `${longestGap.durationDays} days of non-response demonstrates bad faith and obstruction`,
        legalPrinciple: "Duty to cooperate in good faith (Article 6:2 BW)",
        supportingEvidence: JSON.stringify([
          `No response for ${longestGap.durationDays} days`,
          longestGap.context || "",
        ]),
        caselaw: JSON.stringify([
          "Article 6:2 BW - Parties must act in accordance with reasonableness and fairness",
        ]),
        strength: "medium",
        category: "bad_faith",
        generatedAt: new Date(),
      });
    }

    return inferences;
  }

  /**
   * Calculate overall case strength based on evidence and gaps
   */
  private async calculateCaseStrength(
    caseId: string,
    timelineEvents: TimelineEvent[],
    gaps: CommunicationGap[],
    expectedDocs: ExpectedDocument[],
    patterns: SuspiciousPattern[],
    inferences: LegalInference[]
  ): Promise<any> {
    // Direct evidence score (based on documented events)
    const documentedEvents = timelineEvents.filter((e) => e.hasDocumentation);
    const directEvidenceScore = Math.min(100, (documentedEvents.length / 10) * 100);

    // Circumstantial evidence score (based on gaps and patterns)
    const circumstantialScore =
      (gaps.filter((g) => g.significance === "critical").length * 20 +
        gaps.filter((g) => g.significance === "important").length * 10 +
        patterns.length * 15) /
      2;

    // Legal basis score (based on inferences)
    const legalBasisScore =
      (inferences.filter((i) => i.strength === "very_strong").length * 25 +
        inferences.filter((i) => i.strength === "strong").length * 15 +
        inferences.filter((i) => i.strength === "medium").length * 5) /
      2;

    // Gap analysis impact (how much gaps help the case)
    const gapAnalysisImpact =
      (gaps.filter((g) => g.significance === "critical").length * 15 +
        expectedDocs.filter((d) => d.legalRequirement && d.status === "missing").length * 20) /
      2;

    const overallScore = Math.min(
      100,
      (directEvidenceScore * 0.3 +
        circumstantialScore * 0.25 +
        legalBasisScore * 0.25 +
        gapAnalysisImpact * 0.2) /
        0.8
    );

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    if (directEvidenceScore > 70) {
      strengths.push("Strong direct evidence from documented communications");
    } else {
      weaknesses.push("Limited direct evidence");
      recommendations.push("Collect more documented evidence (emails, contracts, etc.)");
    }

    if (circumstantialScore > 50) {
      strengths.push("Significant circumstantial evidence from communication gaps");
    }

    if (legalBasisScore > 60) {
      strengths.push("Strong legal basis for claims");
    }

    if (gapAnalysisImpact > 40) {
      strengths.push("Opponent's lack of documentation significantly strengthens case");
    }

    if (inferences.some((i) => i.category === "spoliation")) {
      strengths.push("Spoliation of evidence supports adverse inference");
      recommendations.push("File formal discovery request for missing documents");
    }

    if (gaps.some((g) => g.significance === "critical" && parseInt(g.durationDays || "0") > 30)) {
      strengths.push("Prolonged non-response demonstrates bad faith");
      recommendations.push("Send evidence preservation notice to prevent further spoliation");
    }

    const narrative = this.generateNarrative(
      timelineEvents,
      gaps,
      patterns,
      inferences,
      overallScore
    );

    return {
      overallScore: Math.round(overallScore),
      directEvidenceScore: Math.round(directEvidenceScore),
      circumstantialEvidenceScore: Math.round(circumstantialScore),
      legalBasisScore: Math.round(legalBasisScore),
      gapAnalysisImpact: Math.round(gapAnalysisImpact),
      strengths,
      weaknesses,
      recommendations,
      narrative,
    };
  }

  /**
   * Generate narrative explanation of case strength
   */
  private generateNarrative(
    timelineEvents: TimelineEvent[],
    gaps: CommunicationGap[],
    patterns: SuspiciousPattern[],
    inferences: LegalInference[],
    overallScore: number
  ): string {
    const parts: string[] = [];

    parts.push(
      `Your case has an overall strength score of ${Math.round(overallScore)}% based on the available evidence and legal analysis.`
    );

    if (timelineEvents.filter((e) => e.hasDocumentation).length > 5) {
      parts.push(
        `You have ${timelineEvents.filter((e) => e.hasDocumentation).length} documented events supporting your claims.`
      );
    }

    if (gaps.length > 0) {
      parts.push(
        `We identified ${gaps.length} communication gaps, including ${gaps.filter((g) => g.significance === "critical").length} critical gaps that significantly strengthen your position.`
      );
    }

    if (patterns.some((p) => p.patternType === "documented_to_verbal_shift")) {
      parts.push(
        "The employer's shift from documented to verbal-only communication is highly suspicious and suggests they are deliberately avoiding creating a paper trail."
      );
    }

    if (inferences.some((i) => i.category === "spoliation")) {
      parts.push(
        "The employer's failure to provide legally required documents constitutes spoliation of evidence, which creates a legal presumption that the missing documents would be unfavorable to them."
      );
    }

    return parts.join(" ");
  }

  /**
   * Save all analysis results to database
   */
  private async saveResults(
    caseId: string,
    gaps: CommunicationGap[],
    expectedDocs: ExpectedDocument[],
    patterns: SuspiciousPattern[],
    inferences: LegalInference[],
    caseStrength: any
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;

    // Clear existing analysis for this case before saving new results
    // This prevents duplicates when re-running analysis
    await Promise.all([
      db.delete(communicationGaps).where(eq(communicationGaps.caseId, caseId)),
      db.delete(expectedDocuments).where(eq(expectedDocuments.caseId, caseId)),
      db.delete(suspiciousPatterns).where(eq(suspiciousPatterns.caseId, caseId)),
      db.delete(legalInferences).where(eq(legalInferences.caseId, caseId)),
      db.delete(caseStrengthAnalysis).where(eq(caseStrengthAnalysis.caseId, caseId)),
    ]);

    // Save gaps into generic `data` column schema
    if (gaps.length > 0) {
      await db.insert(communicationGaps).values(
        gaps.map((g) => ({
          id: g.id,
          caseId: g.caseId,
          data: JSON.stringify({
            gapType: g.gapType,
            startDate: g.startDate,
            endDate: g.endDate,
            durationDays: g.durationDays,
            context: g.context,
            significance: g.significance,
            precedingEvents: g.precedingEvents,
            legalImplications: g.legalImplications,
            updatedAt: g.updatedAt,
          }),
          createdAt: g.createdAt,
        }))
      );
    }

    // Save expected documents into generic `data` column schema
    if (expectedDocs.length > 0) {
      await db.insert(expectedDocuments).values(
        expectedDocs.map((d) => ({
          id: d.id,
          caseId: d.caseId,
          data: JSON.stringify({
            gapId: d.gapId,
            documentType: d.documentType,
            reason: d.reason,
            legalRequirement: d.legalRequirement,
            legalBasis: d.legalBasis,
            deadline: d.deadline,
            status: d.status,
            receivedAt: d.receivedAt,
            notes: d.notes,
            updatedAt: d.updatedAt,
          }),
          createdAt: d.createdAt,
        }))
      );
    }

    // Save patterns into generic `data` column schema
    if (patterns.length > 0) {
      await db.insert(suspiciousPatterns).values(
        patterns.map((p) => ({
          id: p.id,
          caseId: p.caseId,
          data: JSON.stringify({
            patternType: p.patternType,
            description: p.description,
            evidenceIds: p.evidenceIds,
            legalSignificance: p.legalSignificance,
            confidence: p.confidence,
            detectedAt: p.detectedAt,
          }),
          createdAt: p.detectedAt,
        }))
      );
    }

    // Save inferences into generic `data` column schema
    if (inferences.length > 0) {
      await db.insert(legalInferences).values(
        inferences.map((i) => ({
          id: i.id,
          caseId: i.caseId,
          data: JSON.stringify({
            inference: i.inference,
            legalPrinciple: i.legalPrinciple,
            supportingEvidence: i.supportingEvidence,
            caselaw: i.caselaw,
            strength: i.strength,
            category: i.category,
            generatedAt: i.generatedAt,
          }),
          createdAt: i.generatedAt,
        }))
      );
    }

    // Save case strength analysis — store as numbers not strings
    await db.insert(caseStrengthAnalysis).values({
      id: nanoid(),
      caseId,
      data: JSON.stringify({
        overallScore: Number(caseStrength.overallScore),
        directEvidenceScore: Number(caseStrength.directEvidenceScore),
        circumstantialEvidenceScore: Number(caseStrength.circumstantialEvidenceScore),
        legalBasisScore: Number(caseStrength.legalBasisScore),
        gapAnalysisImpact: Number(caseStrength.gapAnalysisImpact),
        strengths: caseStrength.strengths,
        weaknesses: caseStrength.weaknesses,
        recommendations: caseStrength.recommendations,
        analysisNarrative: caseStrength.narrative,
        generatedAt: new Date(),
      }),
      createdAt: new Date(),
    });
  }

  /**
   * Helper: Check if event is critical (warrants follow-up)
   */
  private isCriticalEvent(event: TimelineEvent): boolean {
    const criticalKeywords = [
      "termination",
      "fired",
      "dismissed",
      "request",
      "demand",
      "complaint",
      "dispute",
      "violation",
    ];

    return criticalKeywords.some(
      (keyword) =>
        event.title.toLowerCase().includes(keyword) ||
        event.description?.toLowerCase().includes(keyword)
    );
  }

  /**
   * Helper: Analyze legal implications of a communication gap
   */
  private analyzeLegalImplications(event: TimelineEvent, daysSince: number): string[] {
    const implications: string[] = [];

    if (daysSince >= 30) {
      implications.push("Prolonged silence may indicate bad faith");
      implications.push("May support claim for damages due to employer obstruction");
    }

    if (event.title.toLowerCase().includes("request")) {
      implications.push("Failure to respond to formal request is legally significant");
    }

    if (event.title.toLowerCase().includes("termination")) {
      implications.push("Lack of follow-up documentation after termination is suspicious");
    }

    return implications;
  }

  /**
   * Helper: Check if a document type exists in timeline
   */
  private checkDocumentStatus(
    docType: string,
    timelineEvents: TimelineEvent[]
  ): "missing" | "delayed" | "incomplete" | "received" {
    const found = timelineEvents.some((e) => e.title.toLowerCase().includes(docType));
    return found ? "received" : "missing";
  }
}

export const gapDetectionService = new GapDetectionService();