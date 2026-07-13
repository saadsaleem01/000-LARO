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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  HardDrive,
  Monitor,
  Apple,
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  RefreshCw,
  Download,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AgentStatus() {
  const [revokeDeviceId, setRevokeDeviceId] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  // Fetch user's registered devices
  const { data: devices, isLoading, refetch } = trpc.agent.listDevices.useQuery();

  // Revoke device mutation
  const revokeDevice = trpc.agent.revokeDevice.useMutation({
    onSuccess: () => {
      toast.success("Device revoked successfully");
      setRevokeDeviceId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to revoke device: ${error.message}`);
    },
  });

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "windows":
        return <Monitor className="w-5 h-5 text-blue-500" />;
      case "macos":
        return <Apple className="w-5 h-5 text-gray-500" />;
      case "linux":
        return <HardDrive className="w-5 h-5 text-orange-500" />;
      default:
        return <Smartphone className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case "inactive":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Inactive
          </Badge>
        );
      case "revoked":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Revoked
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleRevokeDevice = () => {
    if (revokeDeviceId) {
      revokeDevice.mutate({ deviceId: revokeDeviceId });
    }
  };

  const deviceToRevoke = devices?.find((d) => d.id === revokeDeviceId);

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Agent Devices
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Manage evidence collection agents connected to your account
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Download Agent CTA */}
        {(!devices || devices.length === 0) && !isLoading && (
          <Card className="border-orange-500/50 bg-gradient-to-br from-orange-500/10 to-orange-600/10">
            <CardContent className="p-8 text-center">
              <HardDrive className="w-16 h-16 mx-auto text-orange-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Devices Connected</h3>
              <p className="text-muted-foreground mb-6">
                Download and install the LARO Evidence Agent to automatically collect evidence from
                your devices
              </p>
              <Button
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                onClick={() => (window.location.href = "/agent")}
              >
                <Download className="w-5 h-5 mr-2" />
                Download Agent
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Devices Grid */}
        {devices && devices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device) => (
              <Card
                key={device.id}
                className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-orange-500/50 transition-colors"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getPlatformIcon(device.platform)}
                      <div>
                        <CardTitle className="text-lg">{device.deviceName}</CardTitle>
                        <CardDescription className="capitalize">
                          {device.platform} • v{device.agentVersion}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(device.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Last Seen */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Seen:</span>
                    <span className="font-medium">
                      {device.lastSeenAt
                        ? formatDistanceToNow(new Date(device.lastSeenAt), { addSuffix: true })
                        : "Never"}
                    </span>
                  </div>

                  {/* Registered */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Registered:</span>
                    <span className="font-medium">
                      {device.createdAt
                        ? formatDistanceToNow(new Date(device.createdAt), { addSuffix: true })
                        : "Unknown"}
                    </span>
                  </div>

                  {/* Token Expiry */}
                  {device.tokenExpiresAt && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Token Expires:</span>
                      <span className="font-medium">
                        {formatDistanceToNow(new Date(device.tokenExpiresAt), { addSuffix: true })}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setLocation(`/agent/${device.id}/scans`)}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      View Scans
                    </Button>
                    {device.status === "active" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => setRevokeDeviceId(device.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Revoke
                      </Button>
                    )}
                    {device.status === "revoked" && (
                      <Badge variant="outline" className="flex-1 justify-center">
                        Access Revoked
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Instructions */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">1. Download & Install</h4>
              <p className="text-sm text-muted-foreground">
                Download the LARO Evidence Agent for your operating system (Windows, macOS, or
                Linux) and install it on the device you want to scan.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">2. Authenticate</h4>
              <p className="text-sm text-muted-foreground">
                Launch the agent and sign in with your LARO account. The device will appear in this
                dashboard once authenticated.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">3. Configure & Scan</h4>
              <p className="text-sm text-muted-foreground">
                Select a case to link evidence to, choose folders to scan, and enable auto-upload if
                desired. The agent will discover and upload relevant files automatically.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">4. Manage Devices</h4>
              <p className="text-sm text-muted-foreground">
                Revoke access for any device at any time from this dashboard. Revoked devices will
                need to re-authenticate to continue uploading.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Revoke Confirmation Dialog */}
        <Dialog open={!!revokeDeviceId} onOpenChange={() => setRevokeDeviceId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revoke Device Access</DialogTitle>
              <DialogDescription>
                Are you sure you want to revoke access for this device? The agent will no longer be
                able to upload files until it re-authenticates.
              </DialogDescription>
            </DialogHeader>
            {deviceToRevoke && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {getPlatformIcon(deviceToRevoke.platform)}
                  <span className="font-semibold">{deviceToRevoke.deviceName}</span>
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  {deviceToRevoke.platform} • v{deviceToRevoke.agentVersion}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setRevokeDeviceId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRevokeDevice}
                disabled={revokeDevice.isPending}
              >
                {revokeDevice.isPending ? "Revoking..." : "Revoke Access"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
