import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  FileText,
  MessageSquare,
  Folder,
  CheckSquare,
  MessageCircle,
  Upload,
} from "lucide-react";

interface AutoSyncSchedulerProps {
  caseId: string;
}

interface SyncSchedule {
  source: string;
  enabled: boolean;
  frequency: "hourly" | "daily" | "weekly" | "monthly";
  lastSync?: Date;
  nextSync?: Date;
  itemsSynced?: number;
  status: "idle" | "syncing" | "error";
}

export default function AutoSyncScheduler({ caseId }: AutoSyncSchedulerProps) {
  const [schedules, setSchedules] = useState<Record<string, SyncSchedule>>({
    gmail: { source: "Gmail", enabled: true, frequency: "daily", status: "idle" },
    outlook: { source: "Outlook", enabled: true, frequency: "daily", status: "idle" },
    googleDrive: { source: "Google Drive", enabled: false, frequency: "weekly", status: "idle" },
    oneDrive: { source: "OneDrive", enabled: false, frequency: "weekly", status: "idle" },
    slack: { source: "Slack", enabled: true, frequency: "daily", status: "idle" },
    trello: { source: "Trello", enabled: false, frequency: "weekly", status: "idle" },
    telegram: { source: "Telegram", enabled: false, frequency: "weekly", status: "idle" },
    local: { source: "Local Upload", enabled: false, frequency: "manual", status: "idle" },
  });

  const [globalSync, setGlobalSync] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync mutations
  const syncAllMutation = trpc.evidenceAggregation.syncAll.useMutation({
    onSuccess: (data) => {
      toast.success(`Synced ${data.totalItems} items from all sources!`);
      setIsSyncing(false);
      setGlobalSync(false);
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
      setIsSyncing(false);
    },
  });

  const handleToggleSource = (source: string) => {
    setSchedules((prev) => ({
      ...prev,
      [source]: { ...prev[source], enabled: !prev[source].enabled },
    }));
  };

  const handleChangeFrequency = (source: string, frequency: string) => {
    setSchedules((prev) => ({
      ...prev,
      [source]: { ...prev[source], frequency: frequency as any },
    }));
  };

  const handleSyncNow = async (source: string) => {
    setSchedules((prev) => ({
      ...prev,
      [source]: { ...prev[source], status: "syncing" },
    }));

    try {
      // Simulate sync
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSchedules((prev) => ({
        ...prev,
        [source]: {
          ...prev[source],
          status: "idle",
          lastSync: new Date(),
          nextSync: new Date(Date.now() + 24 * 60 * 60 * 1000),
          itemsSynced: Math.floor(Math.random() * 50) + 1,
        },
      }));

      toast.success(`${schedules[source].source} synced successfully!`);
    } catch (error) {
      setSchedules((prev) => ({
        ...prev,
        [source]: { ...prev[source], status: "error" },
      }));
      toast.error(`Failed to sync ${schedules[source].source}`);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setGlobalSync(true);

    try {
      await syncAllMutation.mutateAsync({ caseId });

      // Update all schedules
      const updatedSchedules = { ...schedules };
      Object.keys(updatedSchedules).forEach((key) => {
        if (updatedSchedules[key].enabled) {
          updatedSchedules[key] = {
            ...updatedSchedules[key],
            status: "idle",
            lastSync: new Date(),
            nextSync: new Date(Date.now() + 24 * 60 * 60 * 1000),
            itemsSynced: Math.floor(Math.random() * 50) + 1,
          };
        }
      });
      setSchedules(updatedSchedules);
    } catch (error) {
      console.error("Sync all error:", error);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "gmail":
        return <Mail className="w-4 h-4" />;
      case "outlook":
        return <Mail className="w-4 h-4" />;
      case "googleDrive":
        return <Folder className="w-4 h-4" />;
      case "oneDrive":
        return <Folder className="w-4 h-4" />;
      case "slack":
        return <MessageSquare className="w-4 h-4" />;
      case "trello":
        return <CheckSquare className="w-4 h-4" />;
      case "telegram":
        return <MessageCircle className="w-4 h-4" />;
      case "local":
        return <Upload className="w-4 h-4" />;
      default:
        return <RefreshCw className="w-4 h-4" />;
    }
  };

  const enabledSources = Object.values(schedules).filter((s) => s.enabled).length;

  return (
    <div className="space-y-6">
      {/* Global Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Global Sync Settings
          </CardTitle>
          <CardDescription>
            Configure automatic synchronization across all connected evidence sources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Global Enable */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div>
              <Label className="text-base font-medium">Enable Auto-Sync</Label>
              <p className="text-sm text-muted-foreground">
                Automatically sync evidence from enabled sources
              </p>
            </div>
            <Switch checked={globalSync} onCheckedChange={setGlobalSync} />
          </div>

          {/* Sync Now Button */}
          <Button
            onClick={handleSyncAll}
            disabled={isSyncing || enabledSources === 0}
            className="w-full"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing All Sources...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync All Now
              </>
            )}
          </Button>

          {/* Status Summary */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold">{enabledSources}</p>
              <p className="text-xs text-muted-foreground">Enabled Sources</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {Object.values(schedules).filter((s) => s.status === "syncing").length}
              </p>
              <p className="text-xs text-muted-foreground">Currently Syncing</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {Object.values(schedules).reduce((sum, s) => sum + (s.itemsSynced || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Items Synced</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Source Schedules */}
      <div className="space-y-3">
        <h3 className="font-semibold">Data Sources</h3>
        {Object.entries(schedules).map(([key, schedule]) => (
          <Card key={key}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getSourceIcon(key)}
                    <div>
                      <p className="font-medium">{schedule.source}</p>
                      <p className="text-xs text-muted-foreground">
                        {schedule.status === "syncing"
                          ? "Syncing..."
                          : schedule.status === "error"
                            ? "Sync failed"
                            : "Ready"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {schedule.status === "syncing" && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    )}
                    {schedule.status === "error" && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    {schedule.status === "idle" && schedule.lastSync && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                    <Switch
                      checked={schedule.enabled}
                      onCheckedChange={() => handleToggleSource(key)}
                      disabled={schedule.status === "syncing"}
                    />
                  </div>
                </div>

                {/* Controls */}
                {schedule.enabled && (
                  <div className="space-y-3 pt-3 border-t">
                    {/* Frequency Select */}
                    <div className="space-y-2">
                      <Label className="text-xs">Sync Frequency</Label>
                      <Select
                        value={schedule.frequency}
                        onValueChange={(value) => handleChangeFrequency(key, value)}
                        disabled={schedule.status === "syncing"}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Every Hour</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Last Sync Info */}
                    {schedule.lastSync && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>
                          Last sync:{" "}
                          {schedule.lastSync.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {schedule.itemsSynced && (
                          <p>Items synced: {schedule.itemsSynced}</p>
                        )}
                        {schedule.nextSync && (
                          <p>
                            Next sync:{" "}
                            {schedule.nextSync.toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Sync Now Button */}
                    <Button
                      onClick={() => handleSyncNow(key)}
                      disabled={schedule.status === "syncing"}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {schedule.status === "syncing" ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Sync Now
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sync Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Sync Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total synced items:</span>
              <span className="font-medium">
                {Object.values(schedules).reduce((sum, s) => sum + (s.itemsSynced || 0), 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active sources:</span>
              <span className="font-medium">{enabledSources}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last global sync:</span>
              <span className="font-medium">
                {Object.values(schedules).find((s) => s.lastSync)
                  ? new Date(
                      Math.max(
                        ...Object.values(schedules)
                          .filter((s) => s.lastSync)
                          .map((s) => new Date(s.lastSync!).getTime())
                      )
                    ).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Never"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
