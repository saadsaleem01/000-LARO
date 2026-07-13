import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  X,
  Star,
  MapPin,
  Briefcase,
  TrendingUp,
  Clock,
  Euro,
  Award,
  Sparkles,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface Lawyer {
  id: string;
  name: string;
  firm: string;
  city: string;
  legalAreas: string[];
  yearsExperience?: number;
  responseRate?: number;
  successRate?: number;
  averageResponseTime?: string;
  estimatedCost?: string;
  availability?: string;
  rating?: number;
  casesHandled?: number;
}

interface ComparisonProps {
  lawyers: Lawyer[];
  caseType?: string;
  onSelect?: (lawyerId: string) => void;
  onClose?: () => void;
}

export default function LawyerComparison({ lawyers, caseType, onSelect, onClose }: ComparisonProps) {
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());

  const toggleShortlist = (lawyerId: string) => {
    setShortlist(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lawyerId)) {
        newSet.delete(lawyerId);
        toast.info("Removed from shortlist");
      } else {
        newSet.add(lawyerId);
        toast.success("Added to shortlist");
      }
      return newSet;
    });
  };

  const generateWhyThisLawyer = (lawyer: Lawyer): string[] => {
    const reasons: string[] = [];

    if (lawyer.successRate && lawyer.successRate > 85) {
      reasons.push(`High success rate of ${lawyer.successRate}% in similar cases`);
    }

    if (lawyer.yearsExperience && lawyer.yearsExperience > 10) {
      reasons.push(`${lawyer.yearsExperience}+ years of specialized experience`);
    }

    if (lawyer.responseRate && lawyer.responseRate > 90) {
      reasons.push(`Excellent communication (${lawyer.responseRate}% response rate)`);
    }

    if (lawyer.averageResponseTime === "< 24 hours") {
      reasons.push("Quick to respond - typically within 24 hours");
    }

    if (caseType && lawyer.legalAreas.some(area => area.toLowerCase().includes(caseType.toLowerCase()))) {
      reasons.push(`Specializes in ${caseType} cases`);
    }

    if (lawyer.casesHandled && lawyer.casesHandled > 100) {
      reasons.push(`Extensive track record with ${lawyer.casesHandled}+ cases handled`);
    }

    return reasons.length > 0 ? reasons : ["Qualified professional with relevant experience"];
  };

  const getMatchScore = (lawyer: Lawyer): number => {
    let score = 0;
    
    if (lawyer.successRate) score += (lawyer.successRate / 100) * 30;
    if (lawyer.responseRate) score += (lawyer.responseRate / 100) * 20;
    if (lawyer.yearsExperience) score += Math.min(lawyer.yearsExperience / 20, 1) * 25;
    if (caseType && lawyer.legalAreas.some(area => area.toLowerCase().includes(caseType.toLowerCase()))) {
      score += 25;
    }
    
    return Math.round(score);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Compare Lawyers</h2>
          <p className="text-muted-foreground">Side-by-side comparison of {lawyers.length} recommended lawyers</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lawyers.map((lawyer) => {
          const matchScore = getMatchScore(lawyer);
          const reasons = generateWhyThisLawyer(lawyer);
          const isShortlisted = shortlist.has(lawyer.id);

          return (
            <Card key={lawyer.id} className={`relative ${isShortlisted ? "ring-2 ring-primary" : ""}`}>
              {/* Match Score Badge */}
              <div className="absolute top-4 right-4">
                <Badge variant={matchScore > 80 ? "default" : matchScore > 60 ? "secondary" : "outline"}>
                  {matchScore}% Match
                </Badge>
              </div>

              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{lawyer.name}</CardTitle>
                    <CardDescription>{lawyer.firm}</CardDescription>
                    <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {lawyer.city}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Why This Lawyer */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Why this lawyer?</span>
                  </div>
                  <ul className="space-y-1">
                    {reasons.slice(0, 3).map((reason, idx) => (
                      <li key={idx} className="text-xs flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  {lawyer.successRate !== undefined && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="w-3 h-3" />
                        Success Rate
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={lawyer.successRate} className="h-1.5 flex-1" />
                        <span className="text-sm font-medium">{lawyer.successRate}%</span>
                      </div>
                    </div>
                  )}

                  {lawyer.responseRate !== undefined && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Response Rate
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={lawyer.responseRate} className="h-1.5 flex-1" />
                        <span className="text-sm font-medium">{lawyer.responseRate}%</span>
                      </div>
                    </div>
                  )}

                  {lawyer.yearsExperience && (
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Award className="w-3 h-3" />
                        Experience
                      </div>
                      <p className="text-sm font-medium">{lawyer.yearsExperience} years</p>
                    </div>
                  )}

                  {lawyer.casesHandled && (
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Briefcase className="w-3 h-3" />
                        Cases
                      </div>
                      <p className="text-sm font-medium">{lawyer.casesHandled}+</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Additional Info */}
                <div className="space-y-2 text-sm">
                  {lawyer.averageResponseTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Response Time</span>
                      <span className="font-medium">{lawyer.averageResponseTime}</span>
                    </div>
                  )}

                  {lawyer.estimatedCost && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Euro className="w-3 h-3" />
                        Est. Cost
                      </span>
                      <span className="font-medium">{lawyer.estimatedCost}</span>
                    </div>
                  )}

                  {lawyer.availability && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Availability
                      </span>
                      <Badge variant="secondary">{lawyer.availability}</Badge>
                    </div>
                  )}
                </div>

                {/* Legal Areas */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Specializations</p>
                  <div className="flex flex-wrap gap-1">
                    {lawyer.legalAreas.slice(0, 3).map((area, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {area}
                      </Badge>
                    ))}
                    {lawyer.legalAreas.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{lawyer.legalAreas.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex gap-2">
                <Button
                  variant={isShortlisted ? "secondary" : "outline"}
                  className="flex-1"
                  onClick={() => toggleShortlist(lawyer.id)}
                >
                  {isShortlisted ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Shortlisted
                    </>
                  ) : (
                    "Add to Shortlist"
                  )}
                </Button>
                
                {onSelect && (
                  <Button
                    className="flex-1"
                    onClick={() => onSelect(lawyer.id)}
                  >
                    Select
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Shortlist Summary */}
      {shortlist.size > 0 && (
        <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Shortlist ({shortlist.size})</p>
              <p className="text-sm text-muted-foreground">
                You can contact these lawyers or compare them further
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShortlist(new Set())}>
                Clear All
              </Button>
              <Button>
                Contact Shortlisted ({shortlist.size})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

