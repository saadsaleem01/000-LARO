import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Mail, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import GmailFilteredSync from '@/components/GmailFilteredSync';

interface GmailSimpleProps {
  caseId: string;
}

export default function GmailSimple({ caseId }: GmailSimpleProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set());

  // Get Gmail status
  const { data: statusData, refetch: refetchStatus } = trpc.gmailEnhanced.getStatus.useQuery(
    { caseId },
    { enabled: !!caseId }
  );

  // Get OAuth URL
  const { mutate: getOAuthUrl } = trpc.gmailEnhanced.getOAuthUrl.useMutation({
    onSuccess: (data) => {
      if (data.authUrl) {
        // Open OAuth popup
        const popup = window.open(
          data.authUrl,
          'Gmail OAuth',
          'width=500,height=600,left=200,top=200'
        );

        // Check if popup was closed and user authorized
        const checkPopup = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkPopup);
            // Refresh status after OAuth completes
            setTimeout(() => refetchStatus(), 1000);
          }
        }, 500);
      }
    },
    onError: (error) => {
      toast.error(`Failed to get OAuth URL: ${error.message}`);
    },
  });

  // List threads
  const { data: threadsData, isLoading: isLoadingThreads } = trpc.gmailEnhanced.listThreads.useQuery(
    {
      caseId,
      accessToken: statusData?.connected ? 'stored-token' : '',
      query: '',
    },
    { enabled: statusData?.connected && !!caseId }
  );

  // Sync threads
  const { mutate: syncThreads } = trpc.gmailEnhanced.syncThreads.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Synced ${data.progress.totalMessages} messages and ${data.progress.totalAttachments} attachments`);
        refetchStatus();
      } else {
        toast.error(`Sync completed with errors: ${data.progress.errors.join(', ')}`);
      }
      setIsSyncing(false);
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
      setIsSyncing(false);
    },
  });

  // Disconnect Gmail
  const { mutate: disconnect } = trpc.gmailEnhanced.disconnect.useMutation({
    onSuccess: () => {
      toast.success('Gmail disconnected');
      setSelectedThreads(new Set());
      refetchStatus();
    },
    onError: (error) => {
      toast.error(`Failed to disconnect: ${error.message}`);
    },
  });

  const handleConnectOAuth = () => {
    getOAuthUrl({ caseId });
  };

  const handleSelectAll = () => {
    if (threadsData?.threads) {
      setSelectedThreads(new Set(threadsData.threads.map((t) => t.id)));
    }
  };

  const handleDeselectAll = () => {
    setSelectedThreads(new Set());
  };

  const handleToggleThread = (threadId: string) => {
    const newSelected = new Set(selectedThreads);
    if (newSelected.has(threadId)) {
      newSelected.delete(threadId);
    } else {
      newSelected.add(threadId);
    }
    setSelectedThreads(newSelected);
  };

  const handleSync = () => {
    if (selectedThreads.size === 0) {
      toast.error('Please select at least one thread to sync');
      return;
    }
    setIsSyncing(true);
    syncThreads({
      caseId,
      accessToken: 'stored-token',
      query: '',
    });
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect Gmail?')) {
      disconnect({ caseId });
    }
  };

  if (!statusData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Gmail</h3>
          </div>
          {statusData.connected && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Connected
              </span>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500">
          {statusData.connected
            ? 'Connected to your Gmail account. Select threads to sync.'
            : 'Connect your Gmail account to collect emails and attachments as evidence'}
        </p>
      </div>

      {/* Connection Status */}
      {statusData.connected && (
        <Card className="border-blue-200 bg-blue-50 p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-blue-900">
              Connected to: {statusData.email}
            </p>
            <p className="text-sm text-blue-800">
              {statusData.itemCount} items collected
            </p>
            {statusData.lastSyncedAt && (
              <p className="text-xs text-blue-700">
                Last synced: {new Date(statusData.lastSyncedAt).toLocaleString()}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Filtered Sync Section - Show when connected */}
      {statusData.connected && (
        <GmailFilteredSync
          caseId={caseId}
          accessToken="stored-token"
          onSyncComplete={() => refetchStatus()}
        />
      )}

      {/* Connection Buttons */}
      {!statusData.connected ? (
        <div className="flex gap-2">
          <Button
            onClick={handleConnectOAuth}
            disabled={isConnecting}
            className="flex items-center gap-2"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Connect with OAuth
              </>
            )}
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleDisconnect}
          variant="destructive"
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Disconnect
        </Button>
      )}

      {/* Threads List */}
      {statusData.connected && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Select Threads to Sync</h4>
            <div className="flex gap-2">
              <Button
                onClick={handleSelectAll}
                variant="outline"
                size="sm"
              >
                Select All
              </Button>
              <Button
                onClick={handleDeselectAll}
                variant="outline"
                size="sm"
              >
                Deselect All
              </Button>
            </div>
          </div>

          {isLoadingThreads ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : threadsData?.threads && threadsData.threads.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4">
              {threadsData.threads.map((thread) => (
                <label
                  key={thread.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedThreads.has(thread.id)}
                    onChange={() => handleToggleThread(thread.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{thread.snippet}</p>
                    <p className="text-xs text-gray-500 mt-1">ID: {thread.id}</p>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 text-gray-500">
              <AlertCircle className="h-5 w-5 mr-2" />
              No threads found
            </div>
          )}

          {/* Sync Button */}
          <Button
            onClick={handleSync}
            disabled={isSyncing || selectedThreads.size === 0}
            className="w-full flex items-center justify-center gap-2"
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing {selectedThreads.size} Thread{selectedThreads.size !== 1 ? 's' : ''}...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Sync {selectedThreads.size} Thread{selectedThreads.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      )}

      {/* How It Works */}
      <Card className="border-gray-200 p-4">
        <h4 className="font-medium mb-3">How Evidence Collection Works</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Connect your Gmail account securely via OAuth</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Automatically scan and extract content from all emails</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Download and extract attachments automatically</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Store files securely in LARO with full-text search</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Sync multiple times to capture new evidence</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>All evidence is organized by source and timestamp</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
