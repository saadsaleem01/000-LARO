/**
 * Gmail Filtered Sync Component
 * Integrates email filtering with auto-sync scheduling
 */

import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Calendar, Mail, Search, Loader2, RefreshCw, Clock } from 'lucide-react';

interface GmailFilteredSyncProps {
  caseId: string;
  accessToken: string;
  onSyncComplete?: () => void;
}

/**
 * Gmail Filtered Sync Component
 */
export default function GmailFilteredSync({
  caseId,
  accessToken,
  onSyncComplete,
}: GmailFilteredSyncProps) {
  // Filter state
  const [sender, setSender] = useState('');
  const [subject, setSubject] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [enableAutoSync, setEnableAutoSync] = useState(false);

  // Mutations
  const searchMutation = trpc.gmailEnhanced.searchEmails.useQuery(
    {
      caseId,
      accessToken,
      sender: sender || undefined,
      subject: subject || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      maxResults: 20,
    },
    { enabled: false }
  );

  const syncMutation = trpc.gmailEnhanced.syncWithFilters.useMutation();
  const autoSyncMutation = trpc.syncScheduler.enableAutoSync.useMutation();
  const disableAutoSyncMutation = trpc.syncScheduler.disableAutoSync.useMutation();
  const autoSyncStatusQuery = trpc.syncScheduler.getAutoSyncStatus.useQuery({
    caseId,
    sourceType: 'gmail',
  });

  /**
   * Handle search
   */
  const handleSearch = async () => {
    try {
      await searchMutation.refetch();
      toast.success(`Found ${searchMutation.data?.count || 0} emails`);
    } catch (error) {
      toast.error('Failed to search emails');
    }
  };

  /**
   * Handle sync with filters
   */
  const handleSync = async () => {
    try {
      const result = await syncMutation.mutateAsync({
        caseId,
        accessToken,
        sender: sender || undefined,
        subject: subject || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (result.success) {
        toast.success(
          `Synced ${result.progress.totalMessages} emails and ${result.progress.totalAttachments} attachments`
        );
        if (onSyncComplete) {
          onSyncComplete();
        }
      } else {
        toast.error('Sync failed');
      }
    } catch (error) {
      toast.error('Failed to sync emails');
    }
  };

  /**
   * Handle auto-sync toggle
   */
  const handleAutoSyncToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        await autoSyncMutation.mutateAsync({
          caseId,
          sourceType: 'gmail',
        });
        setEnableAutoSync(true);
        toast.success('Auto-sync enabled');
      } else {
        await disableAutoSyncMutation.mutateAsync({
          caseId,
          sourceType: 'gmail',
        });
        setEnableAutoSync(false);
        toast.success('Auto-sync disabled');
      }
      await autoSyncStatusQuery.refetch();
    } catch (error) {
      toast.error('Failed to update auto-sync');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search & Filter Emails
          </CardTitle>
          <CardDescription>
            Filter emails by sender, subject, and date range before syncing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sender Filter */}
            <div className="space-y-2">
              <Label htmlFor="sender" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                From (Sender Email)
              </Label>
              <Input
                id="sender"
                placeholder="e.g., john@example.com"
                value={sender}
                onChange={e => setSender(e.target.value)}
              />
            </div>

            {/* Subject Filter */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Contains</Label>
              <Input
                id="subject"
                placeholder="e.g., contract, agreement"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                From Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="endDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                To Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSearch}
              disabled={searchMutation.isLoading}
              variant="outline"
              className="flex-1"
            >
              {searchMutation.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>

            <Button
              onClick={handleSync}
              disabled={syncMutation.isPending}
              className="flex-1"
            >
              {syncMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Emails
                </>
              )}
            </Button>
          </div>

          {/* Search Results */}
          {searchMutation.data && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm">
                Found <strong>{searchMutation.data.count}</strong> emails matching your filters
              </p>
              {Object.entries(searchMutation.data.filters).some(([_, v]) => v) && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Filters applied:
                  {searchMutation.data.filters.sender && <span> From: {searchMutation.data.filters.sender}</span>}
                  {searchMutation.data.filters.subject && <span> Subject: {searchMutation.data.filters.subject}</span>}
                  {searchMutation.data.filters.startDate && <span> After: {searchMutation.data.filters.startDate}</span>}
                  {searchMutation.data.filters.endDate && <span> Before: {searchMutation.data.filters.endDate}</span>}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-Sync Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Auto-Sync Scheduling
          </CardTitle>
          <CardDescription>
            Automatically sync emails on a schedule
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-Sync Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox
                id="autoSync"
                checked={enableAutoSync || autoSyncStatusQuery.data?.enabled || false}
                onCheckedChange={handleAutoSyncToggle}
                disabled={autoSyncMutation.isPending || disableAutoSyncMutation.isPending}
              />
              <Label htmlFor="autoSync" className="cursor-pointer">
                <div className="font-semibold">Enable Auto-Sync</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Automatically sync emails daily
                </div>
              </Label>
            </div>
          </div>

          {/* Auto-Sync Status */}
          {autoSyncStatusQuery.data && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {autoSyncStatusQuery.data.enabled ? (
                <p>
                  ✓ Auto-sync is <strong>enabled</strong>
                  {autoSyncStatusQuery.data.lastSyncAt && (
                    <>
                      <br />
                      Last synced: {new Date(autoSyncStatusQuery.data.lastSyncAt).toLocaleString()}
                    </>
                  )}
                </p>
              ) : (
                <p>Auto-sync is currently disabled</p>
              )}
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-900 p-3 rounded">
            <p>
              When enabled, emails matching your filters will be automatically synced once per day. You can
              manually trigger a sync at any time using the "Sync Emails" button above.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
