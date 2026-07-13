/**
 * OutreachProgressBar Component
 * 
 * Visualizes outreach progress with multi-stage segmented bar chart.
 * Shows the funnel from initial contact to match with color-coded stages.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Send, Users } from "lucide-react";

export interface OutreachStats {
  total: number;
  reached: number;      // Initial contact made, no response yet (Orange)
  reminded: number;     // Follow-up sent, awaiting response (Blue)
  rejected: number;     // Declined the case (Red)
  matched: number;      // Accepted the case (Green)
  noResponse: number;   // No response after Day 15 (Gray)
}

export interface LegalAreaProgress {
  name: string;         // "Arbeidsrecht"
  nameEn: string;       // "Employment Law"
  stats: OutreachStats;
  lastUpdated: Date;
}

interface OutreachProgressBarProps {
  legalArea: LegalAreaProgress;
  showDetails?: boolean;
}

interface MultiAreaProgressProps {
  caseId: string;
  legalAreas: LegalAreaProgress[];
  overallStats?: {
    totalLawyers: number;
    totalMatched: number;
    successRate: number;
  };
}

/**
 * Single legal area progress bar
 */
export function OutreachProgressBar({ legalArea, showDetails = true }: OutreachProgressBarProps) {
  const { stats } = legalArea;
  
  // Calculate percentages
  const matchedPct = (stats.matched / stats.total) * 100;
  const rejectedPct = (stats.rejected / stats.total) * 100;
  const remindedPct = (stats.reminded / stats.total) * 100;
  const reachedPct = (stats.reached / stats.total) * 100;
  const noResponsePct = (stats.noResponse / stats.total) * 100;
  
  const segments = [
    { 
      label: "Matched", 
      count: stats.matched, 
      pct: matchedPct, 
      color: "bg-green-500", 
      icon: CheckCircle2,
      description: "Lawyers who accepted your case"
    },
    { 
      label: "Rejected", 
      count: stats.rejected, 
      pct: rejectedPct, 
      color: "bg-red-500", 
      icon: XCircle,
      description: "Lawyers who declined"
    },
    { 
      label: "Reminded", 
      count: stats.reminded, 
      pct: remindedPct, 
      color: "bg-blue-500", 
      icon: Clock,
      description: "Follow-up sent, awaiting response"
    },
    { 
      label: "Reached", 
      count: stats.reached, 
      pct: reachedPct, 
      color: "bg-orange-500", 
      icon: Send,
      description: "Initial contact made, no response yet"
    },
    { 
      label: "No Response", 
      count: stats.noResponse, 
      pct: noResponsePct, 
      color: "bg-gray-400", 
      icon: Users,
      description: "No response after 15 days"
    },
  ].filter(s => s.count > 0); // Only show non-zero segments
  
  return (
    <div className="space-y-3">
      {/* Legal Area Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-sm">{legalArea.name}</h4>
          <p className="text-xs text-muted-foreground">{legalArea.nameEn}</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {stats.total} lawyers contacted
        </Badge>
      </div>
      
      {/* Segmented Progress Bar */}
      <div className="relative">
        {/* Bar container */}
        <div className="flex h-8 w-full overflow-hidden rounded-md border border-border">
          {segments.map((segment, idx) => (
            <TooltipProvider key={idx}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`${segment.color} flex items-center justify-center text-white text-xs font-semibold transition-all hover:opacity-80 cursor-help`}
                    style={{ width: `${segment.pct}%` }}
                  >
                    {segment.pct > 8 && segment.count}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex items-center gap-2">
                    <segment.icon className="h-4 w-4" />
                    <div>
                      <p className="font-semibold">{segment.label}: {segment.count}</p>
                      <p className="text-xs text-muted-foreground">{segment.description}</p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
        
        {/* Numbers above bar (for segments too small to show count inside) */}
        <div className="flex absolute -top-6 w-full text-xs">
          {segments.map((segment, idx) => (
            <div
              key={idx}
              className="flex items-center justify-center font-semibold"
              style={{ width: `${segment.pct}%` }}
            >
              {segment.pct <= 8 && segment.count > 0 && (
                <span className="text-muted-foreground">{segment.count}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Detailed Stats (optional) */}
      {showDetails && (
        <div className="grid grid-cols-5 gap-2 text-xs">
          {segments.map((segment, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${segment.color}`} />
              <span className="text-muted-foreground">{segment.label}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Last Updated */}
      <p className="text-xs text-muted-foreground text-right">
        Last updated: {new Date(legalArea.lastUpdated).toLocaleString('nl-NL', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </p>
    </div>
  );
}

/**
 * Multi-discipline outreach progress (for cases with multiple legal areas)
 */
export function MultiAreaOutreachProgress({ caseId, legalAreas, overallStats }: MultiAreaProgressProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Outreach Progress by Legal Area
        </CardTitle>
        <CardDescription>
          We're reaching out to specialists in each relevant legal area for your case
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Summary */}
        {overallStats && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total Contacted</p>
              <p className="text-2xl font-bold">{overallStats.totalLawyers}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Matches Found</p>
              <p className="text-2xl font-bold text-green-600">{overallStats.totalMatched}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold">{overallStats.successRate.toFixed(1)}%</p>
            </div>
          </div>
        )}
        
        {/* Progress bars for each legal area */}
        <div className="space-y-6">
          {legalAreas.map((area, idx) => (
            <OutreachProgressBar key={idx} legalArea={area} showDetails={true} />
          ))}
        </div>
        
        {/* Empty state */}
        {legalAreas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No outreach campaigns started yet</p>
            <p className="text-sm">We'll begin contacting lawyers shortly</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

