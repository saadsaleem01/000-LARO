import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  Mail, 
  Cloud, 
  MessageSquare, 
  Trello as TrelloIcon, 
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useContext } from "react";

// Get current user context (adjust based on your auth implementation)
const useCurrentUser = () => {
  const { data: user } = trpc.auth.me.useQuery();
  return user;
};

/**
 * Evidence Connections Card
 * Displays OAuth connection buttons and status for all evidence collection platforms
 */

interface PlatformConnection {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  connected: boolean;
  lastSync?: Date;
  itemCount?: number;
}

export default function EvidenceConnectionsCard() {
  // Get current user
  const currentUser = useCurrentUser();
  const utils = trpc.useUtils();
  
  // Query connection status for all platforms
  const { data: gmailStatus, isLoading: gmailLoading } = trpc.gmailEnhanced.getStatus.useQuery(undefined, { enabled: !!currentUser });
  const { data: outlookStatus, isLoading: outlookLoading } = trpc.outlookEnhanced.getStatus.useQuery(undefined, { enabled: !!currentUser });
  const { data: driveStatus, isLoading: driveLoading } = trpc.googleDrive.checkConnection.useQuery(undefined, { enabled: !!currentUser });
  const { data: oneDriveStatus, isLoading: oneDriveLoading } = trpc.oneDriveEnhanced.getStatus.useQuery(undefined, { enabled: !!currentUser });
  const { data: slackStatus, isLoading: slackLoading } = trpc.slackEnhanced.getStatus.useQuery(undefined, { enabled: !!currentUser });
  const { data: trelloStatus, isLoading: trelloLoading } = trpc.trelloEnhanced.getStatus.useQuery(undefined, { enabled: !!currentUser });
  const { data: telegramStatus, isLoading: telegramLoading } = trpc.telegramEnhanced.getStatus.useQuery(undefined, { enabled: !!currentUser });

  // OAuth URL mutations
  const gmailOAuthMutation = trpc.gmailEnhanced.getOAuthUrl.useMutation();
  const outlookOAuthMutation = trpc.outlookEnhanced.getOAuthUrl.useMutation();
  const driveOAuthMutation = trpc.googleDriveEnhanced.getOAuthUrl.useMutation();
  const oneDriveOAuthMutation = trpc.oneDriveEnhanced.getOAuthUrl.useMutation();
  const slackOAuthMutation = trpc.slackEnhanced.getOAuthUrl.useMutation();
  const trelloOAuthMutation = trpc.trelloEnhanced.getOAuthUrl.useMutation();

  // Disconnect mutations
  const gmailDisconnectMutation = trpc.gmailEnhanced.disconnect.useMutation();
  const outlookDisconnectMutation = trpc.outlookEnhanced.disconnect.useMutation();
  const driveDisconnectMutation = trpc.googleDriveEnhanced.disconnect.useMutation();
  const oneDriveDisconnectMutation = trpc.oneDriveEnhanced.disconnect.useMutation();
  const slackDisconnectMutation = trpc.slackEnhanced.disconnect.useMutation();
  const trelloDisconnectMutation = trpc.trelloEnhanced.disconnect.useMutation();

  const platforms: PlatformConnection[] = [
    {
      id: 'gmail',
      name: 'Gmail',
      icon: <Mail className="w-5 h-5" />,
      description: 'Connect your Gmail account to collect email evidence',
      color: 'bg-red-500',
      connected: gmailStatus?.connected || false,
      lastSync: gmailStatus?.lastSync ? new Date(gmailStatus.lastSync) : undefined,
      itemCount: gmailStatus?.itemCount,
    },    
    {
      id: 'google-drive',
      name: 'Google Drive',
      icon: <Cloud className="w-5 h-5" />,
      description: 'Connect Google Drive to collect document evidence',
      color: 'bg-yellow-500',
      connected: driveStatus?.connected || false,
      lastSync: undefined,
      itemCount: driveStatus?.accounts?.length || 0,
    },
  ];

  const handleConnect = async (platformId: string) => {
    if (!currentUser?.id) {
      toast.error('Please sign in to connect accounts');
      return;
    }

    try {
      let authUrl: string | undefined;

      // For Gmail and Google Drive, use the direct OAuth endpoint with userId
      if (platformId === 'gmail' || platformId === 'google-drive') {
        // Use the backend server URL (adjust if your backend is on a different port)
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        authUrl = `${backendUrl}/api/oauth/gmail/connect?userId=${currentUser.id}`;
        
        // Open OAuth in default system browser (handled by Electron setWindowOpenHandler)
        window.open(authUrl, '_blank');
        
        toast.info('Opening authorization window in your browser. Please complete the OAuth flow.');

        // Monitor connection status by polling
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes
        const checkConnection = setInterval(async () => {
          attempts++;
          try {
            if (platformId === 'gmail') {
              await utils.gmailEnhanced.getStatus.invalidate();
              const status = await utils.gmailEnhanced.getStatus.fetch();
              if (status?.connected) {
                clearInterval(checkConnection);
                toast.success('Gmail successfully connected!');
              }
            } else if (platformId === 'google-drive') {
              await utils.googleDrive.checkConnection.invalidate();
              const status = await utils.googleDrive.checkConnection.fetch();
              if (status?.connected) {
                clearInterval(checkConnection);
                toast.success('Google Drive successfully connected!');
              }
            }
          } catch(e) {
            // Ignore fetch errors during polling
          }
          if (attempts >= maxAttempts) {
            clearInterval(checkConnection);
          }
        }, 5000);
        return;
      }

      // For other platforms, use the enhanced routers
      switch (platformId) {
        case 'outlook':
          const outlookResult = await outlookOAuthMutation.mutateAsync();
          authUrl = outlookResult.authUrl;
          break;        
        default:
          toast.error('Unknown platform');
          return;
      }

      if (authUrl) {
        window.open(authUrl, '_blank');
        toast.info('Opening authorization window. Please complete the OAuth flow.');
      }
    } catch (error) {
      toast.error(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDisconnect = async (platformId: string) => {
    try {
      switch (platformId) {
        case 'gmail':
          await gmailDisconnectMutation.mutateAsync();
          break;        
        case 'google-drive':
          await driveDisconnectMutation.mutateAsync();
          break;        
        default:
          toast.error('Unknown platform');
          return;
      }

      toast.success(`Disconnected from ${platformId}`);
    } catch (error) {
      toast.error(`Failed to disconnect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const formatLastSync = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const isLoading = gmailLoading || outlookLoading || driveLoading || oneDriveLoading || slackLoading || trelloLoading || telegramLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Evidence Collection Sources</CardTitle>
        <CardDescription>
          Connect your accounts to automatically collect evidence from multiple platforms
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {platforms.map((platform) => (
              <div
                key={platform.id}
                className="border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${platform.color} text-white`}>
                      {platform.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{platform.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {platform.description}
                      </p>
                    </div>
                  </div>
                  {platform.connected ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="w-3 h-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                </div>

                {platform.connected && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Last Sync:</span>
                      <span className="font-medium">{formatLastSync(platform.lastSync)}</span>
                    </div>
                    {platform.itemCount !== undefined && (
                      <div className="flex justify-between">
                        <span>Items Collected:</span>
                        <span className="font-medium">{platform.itemCount}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {platform.connected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDisconnect(platform.id)}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleConnect(platform.id)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
