import React, { useState, useMemo } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Mail, FileText, MessageSquare, CheckCircle2, AlertCircle,
  Download, RefreshCw, Loader2, FolderOpen,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface EvidenceSummaryDashboardProps {
  caseId?: string;
}

const SOURCE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  gmail:          { icon: <Mail className="w-4 h-4" />,          color: "#EA4335", label: "Gmail" },
  outlook:        { icon: <Mail className="w-4 h-4" />,          color: "#0078D4", label: "Outlook" },
  slack:          { icon: <MessageSquare className="w-4 h-4" />, color: "#36C5F0", label: "Slack" },
  trello:         { icon: <CheckCircle2 className="w-4 h-4" />,  color: "#0052CC", label: "Trello" },
  "google-drive": { icon: <FileText className="w-4 h-4" />,      color: "#4285F4", label: "Google Drive" },
  onedrive:       { icon: <FileText className="w-4 h-4" />,      color: "#0078D4", label: "OneDrive" },
  telegram:       { icon: <MessageSquare className="w-4 h-4" />, color: "#0088cc", label: "Telegram" },
  manual:         { icon: <FileText className="w-4 h-4" />,      color: "#9CA3AF", label: "Manual Upload" },
  agent:          { icon: <FolderOpen className="w-4 h-4" />,    color: "#F97316", label: "Desktop Scan" },
};

