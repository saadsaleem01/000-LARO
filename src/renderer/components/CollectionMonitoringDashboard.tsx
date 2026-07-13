import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Clock, CheckCircle2, XCircle, AlertCircle, Mail, FileText, Tag } from "lucide-react";

interface CollectionMonitoringDashboardProps {
  caseId: string;
}

function formatDuration(seconds?: string) {
  if (!seconds) return "N/A";
  const s = Number.parseInt(seconds, 10);
  if (Number.isNaN(s)) return "N/A";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function formatDate(date?: Date | string) {
  if (!date) return "N/A";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "running":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    default:
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  }
}

function getStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    completed: "default",
    failed: "destructive",
    running: "secondary",
    pending: "outline",
  };
  return (
    <Badge variant={variants[status] || "outline"} className="capitalize">
      {status}
    </Badge>
  );
}

export function CollectionMonitoringDashboard({ caseId }: CollectionMonitoringDashboardProps) {
  const { data: logsData, isLoading: isLoadingLogs } = trpc.autoCollection.getLogs.useQuery(
    { caseId, limit: 20 },
    { enabled: !!caseId, refetchInterval: 10000 }
  );

  const { data: matchesData, isLoading: isLoadingMatches } = trpc.autoCollection.getKeywordMatches.useQuery(
    { caseId },
    { enabled: !!caseId }
  );

  const logs = logsData?.logs || [];
  const matches = matchesData?.matches || [];

  const toSafeInt = (value: unknown): number => {
    const num = Number.parseInt(String(value ?? "0"), 10);
    return Number.isNaN(num) ? 0 : num;
  };

  const toSafeStatus = (value: unknown): string => {
    if (typeof value !== "string" || value.trim() === "") return "pending";
    return value;
  };

  const parseObject = (value: unknown): Record<string, unknown> => {
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
    if (typeof value !== "string" || value.trim() === "") return {};
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  };

  const normalizedLogs = logs.map((log: any) => {
    const meta = parseObject(log.metadata);
    return {
      id: log.id,
      status: toSafeStatus(log.status ?? log.level ?? meta.status),
      runStartedAt: (log.runStartedAt ?? log.createdAt ?? meta.runStartedAt) as Date | string | undefined,
      emailsProcessed: toSafeInt(log.emailsProcessed ?? meta.emailsProcessed),
      filesDownloaded: toSafeInt(log.filesDownloaded ?? meta.filesDownloaded),
      executionTimeSeconds: String(log.executionTimeSeconds ?? meta.executionTimeSeconds ?? ""),
      errorMessage: (log.errorMessage ?? log.message ?? meta.errorMessage ?? "") as string,
    };
  });

  const normalizedMatches = matches.map((match: any) => {
    const meta = parseObject(match.metadata);
    return {
      id: match.id,
      itemType: String(match.itemType ?? meta.itemType ?? match.source ?? "item"),
      matchCount: toSafeInt(match.matchCount ?? meta.matchCount ?? 1),
      matchedKeywords:
        match.matchedKeywords ?? meta.matchedKeywords ?? (match.keyword ? JSON.stringify([match.keyword]) : "[]"),
    };
  });

  const safeParseStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value !== "string" || value.trim() === "") return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  };

  // Calculate summary stats
  const totalRuns = normalizedLogs.length;
  const successfulRuns = normalizedLogs.filter((l) => toSafeStatus(l.status) === "completed").length;
  const totalEmailsCollected = normalizedLogs.reduce((sum, l) => sum + toSafeInt(l.emailsProcessed), 0);
  const totalFilesCollected = normalizedLogs.reduce((sum, l) => sum + toSafeInt(l.filesDownloaded), 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRuns}</p>
                <p className="text-xs text-muted-foreground">Total Runs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{successfulRuns}</p>
                <p className="text-xs text-muted-foreground">Successful</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Mail className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEmailsCollected}</p>
                <p className="text-xs text-muted-foreground">Emails Collected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <FileText className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalFilesCollected}</p>
                <p className="text-xs text-muted-foreground">Files Downloaded</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Collection Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Collection History</CardTitle>
            <CardDescription>Recent auto-collection runs for this case</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLogs ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : normalizedLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No collection runs yet. Configure keywords and run your first collection.
              </p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {normalizedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(toSafeStatus(log.status))}
                          <span className="text-sm font-medium">
                            {formatDate(log.runStartedAt)}
                          </span>
                        </div>
                        {getStatusBadge(toSafeStatus(log.status))}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">{toSafeInt(log.emailsProcessed)}</span> emails
                        </div>
                        <div>
                          <span className="font-medium">{toSafeInt(log.filesDownloaded)}</span> files
                        </div>
                        <div>
                          <span className="font-medium">{formatDuration(log.executionTimeSeconds)}</span>
                        </div>
                      </div>
                      {log.errorMessage && (
                        <p className="text-xs text-destructive truncate">
                          {log.errorMessage}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Keyword Matches */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Keyword Matches
            </CardTitle>
            <CardDescription>Items matched by your search keywords</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMatches ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : normalizedMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No keyword matches found yet.
              </p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {normalizedMatches.map((match) => {
                    const matchedKeywords = safeParseStringArray(match.matchedKeywords);
                    return (
                      <div
                        key={match.id}
                        className="p-3 border rounded-lg space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          {match.itemType === "email" ? (
                            <Mail className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-purple-500" />
                          )}
                          <Badge variant="outline" className="capitalize text-xs">
                            {match.itemType}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {match.matchCount} match(es)
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {matchedKeywords.map((kw: string) => (
                            <Badge key={kw} variant="secondary" className="text-xs">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CollectionMonitoringDashboard;
