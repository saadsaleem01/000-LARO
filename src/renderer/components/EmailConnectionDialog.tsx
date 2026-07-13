import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface EmailConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId?: string; // Optional: link to specific case
}

export function EmailConnectionDialog({ open, onOpenChange, caseId }: EmailConnectionDialogProps) {
  const [connecting, setConnecting] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'gmail' | 'outlook' | null>(null);

  // Query connected accounts
  const { data: accounts, isLoading, refetch } = trpc.emailAccounts.list.useQuery(undefined, {
    enabled: open,
  });

  // Mutations
  const getAuthUrl = trpc.emailAccounts.getAuthUrl.useMutation();
  const disconnect = trpc.emailAccounts.disconnect.useMutation();
  const refreshToken = trpc.emailAccounts.refreshToken.useMutation();

  const handleConnect = async (provider: 'gmail' | 'outlook') => {
    setConnecting(true);
    setSelectedProvider(provider);

    try {
      const result = await getAuthUrl.mutateAsync({ provider, caseId });
      
      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        result.authUrl,
        'OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Poll for popup close
      const pollTimer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollTimer);
          setConnecting(false);
          setSelectedProvider(null);
          refetch(); // Refresh account list
          toast.success(`${provider === 'gmail' ? 'Gmail' : 'Outlook'} account connected successfully!`);
        }
      }, 500);

    } catch (error: any) {
      console.error('Error connecting account:', error);
      toast.error(`Failed to connect ${provider}: ${error.message}`);
      setConnecting(false);
      setSelectedProvider(null);
    }
  };

  const handleDisconnect = async (accountId: string, email: string) => {
    try {
      await disconnect.mutateAsync({ accountId });
      toast.success(`Disconnected ${email}`);
      refetch();
    } catch (error: any) {
      console.error('Error disconnecting account:', error);
      toast.error(`Failed to disconnect: ${error.message}`);
    }
  };

  const handleRefresh = async (accountId: string, email: string) => {
    try {
      await refreshToken.mutateAsync({ accountId });
      toast.success(`Refreshed token for ${email}`);
      refetch();
    } catch (error: any) {
      console.error('Error refreshing token:', error);
      toast.error(`Failed to refresh: ${error.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect Email Accounts</DialogTitle>
          <DialogDescription>
            Connect your Gmail or Outlook account to automatically collect evidence from emails.
            We only access emails you explicitly sync - your privacy is protected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Connected Accounts */}
          {accounts && accounts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Connected Accounts</h3>
              {accounts.map((account) => (
                <Card key={account.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-base">{account.email}</CardTitle>
                          <CardDescription className="text-xs">
                            {account.provider === 'gmail' ? 'Gmail' : 'Outlook'}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={account.status === 'connected' ? 'default' : 'destructive'}>
                        {account.status === 'connected' ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" /> Disconnected</>
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Last synced: {account.lastSyncedAt 
                          ? new Date(account.lastSyncedAt).toLocaleString()
                          : 'Never'}
                      </span>
                      <span>
                        Connected: {new Date(account.connectedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRefresh(account.id, account.email)}
                        disabled={refreshToken.isPending}
                      >
                        {refreshToken.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        Refresh
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDisconnect(account.id, account.email)}
                        disabled={disconnect.isPending}
                      >
                        {disconnect.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        Disconnect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Connect New Account */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Connect New Account</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Gmail */}
              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => !connecting && handleConnect('gmail')}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Gmail</CardTitle>
                      <CardDescription className="text-xs">Google Account</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    disabled={connecting}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnect('gmail');
                    }}
                  >
                    {connecting && selectedProvider === 'gmail' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Connecting...
                      </>
                    ) : (
                      'Connect Gmail'
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Outlook */}
              <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => !connecting && handleConnect('outlook')}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Outlook</CardTitle>
                      <CardDescription className="text-xs">Microsoft Account</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    disabled={connecting}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnect('outlook');
                    }}
                  >
                    {connecting && selectedProvider === 'outlook' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Connecting...
                      </>
                    ) : (
                      'Connect Outlook'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium mb-2">🔒 Your Privacy</p>
            <ul className="space-y-1 text-xs">
              <li>• We only access emails when you explicitly trigger a sync</li>
              <li>• Emails are analyzed locally and stored securely</li>
              <li>• You can disconnect at any time</li>
              <li>• We never send emails on your behalf</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

