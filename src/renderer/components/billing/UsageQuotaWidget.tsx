import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingUp, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Usage Quota Widget
 * Shows real-time usage with progress bars for each resource type
 */

interface ResourceUsage {
  type: string;
  label: string;
  used: number;
  limit: number;
  remaining: number;
  unit: string;
  icon: string;
}

export default function UsageQuotaWidget() {
  const { data: usage, isLoading } = trpc.billing.getUsage.useQuery(undefined, {
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const { data: limits } = trpc.billing.getUsageLimits.useQuery();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage & Quotas</CardTitle>
          <CardDescription>Loading your current usage...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usage || !limits) {
    return null;
  }

  // Map resource types to display info
  const resourceInfo: Record<string, { label: string; unit: string; icon: string }> = {
    ai_email_analysis: { label: "AI Email Analysis", unit: "analyses", icon: "📧" },
    ai_document_analysis: { label: "AI Document Analysis", unit: "analyses", icon: "📄" },
    ai_legal_inference: { label: "Legal Inference", unit: "analyses", icon: "⚖️" },
    email_sync: { label: "Email Sync", unit: "emails", icon: "🔄" },
    lawyer_outreach: { label: "Lawyer Outreach", unit: "messages", icon: "👔" },
    document_generation: { label: "Document Generation", unit: "documents", icon: "📝" },
  };

  // Build resource usage data
  const resources: ResourceUsage[] = [];
  
  for (const [type, info] of Object.entries(resourceInfo)) {
    const used = usage.byResourceType[type]?.quantity || 0;
    const limit = limits[type] || -1;
    
    // Skip unlimited resources for Pro users
    if (limit === -1) continue;
    
    const remaining = Math.max(0, limit - used);
    
    resources.push({
      type,
      label: info.label,
      used,
      limit,
      remaining,
      unit: info.unit,
      icon: info.icon,
    });
  }

  // Check if user is Pro (unlimited)
  const isPro = resources.length === 0;

  // Calculate overall usage percentage
  const overallUsed = resources.reduce((sum, r) => sum + r.used, 0);
  const overallLimit = resources.reduce((sum, r) => sum + r.limit, 0);
  const overallPercent = overallLimit > 0 ? (overallUsed / overallLimit) * 100 : 0;

  // Determine if user is approaching limits
  const nearLimit = resources.some((r) => {
    const percent = (r.used / r.limit) * 100;
    return percent >= 80;
  });

  const getProgressColor = (used: number, limit: number): string => {
    const percent = (used / limit) * 100;
    if (percent >= 80) return "bg-red-500";
    if (percent >= 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getProgressValue = (used: number, limit: number): number => {
    return Math.min((used / limit) * 100, 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Usage & Quotas
        </CardTitle>
        <CardDescription>
          {isPro
            ? "You have unlimited usage with Pro plan"
            : "Your current month's resource usage"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isPro ? (
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <Zap className="h-8 w-8 text-blue-600" />
            <div>
              <p className="font-semibold text-blue-900">Unlimited Access</p>
              <p className="text-sm text-blue-700">
                You're on the Pro plan with unlimited usage. Pay only for what you use.
              </p>
            </div>
          </div>
        ) : (
          <>
            {nearLimit && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You're approaching your free tier limits. Upgrade to Pro for unlimited usage.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {resources.map((resource) => {
                const percent = getProgressValue(resource.used, resource.limit);
                const colorClass = getProgressColor(resource.used, resource.limit);

                return (
                  <div key={resource.type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{resource.icon}</span>
                        <span className="font-medium text-sm">{resource.label}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {resource.used} / {resource.limit} {resource.unit}
                      </span>
                    </div>
                    <div className="relative">
                      <Progress value={percent} className="h-2" />
                      <div
                        className={`absolute top-0 left-0 h-2 rounded-full transition-all ${colorClass}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    {percent >= 80 && (
                      <p className="text-xs text-red-600">
                        ⚠️ {resource.remaining} {resource.unit} remaining
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {nearLimit && (
              <div className="pt-4 border-t">
                <Button className="w-full" size="lg">
                  Upgrade to Pro for Unlimited Usage
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
