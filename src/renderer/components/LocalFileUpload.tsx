/**
 * Local File Upload Component
 * Handles file uploads with drag-and-drop and click-to-upload
 */

import React, { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useEffect } from 'react';
import { toast } from 'sonner';
import BulkFileOperations from '@/components/BulkFileOperations';
import {
  Upload,
  File,
  X,
  Check,
  AlertCircle,
  FileText,
  Image,
  Music,
  Video,
  Archive,
  Loader2,
} from 'lucide-react';

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

interface LocalFileUploadProps {
  caseId: string;
  onUploadComplete?: () => void;
}

/**
 * Get icon for file type
 */
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="w-4 h-4" />;
  if (mimeType.startsWith('video/')) return <Video className="w-4 h-4" />;
  if (mimeType.startsWith('audio/')) return <Music className="w-4 h-4" />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z'))
    return <Archive className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Local File Upload Component
 */
export default function LocalFileUpload({ caseId, onUploadComplete }: LocalFileUploadProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get supported file types
  const { data: supportedTypesData } = trpc.localFileUpload.getSupportedTypes.useQuery();

  // Upload file mutation
  const uploadFileMutation = trpc.localFileUpload.uploadFile.useMutation();
  const uploadFilesMutation = trpc.localFileUpload.uploadFiles.useMutation();

  // Get upload stats
  const { data: statsData, refetch: refetchStats } = trpc.localFileUpload.getStats.useQuery({
    caseId,
  });

  /**
   * Handle file drop
   */
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: FileWithProgress[] = acceptedFiles.map(file => ({
        file,
        progress: 0,
        status: 'pending',
      }));

      setFiles(prev => [...prev, ...newFiles]);
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: supportedTypesData?.supported ? {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
      'video/*': ['.mp4', '.mpeg', '.mov', '.avi'],
      'audio/*': ['.mp3', '.wav', '.ogg', '.webm'],
      'application/zip': ['.zip'],
    } : undefined,
  });

  /**
   * Handle file selection via input
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onDrop(Array.from(e.target.files));
    }
  };

  /**
   * Upload files
   */
  const handleUpload = useCallback(async () => {
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      // Prepare files for upload
      const filesToUpload = files.filter(f => f.status === 'pending');

      // Read files as base64
      const filesWithData = await Promise.all(
        filesToUpload.map(
          f =>
            new Promise<{ filename: string; mimeType: string; fileData: string }>(
              (resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                  const base64 = (reader.result as string).split(',')[1];
                  resolve({
                    filename: f.file.name,
                    mimeType: f.file.type,
                    fileData: base64,
                  });
                };
                reader.onerror = reject;
                reader.readAsDataURL(f.file);
              }
            )
        )
      );

      // Update file statuses
      setFiles(prev =>
        prev.map(f =>
          filesToUpload.find(fu => fu.file.name === f.file.name)
            ? { ...f, status: 'uploading', progress: 50 }
            : f
        )
      );

      // Upload files
      const result = await uploadFilesMutation.mutateAsync({
        caseId,
        files: filesWithData,
      });

      if (result.success) {
        // Update file statuses to completed
        setFiles(prev =>
          prev.map(f =>
            filesToUpload.find(fu => fu.file.name === f.file.name)
              ? { ...f, status: 'completed', progress: 100 }
              : f
          )
        );

        toast.success(`Successfully uploaded ${result.summary.succeeded} file(s)`);

        // Refetch stats
        await refetchStats();

        // Clear files after delay
        setTimeout(() => {
          setFiles(prev => prev.filter(f => f.status !== 'completed'));
        }, 2000);

        // Call callback
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        toast.error('Upload failed');
        setFiles(prev =>
          prev.map(f =>
            filesToUpload.find(fu => fu.file.name === f.file.name)
              ? { ...f, status: 'failed', error: 'Upload failed' }
              : f
          )
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload failed';
      toast.error(errorMsg);
      setFiles(prev =>
        prev.map(f =>
          f.status === 'uploading' ? { ...f, status: 'failed', error: errorMsg } : f
        )
      );
    } finally {
      setIsUploading(false);
    }
  }, [files, isUploading, caseId, uploadFilesMutation, refetchStats, onUploadComplete]);

  // Auto-upload effect
  useEffect(() => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length > 0 && !isUploading) {
      handleUpload();
    }
  }, [files, isUploading, handleUpload]);

  /**
   * Remove file from queue
   */
  const removeFile = (filename: string) => {
    setFiles(prev => prev.filter(f => f.file.name !== filename));
  };

  /**
   * Clear all files
   */
  const clearAll = () => {
    setFiles([]);
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const completedCount = files.filter(f => f.status === 'completed').length;
  const failedCount = files.filter(f => f.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Evidence Files</CardTitle>
          <CardDescription>
            Drag and drop files or click to browse. Supported: PDF, Word, Excel, Images, Videos, Audio, Archives
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag and Drop Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept={supportedTypesData?.allTypes?.join(',')}
            />

            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-gray-400" />
              {isDragActive ? (
                <div>
                  <p className="font-semibold text-blue-600">Drop files here</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold">Drag and drop files here</p>
                  <p className="text-sm text-gray-500">or click to select files</p>
                </div>
              )}
            </div>
          </div>

          {/* File Size Limit */}
          <p className="text-xs text-gray-500">
            Maximum file size: {formatFileSize(supportedTypesData?.maxFileSize || 100 * 1024 * 1024)}
          </p>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm">
                  Files ({pendingCount} pending, {completedCount} completed, {failedCount} failed)
                </h3>
                {files.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAll}>
                    Clear All
                  </Button>
                )}
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map(f => (
                  <div
                    key={f.file.name}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    {/* File Icon */}
                    <div className="text-gray-400">{getFileIcon(f.file.type)}</div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(f.file.size)}</p>
                    </div>

                    {/* Progress / Status */}
                    <div className="flex items-center gap-2">
                      {f.status === 'pending' && (
                        <span className="text-xs text-gray-500">Pending</span>
                      )}
                      {f.status === 'uploading' && (
                        <div className="flex items-center gap-2">
                          <Progress value={f.progress} className="w-24 h-1" />
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        </div>
                      )}
                      {f.status === 'completed' && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                      {f.status === 'failed' && (
                        <AlertCircle className="w-4 h-4 text-red-500" title={f.error} />
                      )}

                      {/* Remove Button */}
                      {f.status !== 'uploading' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(f.file.name)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button Removed (Auto-uploading) */}
        </CardContent>
      </Card>

      {/* Upload Statistics */}
      {statsData && statsData.totalFiles > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Files</p>
                <p className="text-2xl font-bold">{statsData.totalFiles}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Size</p>
                <p className="text-2xl font-bold">{formatFileSize(statsData.totalSize)}</p>
              </div>
            </div>

            {/* By Category */}
            {Object.keys(statsData.byCategory).length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">By Category</p>
                <div className="space-y-1">
                  {Object.entries(statsData.byCategory).map(([category, count]) => (
                    <div key={category} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 capitalize">{category}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {statsData.lastUploadAt && (
              <p className="text-xs text-gray-500">
                Last upload: {new Date(statsData.lastUploadAt).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bulk File Operations */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Manage Uploaded Files</h2>
        <BulkFileOperations caseId={caseId} onOperationComplete={() => refetchStats()} />
      </div>
    </div>
  );
}
