import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Play, Square, RefreshCw, Settings, TrendingUp, Database, Clock } from "lucide-react";
import { toast } from "sonner";

/**
 * Data Enrichment Admin Page
 * 
 * Monitors and controls the autonomous enrichment engine that keeps
 * the lawyer database up-to-date by automatically filling missing information.
 */
export default function DataEnrichment() {
  const [isTriggering, setIsTriggering] = useState(false);

  // Fetch enrichment statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.enrichment.getStats.useQuery();

  // Fetch scheduler status
  const { data: schedulerStatus, isLoading: schedulerLoading, refetch: refetchScheduler } = trpc.enrichment.scheduler.getStatus.useQuery();

  // Mutations
  const startScheduler = trpc.enrichment.scheduler.start.useMutation({
    onSuccess: () => {
      toast.success("Autonomous enrichment scheduler started");
      refetchScheduler();
    },
    onError: (error) => {
      toast.error(`Failed to start scheduler: ${error.message}`);
    },
  });

  const stopScheduler = trpc.enrichment.scheduler.stop.useMutation({
    onSuccess: () => {
      toast.success("Autonomous enrichment scheduler stopped");
      refetchScheduler();
    },
    onError: (error) => {
      toast.error(`Failed to stop scheduler: ${error.message}`);
    },
  });

  const triggerManual = trpc.enrichment.scheduler.triggerManual.useMutation({
    onSuccess: (result) => {
      toast.success(`Enrichment completed: ${result.result.lawyersUpdated} lawyers updated`);
      refetchStats();
      refetchScheduler();
      setIsTriggering(false);
    },
    onError: (error) => {
      toast.error(`Enrichment failed: ${error.message}`);
      setIsTriggering(false);
    },
  });

  const handleTriggerManual = () => {
    setIsTriggering(true);
    triggerManual.mutate({
      maxLawyersPerRun: 10, // Test with 10 lawyers
      maxCostPerRun: 1, // Max $1 for testing
    });
  };

  if (statsLoading || schedulerLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Data Enrichment</h1>
        <p className="text-muted-foreground mt-2">
          Autonomous system that keeps lawyer database up-to-date by automatically filling missing information
        </p>
      </div>

      {/* Scheduler Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Autonomous Scheduler</CardTitle>
              <CardDescription>
                Runs daily at {schedulerStatus?.config.schedule || "2:00 AM"} to enrich lawyer data
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {schedulerStatus?.isRunning ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">Stopped</Badge>
              )}
              {schedulerStatus?.isEnrichmentInProgress && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Running
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Configuration Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Max Lawyers/Run</p>
              <p className="text-2xl font-bold">{schedulerStatus?.config.maxLawyersPerRun || 500}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Budget/Run</p>
              <p className="text-2xl font-bold">${schedulerStatus?.config.maxCostPerRun?.toFixed(2) || "5.00"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Staleness Threshold</p>
              <p className="text-2xl font-bold">{schedulerStatus?.config.stalenessThresholdDays || 30}d</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Skip Recent</p>
              <p className="text-2xl font-bold">{schedulerStatus?.config.skipRecentlyEnrichedDays || 7}d</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {schedulerStatus?.isRunning ? (
              <Button
                onClick={() => stopScheduler.mutate()}
                disabled={stopScheduler.isPending}
                variant="outline"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Scheduler
              </Button>
            ) : (
              <Button
                onClick={() => startScheduler.mutate()}
                disabled={startScheduler.isPending}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Scheduler
              </Button>
            )}

            <Button
              onClick={handleTriggerManual}
              disabled={isTriggering || schedulerStatus?.isEnrichmentInProgress}
              variant="secondary"
            >
              {isTriggering ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Trigger Manual Run
                </>
              )}
            </Button>

            <Button variant="outline" disabled>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Completeness Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Completeness
          </CardTitle>
          <CardDescription>
            Current state of lawyer database ({stats?.total.toLocaleString()} total lawyers)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Completeness</span>
              <span className="text-2xl font-bold">{stats?.completeness.overall}%</span>
            </div>
            <Progress value={stats?.completeness.overall || 0} className="h-3" />
          </div>

          {/* Field-by-Field Progress */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Field Completeness</h4>
            
            <div className="space-y-3">
              {/* Email */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Email</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {stats?.missing.email.toLocaleString()} missing
                    </span>
                    <span className="text-sm font-medium">{stats?.completeness.email}%</span>
                  </div>
                </div>
                <Progress value={stats?.completeness.email || 0} />
              </div>

              {/* Phone */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Phone</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {stats?.missing.phone.toLocaleString()} missing
                    </span>
                    <span className="text-sm font-medium">{stats?.completeness.phone}%</span>
                  </div>
                </div>
                <Progress value={stats?.completeness.phone || 0} />
              </div>

              {/* Website */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Website</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {stats?.missing.website.toLocaleString()} missing
                    </span>
                    <span className="text-sm font-medium">{stats?.completeness.website}%</span>
                  </div>
                </div>
                <Progress value={stats?.completeness.website || 0} />
              </div>

              {/* Legal Areas */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Legal Areas</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {stats?.missing.legalAreas.toLocaleString()} missing
                    </span>
                    <span className="text-sm font-medium">{stats?.completeness.legalAreas}%</span>
                  </div>
                </div>
                <Progress value={stats?.completeness.legalAreas || 0} />
              </div>

              {/* Firm Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Firm Name</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {stats?.missing.firmName.toLocaleString()} missing
                    </span>
                    <span className="text-sm font-medium">{stats?.completeness.firmName}%</span>
                  </div>
                </div>
                <Progress value={stats?.completeness.firmName || 0} />
              </div>
            </div>
          </div>

          {/* Enrichment Queue */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Lawyers Needing Enrichment</p>
                <p className="text-xs text-muted-foreground">
                  Lawyers with missing or stale data
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats?.needsEnrichment.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.total ? Math.round((stats.needsEnrichment / stats.total) * 100) : 0}% of total
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Optimization Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Cost Optimization
          </CardTitle>
          <CardDescription>
            Autonomous enrichment uses the most cost-effective LLM providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Primary Provider</p>
              <p className="text-lg font-semibold">DeepSeek V3.2</p>
              <p className="text-xs text-muted-foreground">$0.28 per 1M tokens</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Estimated Cost</p>
              <p className="text-lg font-semibold">$23/month</p>
              <p className="text-xs text-muted-foreground">For 1000 enrichments/day</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Savings vs Claude</p>
              <p className="text-lg font-semibold text-green-600">$382/month</p>
              <p className="text-xs text-muted-foreground">94% cost reduction</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                1
              </div>
              <div>
                <p className="font-medium">Automatic Scheduling</p>
                <p className="text-muted-foreground">
                  Runs daily at 2:00 AM to enrich up to 500 lawyers per run
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                2
              </div>
              <div>
                <p className="font-medium">Intelligent Prioritization</p>
                <p className="text-muted-foreground">
                  Prioritizes lawyers based on usage frequency, data staleness, and missing critical fields
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                3
              </div>
              <div>
                <p className="font-medium">Google Scraping + LLM Extraction</p>
                <p className="text-muted-foreground">
                  Searches Google for lawyer information, scrapes websites, and uses AI to extract structured data
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                4
              </div>
              <div>
                <p className="font-medium">Incremental Updates</p>
                <p className="text-muted-foreground">
                  Only updates missing or stale data, skips recently enriched lawyers (&lt;7 days)
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                5
              </div>
              <div>
                <p className="font-medium">Cost Controls</p>
                <p className="text-muted-foreground">
                  Stops automatically if budget ($5/run) is exceeded, uses cheapest LLM providers
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
