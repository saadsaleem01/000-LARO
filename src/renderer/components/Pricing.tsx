import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Check, Zap, Loader2, Mail, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { getLoginUrl } from '@/const';

/**
 * Pricing Page
 * Display pricing tiers and FAQ
 */

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();
  const [upgrading, setUpgrading] = useState(false);
  const createCheckout = trpc.billing.createCheckoutSession.useMutation();

  const handleUpgrade = async () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

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

  const currentTier = user?.subscriptionTier || 'free';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="container py-12 max-w-6xl">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">
            PRICING
          </Badge>
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start for free, upgrade when you need more. Pay only for what you use with our
            metered billing system.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {/* Free Tier */}
          <Card className={currentTier === 'free' ? 'border-2 border-primary' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-2xl">Free</CardTitle>
                {currentTier === 'free' && <Badge variant="default">Current Plan</Badge>}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/forever</span>
              </div>
              <CardDescription className="mt-2">
                Perfect for trying out LARO
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">2 case analyses per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">10 AI email analyses</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">5 AI document analyses</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">50 email syncs</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">5 lawyer outreach messages</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">3 document generations</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled={currentTier === 'free'}>
                {currentTier === 'free' ? 'Current Plan' : 'Downgrade'}
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Tier */}
          <Card className={`relative ${currentTier === 'pro' ? 'border-2 border-primary' : 'border-2 border-primary shadow-lg'}`}>
            {currentTier !== 'pro' && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="px-4 py-1">Most Popular</Badge>
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-2xl">Pro</CardTitle>
                {currentTier === 'pro' && <Badge variant="default">Current Plan</Badge>}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$29</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <CardDescription className="mt-2">
                + metered usage (pay as you go)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">Unlimited case analyses</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">Unlimited AI analyses</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">Unlimited email syncs</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">Unlimited lawyer outreach</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-medium">Unlimited document generation</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Pay only for what you use</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Volume discounts (up to 50% off)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Priority email support</span>
                </li>
              </ul>

              <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2 text-xs font-medium mb-2">
                  <TrendingUp className="h-3 w-3" />
                  <span>Metered Pricing</span>
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• First 1,000 units: $0.01/unit</li>
                  <li>• Next 9,000 units: $0.008/unit (20% off)</li>
                  <li>• 10,000+ units: $0.005/unit (50% off)</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={handleUpgrade}
                disabled={upgrading || currentTier === 'pro'}
              >
                {upgrading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : currentTier === 'pro' ? (
                  'Current Plan'
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Enterprise Tier */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Enterprise</CardTitle>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">Custom</span>
              </div>
              <CardDescription className="mt-2">
                For large organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Everything in Pro</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Custom pricing</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Dedicated account manager</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">SLA guarantees</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Custom integrations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">White-label options</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Phone & priority support</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" asChild>
                <a href="mailto:sales@laro.nl">
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Sales
                </a>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>How does metered billing work?</AccordionTrigger>
              <AccordionContent>
                With Pro tier, you pay a base fee of $29/month plus usage-based charges. Each
                billable operation (AI analysis, email sync, etc.) costs a small amount, starting
                at $0.01 per unit. The more you use, the cheaper it gets with volume discounts up
                to 50% off.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>What counts as a "unit" in metered billing?</AccordionTrigger>
              <AccordionContent>
                Each billable operation counts as units based on its actual cost multiplied by 2.5x
                for platform sustainability. For example: AI email analysis, AI document analysis,
                email syncs, lawyer outreach messages, and document generations each count as
                separate units.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>Can I switch between tiers?</AccordionTrigger>
              <AccordionContent>
                Yes! You can upgrade from Free to Pro at any time. If you're on Pro and want to
                downgrade, you can cancel your subscription and you'll be moved to Free tier at the
                end of your billing period.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>What happens when I hit the free tier limit?</AccordionTrigger>
              <AccordionContent>
                When you reach your monthly quota on the free tier, you'll see a prompt to upgrade
                to Pro. You won't be able to use the limited features until either you upgrade or
                your monthly quota resets at the start of the next month.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger>Is there a minimum commitment for Pro?</AccordionTrigger>
              <AccordionContent>
                No, Pro tier is month-to-month with no long-term commitment. You can cancel anytime
                and you'll retain access until the end of your billing period.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger>How do volume discounts work?</AccordionTrigger>
              <AccordionContent>
                Volume discounts are automatically applied as you use more resources. The first
                1,000 units cost $0.01 each, the next 9,000 units cost $0.008 each (20% discount),
                and anything above 10,000 units costs $0.005 each (50% discount). This happens
                automatically every month.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7">
              <AccordionTrigger>Can I see my usage before being charged?</AccordionTrigger>
              <AccordionContent>
                Yes! Pro users can view their current month's usage and estimated charges in the
                Billing Dashboard at any time. You'll also see an upcoming invoice estimate before
                each billing cycle.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8">
              <AccordionTrigger>What payment methods do you accept?</AccordionTrigger>
              <AccordionContent>
                We accept all major credit cards (Visa, Mastercard, American Express) through our
                secure payment processor Stripe. Enterprise customers can also arrange for invoice
                billing.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
