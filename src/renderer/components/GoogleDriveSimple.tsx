import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, Loader2, FileText, File, Folder, CheckCircle2, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

interface GoogleDriveSimpleProps {
  caseId?: string;
}

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
}

export default function GoogleDriveSimple({ caseId }: GoogleDriveSimpleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  
  console.log('[GoogleDriveSimple] Rendered with caseId:', caseId);

  // Get OAuth URL
  const { data: oauthData, isLoading: isLoadingOAuth } = trpc.googleDriveEnhanced.getOAuthUrl.useQuery(
    { caseId: caseId || '' },
    {
      enabled: !!caseId,
    }
  );

  // Get connection status
  const { data: statusData } = trpc.googleDriveEnhanced.getStatus.useQuery(
    { caseId: caseId || '' },
    {
      enabled: !!caseId,
      refetchInterval: 2000, // Poll every 2 seconds
    }
  );

  // List files
  const { data: filesData, isLoading: isLoadingFiles } = trpc.googleDriveEnhanced.listFiles.useQuery(
    { caseId: caseId || '' },
    {
      enabled: !!caseId && isConnected,
    }
  );

  // Start sync mutation
  const syncMutation = trpc.googleDriveEnhanced.startSync.useMutation({
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
      // Open OAuth popup
      const popup = window.open(oauthData.authUrl, 'google-oauth', 'width=500,height=600');
      
      if (!popup) {
        toast.error('Please allow popups to connect Google Drive');
        setIsLoading(false);
        return;
      }

      // Wait for popup to close
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          setIsLoading(false);
          // Check if connection was successful
          setTimeout(() => {
            if (statusData?.connected) {
              setIsConnected(true);
              toast.success('Google Drive connected!');
            }
          }, 1000);
        }
      }, 500);
    } catch (error) {
      console.error('Error connecting Google Drive:', error);
      toast.error('Failed to connect Google Drive');
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!statusData?.status?.id) {
      toast.error('Google Drive not connected');
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

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('folder')) return <Folder className="w-4 h-4" />;
    if (mimeType.includes('pdf')) return <FileText className="w-4 h-4" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="w-4 h-4" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '-';
    const size = parseInt(bytes);
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
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
            <FolderOpen className="w-5 h-5" />
            Google Drive Integration
          </CardTitle>
          <CardDescription>
            Connect your Google Drive to collect evidence files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click the button below to authorize access to your Google Drive. We'll scan all your files and folders to find relevant evidence.
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
              'Connect Google Drive'
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
            Google Drive Connected
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
                {filesData?.files?.length || 0} files found in your Google Drive
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
                  <div className="flex-shrink-0">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                      {file.modifiedTime && (
                        <> • {new Date(file.modifiedTime).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="w-4 h-4 mr-2" />
              No files found in your Google Drive
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            💡 <strong>Tip:</strong> Click "Sync Files" to automatically download and analyze all files from your Google Drive. We'll extract text content and identify relevant evidence for your case.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
