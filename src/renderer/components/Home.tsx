import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, UserCheck, FileText, MessageSquare, Activity, Quote } from "lucide-react";
import { StatCardSkeleton } from "@/components/SkeletonLoaders";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ChatWidget from "@/components/ChatWidget";

export default function Home() {
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: recentMatches } = trpc.dashboard.interestedMatches.useQuery();
  const { data: pendingClarifications } = trpc.clarifications.pending.useQuery();

  const statCards = [
    {
      title: "Active Cases",
      value: stats?.activeCases || 0,
      description: "Total matters in progress",
      icon: Briefcase,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      action: () => setLocation("/cases"),
    },
    {
      title: "Lawyer Connections",
      value: stats?.matchesMade || 0,
      description: "Professionals engaged",
      icon: UserCheck,
      iconBg: "bg-green-500/10",
      iconColor: "text-green-500",
    },
    {
      title: "Pending Actions",
      value: pendingClarifications?.length || 0,
      description: "Items needing your attention",
      icon: MessageSquare,
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-500",
    },
    {
      title: "Evidence Items",
      value: stats?.evidenceCollected || 0,
      description: "Total files collected",
      icon: FileText,
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-500",
    },
  ];

  const insightLine =
    "Aggregated metrics reflect all active cases. Use filters on the Cases page to drill into a single matter.";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-orange-500">Analytical Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Platform-wide metrics, live signals, and direct input to LARO
            </p>
          </div>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 transition-colors hover:bg-orange-500/20"
                  aria-label="Dashboard insight"
                >
                  <Quote className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs text-sm">
                {insightLine}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Three sections: Analytics | Real-time & actions | Input & control (chat) */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-stretch">
          <section className="space-y-4 xl:col-span-5">
            <h2 className="text-xl font-semibold text-foreground">Analytics &amp; Stats</h2>
            {statsLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <StatCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {statCards.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <Card
                      key={index}
                      className={`border border-border bg-card shadow-sm transition-shadow hover:shadow-md ${stat.action ? "cursor-pointer" : ""}`}
                      onClick={stat.action}
                    >
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                        <div className={`rounded-lg p-2 ${stat.iconBg}`}>
                          <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{stat.value}</div>
                        <p className="mt-2 text-xs text-muted-foreground">{stat.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-4 xl:col-span-4">
            <h2 className="text-xl font-semibold text-foreground">Real-time information &amp; actions</h2>
            <div className="flex flex-col gap-4">
              <Card className="border border-border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Recent activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {statsLoading ? (
                    <Skeleton className="h-24 w-full" />
                  ) : (
                    <div className="space-y-3">
                      {recentMatches && recentMatches.length > 0 ? (
                        recentMatches.map((match: any) => (
                          <div
                            key={match.id}
                            className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-3"
                          >
                            <div className="flex items-center gap-3">
                              <UserCheck className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-foreground">
                                New connection: {match.lawyerName} for Case {match.caseId}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {match.lastContact ? new Date(match.lastContact).toLocaleDateString() : "Recently"}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center text-sm text-muted-foreground">No recent activity detected.</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="h-5 w-5 text-orange-500" />
                    Pending actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(pendingClarifications?.length ?? 0) > 0 ? (
                    pendingClarifications!.slice(0, 5).map((item: any, idx: number) => (
                      <div key={item.id ?? idx} className="rounded-lg border border-border bg-secondary/20 p-3 text-sm">
                        {item.question ?? item.title ?? "Action needed"}
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-sm text-muted-foreground">No pending actions right now.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="flex min-h-0 flex-col space-y-3 xl:col-span-3">
            <h2 className="text-xl font-semibold text-foreground">Input &amp; control</h2>
            <p className="text-xs text-muted-foreground">Chat with LARO about your cases and clarifications.</p>
            <div className="min-h-[420px] flex-1">
              <ChatWidget embedded />
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
