import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  HardDrive,
  Calendar,
  Timer,
  Database,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { format, formatDistanceToNow, formatDuration, intervalToDuration } from "date-fns";
import { useRoute, useLocation } from "wouter";

export default function AgentScanHistory() {
  const [match, params] = useRoute("/agent/:deviceId/scans");
  const [, setLocation] = useLocation();
  const deviceId = params?.deviceId || "";
  const [selectedScan, setSelectedScan] = useState<string | null>(null);

  // Fetch device details
  const { data: devices } = trpc.agent.listDevices.useQuery();
  const device = devices?.find((d) => d.id === deviceId);

  // Fetch scans for this device
  const { data: scans, isLoading } = trpc.agent.getDeviceScans.useQuery(
    { deviceId },
    { enabled: !!deviceId }
  );

  // Fetch files for selected scan
  const { data: scanFiles } = trpc.agent.getScanFiles.useQuery(
    { scanId: selectedScan! },
    { enabled: !!selectedScan }
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-500">
            <Clock className="w-3 h-3 mr-1 animate-pulse" />
            In Progress
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: string | number) => {
    const numBytes = typeof bytes === "string" ? parseInt(bytes) : bytes;
    if (numBytes < 1024) return `${numBytes} B`;
    if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(1)} KB`;
    if (numBytes < 1024 * 1024 * 1024) return `${(numBytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(numBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatScanDuration = (startedAt: Date | string, completedAt: Date | string | null) => {
    if (!completedAt) return "In progress...";

    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const duration = intervalToDuration({ start, end });

    if (duration.hours && duration.hours > 0) {
      return `${duration.hours}h ${duration.minutes || 0}m`;
    }
    if (duration.minutes && duration.minutes > 0) {
      return `${duration.minutes}m ${duration.seconds || 0}s`;
    }
    return `${duration.seconds || 0}s`;
  };

  const selectedScanData = scans?.find((s) => s.id === selectedScan);

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setLocation("/agent/status")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Devices
          </Button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Scan History
            </h1>
            {device && (
              <p className="text-muted-foreground mt-2 text-lg">
                {device.deviceName} • {device.platform}
              </p>
            )}
          </div>
        </div>

        {/* Empty State */}
        {!isLoading && (!scans || scans.length === 0) && (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <HardDrive className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Scans Yet</h3>
              <p className="text-muted-foreground">
                This device hasn't performed any evidence scans yet.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Scans Timeline */}
        {scans && scans.length > 0 && (
          <div className="space-y-4">
            {scans.map((scan, index) => (
              <Card
                key={scan.id}
                className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-orange-500/50 transition-colors relative"
              >
                {/* Timeline connector */}
                {index < scans.length - 1 && (
                  <div className="absolute left-8 top-full h-4 w-0.5 bg-border" />
                )}

                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <HardDrive className="w-4 h-4 text-orange-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          Scan #{scans.length - index}
                        </CardTitle>
                        <CardDescription>
                          {format(new Date(scan.startedAt), "MMMM d, yyyy 'at' h:mm a")}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(scan.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Scan Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Total Files
                      </p>
                      <p className="text-2xl font-bold">{scan.totalFiles || 0}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Uploaded
                      </p>
                      <p className="text-2xl font-bold text-green-500">{scan.uploadedFiles || 0}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        Failed
                      </p>
                      <p className="text-2xl font-bold text-destructive">{scan.failedFiles || 0}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Data Size
                      </p>
                      <p className="text-2xl font-bold">
                        {formatFileSize(scan.uploadedSizeBytes || "0")}
                      </p>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4" />
                      Duration: {formatScanDuration(scan.startedAt, scan.completedAt)}
                    </div>
                    {scan.caseId && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Linked to Case
                      </div>
                    )}
                    {scan.autoUpload && (
                      <Badge variant="outline" className="text-xs">
                        Auto-Upload Enabled
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedScan(scan.id)}
                    >
                      View Files ({scan.totalFiles || 0})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Scan Files Dialog */}
        <Dialog open={!!selectedScan} onOpenChange={() => setSelectedScan(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Scan Files</DialogTitle>
              <DialogDescription>
                Files discovered during this scan
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto space-y-2">
              {scanFiles && scanFiles.length > 0 ? (
                scanFiles.map((file) => (
                  <Card
                    key={file.id}
                    className="border-border/50 bg-card/50 backdrop-blur-sm"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.fileName}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.fileSize)} • {file.mimeType}
                          </p>
                        </div>
                        <div className="ml-4">
                          {file.uploadStatus === "completed" && (
                            <Badge className="bg-green-500">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Uploaded
                            </Badge>
                          )}
                          {file.uploadStatus === "failed" && (
                            <Badge variant="destructive">
                              <XCircle className="w-3 h-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                          {file.uploadStatus === "pending" && (
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No files found for this scan
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