export default function EvidenceSummaryDashboard({ caseId }: EvidenceSummaryDashboardProps) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  // ── Real tRPC queries ────────────────────────────────────────────────────
  const { data: filesData, isLoading: filesLoading, refetch: refetchFiles } =
    trpc.evidenceFiles.search.useQuery(
      { caseId: caseId ?? undefined },
      { enabled: true }
    );

  const { data: analyticsData, refetch: refetchAnalytics } =
    trpc.evidenceAnalytics.getStats.useQuery();

  const { data: uploadTimeline, refetch: refetchTimeline } =
    trpc.evidenceAnalytics.getUploadTimeline.useQuery(
      { days: 30 },
      { enabled: true }
    );

  const { data: sourceBreakdown, refetch: refetchSources } =
    trpc.evidenceAnalytics.getUploadSourceBreakdown.useQuery();

  const { data: fileTypeData, refetch: refetchTypes } =
    trpc.evidenceAnalytics.getFileTypeDistribution.useQuery();

  const isLoading = filesLoading;

  // ── Derived stats ─────────────────────────────────────────────────────────
  const files = (filesData as any[]) ?? [];
  const normalizeSource = (f: any) => {
    const raw = String(f.uploadSource ?? f.source ?? "manual").toLowerCase();
    if (raw.includes("agent") || raw.includes("scan")) return "agent";
    if (raw.includes("gmail")) return "gmail";
    if (raw.includes("outlook")) return "outlook";
    if (raw.includes("slack")) return "slack";
    if (raw.includes("drive")) return "google-drive";
    if (raw.includes("one")) return "onedrive";
    if (raw.includes("trello")) return "trello";
    return "manual";
  };

  const stats = useMemo(() => {
    const sourceStats: Record<string, number> = {};
    const typeStats: Record<string, number> = {};
    let totalRelevant = 0;
    let totalSizeBytes = 0;

    files.forEach((f: any) => {
      const src = normalizeSource(f);
      sourceStats[src] = (sourceStats[src] || 0) + 1;

      const ft = f.fileType ?? f.mimeType?.split("/")[0] ?? f.type ?? "other";
      typeStats[ft] = (typeStats[ft] || 0) + 1;

      if (f.relevant !== false) totalRelevant++;
      totalSizeBytes += parseInt(f.fileSize ?? "0") || 0;
    });

    // Always use filtered files count for selected case dashboard consistency.
    const totalFiles = files.length;
    const sizeLabel = totalSizeBytes > 1024 * 1024
      ? `${(totalSizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${(totalSizeBytes / 1024).toFixed(0)} KB`;

    return {
      total: totalFiles,
      relevant: totalRelevant,
      irrelevant: totalFiles - totalRelevant,
      totalSize: sizeLabel,
      sourceStats,
      typeStats,
      manualUploads: sourceStats.manual ?? 0,
      agentUploads: sourceStats.agent ?? 0,
    };
  }, [files, analyticsData]);

  // ── Chart data ────────────────────────────────────────────────────────────
  const sourceChartData = useMemo(() => {
    const breakdown = (sourceBreakdown as any[]) ?? [];
    if (breakdown.length > 0) {
      return breakdown.map((r: any) => ({
        name:  SOURCE_CONFIG[r.source]?.label ?? r.source,
        value: Number(r.count),
        fill:  SOURCE_CONFIG[r.source]?.color ?? "#9CA3AF",
      }));
    }
    return Object.entries(stats.sourceStats).map(([source, count]) => ({
      name:  SOURCE_CONFIG[source]?.label ?? source,
      value: count,
      fill:  SOURCE_CONFIG[source]?.color ?? "#9CA3AF",
    }));
  }, [sourceBreakdown, stats.sourceStats]);

  const typeChartData = useMemo(() => {
    const types = (fileTypeData as any[]) ?? [];
    if (types.length > 0) {
      return types.map((r: any) => ({ name: r.fileType ?? "Other", value: Number(r.count) }));
    }
    return Object.entries(stats.typeStats).map(([type, count]) => ({
      name:  type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
    }));
  }, [fileTypeData, stats.typeStats]);

  const timelineChartData = useMemo(() => {
    const tl = (uploadTimeline as any[]) ?? [];
    if (tl.length > 0) return tl.map((r: any) => ({ date: r.date, count: Number(r.count) }));
    return [];
  }, [uploadTimeline]);

  const relevanceData = [
    { name: "Relevant",     value: stats.relevant,   fill: "#10B981" },
    { name: "Not Relevant", value: stats.irrelevant,  fill: "#EF4444" },
  ];

  const filteredItems = useMemo(() => {
    if (!selectedSource) return files;
    return files.filter((f: any) => {
      const src = normalizeSource(f);
      return src === selectedSource;
    });
  }, [selectedSource, files]);

  // ── Refresh ────────────────────────────────────────────────────────────────
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchFiles(), refetchAnalytics(), refetchTimeline(), refetchSources(), refetchTypes()]);
      toast.success("Evidence data refreshed");
    } catch {
      toast.error("Failed to refresh");
    } finally {
      setIsRefreshing(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Evidence Summary</h2>
          <p className="text-muted-foreground mt-1">
            {caseId ? "Evidence for this case" : "All collected evidence across all cases"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <span className="ml-3 text-muted-foreground">Loading evidence...</span>
        </div>
      )}

      {/* KPI Cards */}
      {!isLoading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Evidence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">Items collected</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Relevant</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.relevant}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total > 0 ? ((stats.relevant / stats.total) * 100).toFixed(0) : 0}% of total
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Data Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{Object.keys(stats.sourceStats).length}</div>
                <p className="text-xs text-muted-foreground mt-1">Connected platforms</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Desktop Scans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.agentUploads}</div>
                <p className="text-xs text-muted-foreground mt-1">From local scanner</p>
              </CardContent>
            </Card>
          </div>

          {/* Empty state */}
          {stats.total === 0 && (
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="py-16 text-center">
                <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No evidence yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Upload files or scan your computer to start collecting evidence for this case.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Revamped case-focused analytics */}
          {stats.total > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card className="border-border/50 bg-card/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Evidence by Source</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={sourceChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#F97316" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Evidence by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={typeChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle className="text-lg">Collection Timeline (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  {timelineChartData.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      No timeline data yet
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={timelineChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#F97316"
                          strokeWidth={2}
                          dot={{ fill: "#F97316", r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Evidence Items</CardTitle>
                    {selectedSource && (
                      <Button variant="outline" size="sm" onClick={() => setSelectedSource(null)}>
                        Clear filter
                      </Button>
                    )}
                  </div>
                  <CardDescription>{filteredItems.length} items</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={selectedSource === null ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedSource(null)}
                    >
                      All
                    </Badge>
                    {Object.entries(stats.sourceStats).map(([source, count]) => (
                      <Badge
                        key={source}
                        variant={selectedSource === source ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedSource(source)}
                      >
                        {SOURCE_CONFIG[source]?.label ?? source} ({count})
                      </Badge>
                    ))}
                  </div>
                  {filteredItems.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No items found</p>
                  ) : (
                    <div className="space-y-2 max-h-[420px] overflow-y-auto">
                      {filteredItems.map((item: any) => {
                        const src = normalizeSource(item);
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 border border-border/50 rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {SOURCE_CONFIG[src]?.icon ?? <FileText className="w-4 h-4" />}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {item.fileName ?? item.title ?? item.name ?? "Untitled"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {SOURCE_CONFIG[src]?.label ?? src} • {new Date(item.uploadedAt ?? item.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {item.relevant !== false ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-600" />
                              )}
                              <Badge variant="outline" className="text-xs">
                                {item.fileType ?? item.mimeType?.split("/")[1] ?? "file"}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}