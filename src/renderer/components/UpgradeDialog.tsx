import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { Loader2, Zap, CheckCircle2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Upgrade Dialog Component
 * Shows when user hits usage limits
 */

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType?: string;
  used?: number;
  limit?: number;
}

const RESOURCE_LABELS: Record<string, string> = {
  ai_email_analysis: 'AI Email Analyses',
  ai_document_analysis: 'AI Document Analyses',
  ai_legal_inference: 'AI Legal Inferences',
  email_sync: 'Email Syncs',
  lawyer_outreach: 'Lawyer Outreach Messages',
  document_generation: 'Document Generations',
  case_analysis: 'Case Analyses',
};

export default function UpgradeDialog({
  open,
  onOpenChange,
  resourceType,
  used,
  limit,
}: UpgradeDialogProps) {
  const [upgrading, setUpgrading] = useState(false);
  const createCheckout = trpc.billing.createCheckoutSession.useMutation();

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const result = await createCheckout.mutateAsync({});
      window.open(result.sessionUrl, '_blank');
      toast.info('Redirecting to checkout...');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast.error(`Failed to start checkout: ${error.message}`);
    } finally {
      setUpgrading(false);
    }
  };

  const resourceLabel = resourceType ? RESOURCE_LABELS[resourceType] || resourceType : 'resources';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl">Usage Limit Reached</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {resourceType && used !== undefined && limit !== undefined ? (
              <>
                You've used <strong>{used}/{limit}</strong> {resourceLabel.toLowerCase()} this month.
                Upgrade to Pro for unlimited access with pay-as-you-go pricing.
              </>
            ) : (
              <>
                You've reached your monthly usage limit. Upgrade to Pro for unlimited access with
                pay-as-you-go pricing.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Plan */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Free Tier</span>
              <Badge variant="secondary">Current Plan</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Limited monthly quotas • No payment required
            </p>
          </div>

          {/* Pro Plan */}
          <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">Pro Tier</span>
                  <Badge variant="default">Recommended</Badge>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold">$29</span>
                  <span className="text-sm text-muted-foreground">/month base</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">+ metered usage</p>
              </div>
            </div>

            <ul className="space-y-2 mb-4">
              <li className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Unlimited AI analyses, email syncs, and lawyer outreach</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Pay only for what you use (starting at $0.01/unit)</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Volume discounts up to 50% off</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Priority email support</span>
              </li>
            </ul>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>First 1,000 units: $0.01/unit • Next 9,000: $0.008/unit • 10,000+: $0.005/unit</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade} disabled={upgrading} className="w-full sm:w-auto">
            {upgrading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
