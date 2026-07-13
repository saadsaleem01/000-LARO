import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle, TrendingUp } from 'lucide-react';
import { useLocation } from 'wouter';

/**
 * Usage Alert Banner
 * Shows site-wide banner when user hits 80% of any quota
 */

export default function UsageAlertBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [, setLocation] = useLocation();
  
  const { data: limits } = trpc.billing.getUsageLimits.useQuery(undefined, {
    refetchInterval: 60000, // Check every minute
  });

  // Check if any resource is at or above 80%
  const criticalResources = limits
    ? Object.entries(limits)
        .filter(([_, limit]: [string, any]) => {
          if (limit.limit === -1) return false; // Skip unlimited
          const percent = (limit.used / limit.limit) * 100;
          return percent >= 80;
        })
        .map(([type, limit]: [string, any]) => ({
          type,
          used: limit.used,
          limit: limit.limit,
          remaining: limit.remaining,
          percent: Math.round((limit.used / limit.limit) * 100),
        }))
    : [];

  // Load dismissed state from localStorage
  useEffect(() => {
    const dismissedUntil = localStorage.getItem('usage-alert-dismissed');
    if (dismissedUntil) {
      const dismissedTime = parseInt(dismissedUntil);
      const now = Date.now();
      // Auto-show again after 24 hours
      if (now - dismissedTime < 24 * 60 * 60 * 1000) {
        setDismissed(true);
      } else {
        localStorage.removeItem('usage-alert-dismissed');
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('usage-alert-dismissed', Date.now().toString());
  };

  const handleUpgrade = () => {
    setLocation('/billing');
  };

  // Don't show if dismissed or no critical resources
  if (dismissed || !criticalResources || criticalResources.length === 0) {
    return null;
  }

  // Get the most critical resource
  const mostCritical = criticalResources.reduce((max, current) =>
    current.percent > max.percent ? current : max
  );

  // Resource labels
  const resourceLabels: Record<string, string> = {
    ai_email_analysis: 'AI Email Analysis',
    ai_document_analysis: 'AI Document Analysis',
    ai_legal_inference: 'Legal Inference',
    email_sync: 'Email Sync',
    lawyer_outreach: 'Lawyer Outreach',
    document_generation: 'Document Generation',
  };

  const resourceLabel = resourceLabels[mostCritical.type] || mostCritical.type;
  const isAtLimit = mostCritical.percent >= 100;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top">
      <Alert
        variant={isAtLimit ? 'destructive' : 'default'}
        className={`rounded-none border-x-0 border-t-0 ${
          isAtLimit
            ? 'bg-red-50 border-red-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}
      >
        <div className="container flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3 flex-1">
            {isAtLimit ? (
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            ) : (
              <TrendingUp className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            )}
            <AlertDescription className="text-sm font-medium m-0">
              {isAtLimit ? (
                <>
                  <span className="text-red-900">Quota Reached:</span>{' '}
                  <span className="text-red-700">
                    You've used all {mostCritical.limit} {resourceLabel} credits this month.
                    Upgrade to Pro for unlimited access.
                  </span>
                </>
              ) : (
                <>
                  <span className="text-yellow-900">Approaching Limit:</span>{' '}
                  <span className="text-yellow-700">
                    You've used {mostCritical.percent}% of your {resourceLabel} quota ({mostCritical.used}/{mostCritical.limit}).
                    {mostCritical.remaining > 0 && ` ${mostCritical.remaining} remaining.`}
                  </span>
                </>
              )}
            </AlertDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isAtLimit ? 'destructive' : 'default'}
              onClick={handleUpgrade}
              className="flex-shrink-0"
            >
              Upgrade to Pro
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
}
