import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cloud, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

interface OneDriveSimpleProps {
  caseId?: string;
}

interface OneDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedDateTime?: string;
}

export default function OneDriveSimple({ caseId }: OneDriveSimpleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [files, setFiles] = useState<OneDriveFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  
  console.log('[OneDriveSimple] Rendered with caseId:', caseId);

  // Get OAuth URL
  const { data: oauthData, isLoading: isLoadingOAuth } = trpc.oneDriveEnhanced.getOAuthUrl.useQuery(
    { caseId: caseId || '' },
    {
      enabled: !!caseId,
    }
  );

  // Get connection status
  const { data: statusData } = trpc.oneDriveEnhanced.getStatus.useQuery(
    { caseId: caseId || '' },
    {
      enabled: !!caseId,
      refetchInterval: 2000,
    }
  );

  // List files
  const { data: filesData, isLoading: isLoadingFiles } = trpc.oneDriveEnhanced.listFiles.useQuery(
    { caseId: caseId || '' },
    {
      enabled: !!caseId && isConnected,
    }
  );

  // Start sync mutation
  const syncMutation = trpc.oneDriveEnhanced.startSync.useMutation({
    onSuccess: () => {
      toast.success('Files synced successfully!');
      setIsSyncing(false);
      setSelectedFiles(new Set());
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
      setIsSyncing(false);
    },
  });

  const handleConnect = async () => {
    if (!oauthData?.authUrl) {
      toast.error('Failed to get authorization URL');
      return;
    }

    setIsLoading(true);
    try {
      const popup = window.open(oauthData.authUrl, 'microsoft-oauth', 'width=500,height=600');
      
      if (!popup) {
        toast.error('Please allow popups to connect OneDrive');
        setIsLoading(false);
        return;
      }

      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          setIsLoading(false);
          setTimeout(() => {
            if (statusData?.connected) {
              setIsConnected(true);
              toast.success('OneDrive connected!');
            }
          }, 1000);
        }
      }, 500);
    } catch (error) {
      console.error('Error connecting OneDrive:', error);
      toast.error('Failed to connect OneDrive');
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!statusData?.status?.id) {
      toast.error('OneDrive not connected');
      return;
    }

    setIsSyncing(true);
    syncMutation.mutate({
      caseId: caseId || '',
      sourceId: statusData.status.id,
    });
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  if (!caseId) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <p className="text-yellow-800">Please select a case first</p>
        </CardContent>
      </Card>
    );
  }

  // Show connection status
  if (!isConnected && !statusData?.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            OneDrive Integration
          </CardTitle>
          <CardDescription>
            Connect your OneDrive to collect evidence files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click the button below to authorize access to your OneDrive. We'll scan all your files and folders to find relevant evidence.
          </p>
          <Button 
            className="w-full" 
            onClick={handleConnect}
            disabled={isLoading || isLoadingOAuth || !oauthData?.authUrl}
          >
            {isLoading || isLoadingOAuth ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect OneDrive'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show file listing after connection
  return (
    <div className="space-y-4">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            OneDrive Connected
          </CardTitle>
          <CardDescription>
            {statusData?.status?.itemsCollected || 0} items collected
            {statusData?.status?.lastSyncedAt && (
              <> • Last synced: {new Date(statusData.status.lastSyncedAt).toLocaleDateString()}</>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Files List Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Files</CardTitle>
              <CardDescription>
                {filesData?.files?.length || 0} files found in your OneDrive
              </CardDescription>
            </div>
            <Button 
              onClick={handleSync}
              disabled={isSyncing || isLoadingFiles}
              size="sm"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                'Sync Files'
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingFiles ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filesData?.files && filesData.files.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filesData.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedFiles.has(file.id)}
                    onCheckedChange={() => toggleFileSelection(file.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                      {file.modifiedDateTime && (
                        <> • {new Date(file.modifiedDateTime).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="w-4 h-4 mr-2" />
              No files found in your OneDrive
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            💡 <strong>Tip:</strong> Click "Sync Files" to automatically download and analyze all files from your OneDrive. We'll extract text content and identify relevant evidence for your case.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
