import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard,
  TrendingUp,
  Calendar,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import UsageQuotaWidget from '@/components/billing/UsageQuotaWidget';

/**
 * Billing Dashboard
 * Display usage, invoices, and subscription management
 */

export default function BillingDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [upgrading, setUpgrading] = useState(false);

  // Queries
  const { data: usage, isLoading: usageLoading } = trpc.billing.getUsage.useQuery();
  const { data: limits, isLoading: limitsLoading } = trpc.billing.getUsageLimits.useQuery();
  const { data: invoices, isLoading: invoicesLoading } = trpc.billing.getInvoices.useQuery();
  const { data: upcomingInvoice } = trpc.billing.getUpcomingInvoice.useQuery();
  const { data: subscription } = trpc.billing.getSubscription.useQuery();

  // Mutations
  const createCheckout = trpc.billing.createCheckoutSession.useMutation();
  const createPortal = trpc.billing.createPortalSession.useMutation();

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const result = await createCheckout.mutateAsync({});
      window.open(result.sessionUrl, '_blank');
      toast.info('Redirecting to checkout...');
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast.error(`Failed to start checkout: ${error.message}`);
    } finally {
      setUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const result = await createPortal.mutateAsync({});
      window.open(result.portalUrl, '_blank');
      toast.info('Opening Customer Portal...');
    } catch (error: any) {
      console.error('Error creating portal session:', error);
      toast.error(`Failed to open portal: ${error.message}`);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const tier = user.subscriptionTier || 'free';
  const status = user.subscriptionStatus || 'free';

  // Calculate usage percentage for free tier
  const usagePercentages: Record<string, number> = {};
  if (limits && tier === 'free') {
    Object.entries(limits).forEach(([resourceType, limit]: [string, any]) => {
      if (limit.limit > 0) {
        usagePercentages[resourceType] = (limit.used / limit.limit) * 100;
      }
    });
  }

  return (
    <div className="container py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Billing & Usage</h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription and track resource usage
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={tier === 'free' ? 'secondary' : 'default'} className="text-sm px-3 py-1">
            {tier.toUpperCase()} TIER
          </Badge>
          {tier !== 'free' && (
            <Button variant="outline" onClick={handleManageSubscription}>
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Subscription
            </Button>
          )}
        </div>
      </div>

      {/* Subscription Status */}
      {tier === 'free' && (
        <Card className="mb-6 border-primary bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Upgrade to Pro</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Unlock unlimited access with pay-as-you-go metered billing. Only pay for what you use.
                </p>
                <ul className="space-y-1 text-sm mb-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>$29/month base + metered usage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Volume discounts (up to 50% off)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Priority support</span>
                  </li>
                </ul>
              </div>
              <Button size="lg" onClick={handleUpgrade} disabled={upgrading}>
                {upgrading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Upgrade Now'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Info for Pro/Enterprise */}
      {tier !== 'free' && subscription?.subscription && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={status === 'active' ? 'default' : 'destructive'}>
                  {status.toUpperCase()}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Period</p>
                <p className="font-medium">
                  {new Date(subscription.subscription.currentPeriodStart).toLocaleDateString()} -{' '}
                  {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="usage" className="space-y-6">
        <TabsList>
          <TabsTrigger value="usage">Current Usage</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          {tier !== 'free' && <TabsTrigger value="upcoming">Upcoming</TabsTrigger>}
        </TabsList>

        {/* Current Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          {/* Usage Quota Widget */}
          <UsageQuotaWidget />
          
          {usageLoading || limitsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Total Usage */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Month Usage</CardTitle>
                  <CardDescription>
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    ${((usage?.total || 0) / 100).toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total billed cost (includes 2.5x markup)
                  </p>
                </CardContent>
              </Card>

              {/* Usage by Resource Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Usage Breakdown</CardTitle>
                  <CardDescription>Resource consumption by type</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {usage?.byResourceType && Object.keys(usage.byResourceType).length > 0 ? (
                    Object.entries(usage.byResourceType).map(([resourceType, data]: [string, any]) => {
                      const limit = limits?.[resourceType];
                      const percentage = limit?.limit > 0 ? (limit.used / limit.limit) * 100 : 0;

                      return (
                        <div key={resourceType} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium capitalize">
                                {resourceType.replace(/_/g, ' ')}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {data.quantity} units • ${(data.cost / 100).toFixed(2)}
                              </p>
                            </div>
                            {tier === 'free' && limit?.limit > 0 && (
                              <Badge variant={percentage >= 80 ? 'destructive' : 'secondary'}>
                                {limit.used} / {limit.limit}
                              </Badge>
                            )}
                          </div>
                          {tier === 'free' && limit?.limit > 0 && (
                            <Progress value={percentage} className="h-2" />
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No usage recorded this month</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          {invoicesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : invoices && invoices.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Invoice History</CardTitle>
                <CardDescription>Past invoices and payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {invoice.number || invoice.id}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(invoice.created).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">
                            ${(invoice.amountPaid / 100).toFixed(2)}
                          </p>
                          <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                            {invoice.status}
                          </Badge>
                        </div>
                        {invoice.invoicePdf && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(invoice.invoicePdf!, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">No invoices yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Upcoming Invoice Tab */}
        {tier !== 'free' && (
          <TabsContent value="upcoming" className="space-y-4">
            {upcomingInvoice ? (
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Invoice</CardTitle>
                  <CardDescription>
                    Estimated charges for current billing period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Total</p>
                      <p className="text-3xl font-bold">
                        ${(upcomingInvoice.amountDue / 100).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Line Items</p>
                      <div className="space-y-2">
                        {upcomingInvoice.lines.map((line, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span>{line.description}</span>
                            <span className="font-medium">
                              ${(line.amount / 100).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        This is an estimate. Final amount may vary based on usage.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
                  <p className="text-muted-foreground">No upcoming invoice</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

