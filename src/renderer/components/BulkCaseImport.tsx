import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

/**
 * Bulk Case Import Component
 * Upload CSV files with multiple cases for automatic processing
 */

interface ImportJob {
  id: string;
  filename: string;
  status: string;
  totalRows: number;
  processedRows: number;
  failedRows: number;
  createdAt: Date;
  completedAt: Date | null;
}

export function BulkCaseImport() {
  const [uploading, setUploading] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.bulkImport.uploadCSV.useMutation();
  const { data: jobStatus, refetch: refetchJobStatus } = trpc.bulkImport.getJobStatus.useQuery(
    { jobId: currentJobId! },
    { enabled: !!currentJobId, refetchInterval: 2000 }
  );
  const { data: jobs, refetch: refetchJobs } = trpc.bulkImport.listJobs.useQuery();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setUploading(true);

    try {
      // Read file content
      const content = await file.text();

      // Upload CSV
      const result = await uploadMutation.mutateAsync({
        csvContent: content,
        filename: file.name,
      });

      if (!result.success) {
        toast.error('CSV validation failed', {
          description: result.errors?.join(', '),
        });
        return;
      }

      toast.success('Import started', {
        description: `Processing ${result.totalRows} cases...`,
      });

      setCurrentJobId(result.jobId);
      refetchJobs();
    } catch (error) {
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const template = `caseTitle,description,category,urgency,evidenceUrls,tags
"Divorce Settlement","Need help with divorce proceedings and asset division","Family Law","High","","divorce,family"
"Employment Dispute","Wrongful termination case against former employer","Employment Law","Medium","","employment,termination"
"Contract Review","Review and negotiate commercial lease agreement","Contract Law","Low","","contract,lease"`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <AlertCircle className="h-5 w-5 text-blue-500 animate-pulse" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'processing':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Case Import</CardTitle>
          <CardDescription>
            Upload a CSV file to create multiple cases at once
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload CSV'}
            </Button>
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <Alert>
            <AlertDescription>
              <strong>CSV Format:</strong> Your CSV must include columns: caseTitle, description,
              category, urgency. Optional: evidenceUrls, tags (comma-separated).
            </AlertDescription>
          </Alert>

          {/* Current Job Progress */}
          {jobStatus && jobStatus.status === 'processing' && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Processing {jobStatus.filename}</span>
                    <span className="text-sm text-gray-600">
                      {jobStatus.processedRows} / {jobStatus.totalRows}
                    </span>
                  </div>
                  <Progress
                    value={(jobStatus.processedRows / jobStatus.totalRows) * 100}
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed Job Summary */}
          {jobStatus && jobStatus.status === 'completed' && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Import completed!</p>
                      <p className="text-sm text-green-700">
                        {jobStatus.processedRows - jobStatus.failedRows} cases created successfully
                        {jobStatus.failedRows > 0 && `, ${jobStatus.failedRows} failed`}
                      </p>
                    </div>
                  </div>
                  
                  {/* Aggregation Summary */}
                  {(jobStatus as any).aggregation && (jobStatus as any).aggregation.duplicatesRemoved > 0 && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-900">
                        <strong>Smart Consolidation:</strong> Detected and merged {(jobStatus as any).aggregation.duplicatesRemoved} duplicate case(s).
                        {' '}{(jobStatus as any).aggregation.originalCount} rows → {(jobStatus as any).aggregation.consolidatedCount} unique cases.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
          <CardDescription>View your previous bulk imports</CardDescription>
        </CardHeader>
        <CardContent>
          {!jobs || jobs.length === 0 ? (
            <p className="text-sm text-gray-500">No imports yet</p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <p className="font-medium">{job.filename}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(job.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${getStatusColor(job.status)}`}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {job.processedRows} / {job.totalRows} processed
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
