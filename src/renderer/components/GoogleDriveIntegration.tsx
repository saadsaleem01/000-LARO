import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/_core/hooks/useAuth';
import { Loader2, CheckCircle2, AlertCircle, Trash2, RefreshCw, FolderOpen } from 'lucide-react';

interface GoogleDriveIntegrationProps {
  caseId?: string;
}

export default function GoogleDriveIntegration({ caseId }: GoogleDriveIntegrationProps) {
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!caseId) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          Please select a case first to connect Google Drive
        </AlertDescription>
      </Alert>
    );
  }

  // Get Google Drive status
  const { data: statusData, refetch: refetchStatus, isLoading: statusLoading } = trpc.googleDrive.getStatus.useQuery(
    { caseId },
    { enabled: !!caseId }
  );

  // Connect Google Drive mutation
  const connectMutation = trpc.googleDrive.connect.useMutation({
    onSuccess: () => {
      setError(null);
      refetchStatus();
    },
    onError: (error) => {
      setError(`Connection failed: ${error.message}`);
    },
  });

  // Start sync mutation
  const syncMutation = trpc.googleDrive.startSync.useMutation({
    onSuccess: (data) => {
      setSyncProgress(data.progress);
      setIsSyncing(false);
      setError(null);
      refetchStatus();
    },
    onError: (error) => {
      setError(`Sync failed: ${error.message}`);
      setIsSyncing(false);
    },
  });

  // Disconnect mutation
  const disconnectMutation = trpc.googleDrive.disconnect.useMutation({
    onSuccess: () => {
      refetchStatus();
      setSyncProgress(null);
      setError(null);
    },
    onError: (error) => {
      setError(`Disconnection failed: ${error.message}`);
    },
  });

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      // Redirect to Google OAuth consent screen
      const redirectUri = `${window.location.origin}/api/oauth/google-drive-callback`;
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
      
      if (!clientId) {
        throw new Error('Google Client ID not configured');
      }

      const scope = [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ].join(' ');

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope,
        access_type: 'offline',
        prompt: 'consent',
        state: JSON.stringify({ caseId }),
      });

      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnecting(false);
    }
  };

  const handleStartSync = async () => {
    if (!statusData?.status?.id) {
      setError('Google Drive not connected');
      return;
    }

    setIsSyncing(true);
    setError(null);
    await syncMutation.mutateAsync({
      caseId,
      sourceId: statusData.status.id,
    });
  };

  const handleDisconnect = async () => {
    if (!statusData?.status?.id) {
      setError('Google Drive not connected');
      return;
    }

    if (confirm('Are you sure you want to disconnect Google Drive? This will not delete your files.')) {
      await disconnectMutation.mutateAsync({
        caseId,
        sourceId: statusData.status.id,
      });
    }
  };

  const isConnected = statusData?.connected;
  const status = statusData?.status;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Google Drive Integration
          </CardTitle>
          <CardDescription>
            Connect your Google Drive to automatically collect evidence files from all folders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Connection Status */}
          {statusLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading status...</span>
            </div>
          ) : isConnected ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Google Drive is connected and ready to sync
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Google Drive is not connected. Click the button below to connect.
              </AlertDescription>
            </Alert>
          )}

          {/* Sync Status */}
          {status && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-lg font-semibold capitalize">{status.status}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Files Collected</p>
                  <p className="text-lg font-semibold">{status.itemsCollected || '0'}</p>
                </div>
              </div>

              {status.lastSyncedAt && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Last Synced</p>
                  <p className="text-sm">
                    {new Date(status.lastSyncedAt).toLocaleString()}
                  </p>
                </div>
              )}

              {(status as any).errorMessage && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {(status as any).errorMessage}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Sync Progress */}
          {syncProgress && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-900">Sync Progress</p>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Files</span>
                    <span>{syncProgress.totalFiles}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Processed</span>
                    <span>{syncProgress.processedFiles}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Extracted Content</span>
                    <span>{syncProgress.extractedContent}</span>
                  </div>
                  {syncProgress.errors && syncProgress.errors.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                      <p className="text-xs font-semibold text-red-900 mb-2">
                        Errors ({syncProgress.errors.length})
                      </p>
                      <ul className="text-xs text-red-800 space-y-1">
                        {syncProgress.errors.slice(0, 5).map((err: string, idx: number) => (
                          <li key={idx}>• {err}</li>
                        ))}
                        {syncProgress.errors.length > 5 && (
                          <li>... and {syncProgress.errors.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {!isConnected ? (
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex-1"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect Google Drive'
                )}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleStartSync}
                  disabled={isSyncing || status?.status === 'Collecting'}
                  className="flex-1"
                >
                  {isSyncing || status?.status === 'Collecting' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Now
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDisconnect}
                  variant="destructive"
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </>
            )}
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-2">How it works:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Scans all files in your Google Drive recursively</li>
              <li>✓ Extracts text from PDFs, Word docs, Excel sheets, and images</li>
              <li>✓ Stores files securely in LARO</li>
              <li>✓ Can be synced multiple times to get new files</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
