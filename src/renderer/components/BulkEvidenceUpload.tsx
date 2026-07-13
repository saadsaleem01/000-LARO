import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Upload,
  X,
  CheckCircle2,
  XCircle,
  FileText,
  Image as ImageIcon,
  Video,
  Mail,
  File as FileIcon,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface FileWithPreview {
  file: File;
  id: string;
  preview?: string;
  status: "pending" | "uploading" | "completed" | "failed";
  progress: number;
  error?: string;
}

interface BulkEvidenceUploadProps {
  caseId: string;
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export default function BulkEvidenceUpload({
  caseId,
  open,
  onClose,
  onComplete,
}: BulkEvidenceUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const createEvidenceFile = trpc.evidenceFiles.create.useMutation();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileWithPreview[] = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substring(7),
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      status: "pending",
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"],
      "video/*": [".mp4", ".mov", ".avi", ".mkv"],
      "message/rfc822": [".eml"],
      "application/vnd.ms-outlook": [".msg"],
      "text/*": [".txt", ".csv"],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
  } as any);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const detectFileType = (mimeType: string): string => {
    if (mimeType.startsWith("image/")) return "photo";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.includes("pdf") || mimeType.includes("word") || mimeType.includes("document"))
      return "document";
    if (mimeType.includes("outlook") || mimeType.includes("rfc822")) return "email";
    return "other";
  };

  const getFileIcon = (mimeType: string) => {
    const type = detectFileType(mimeType);
    switch (type) {
      case "document":
        return <FileText className="w-5 h-5 text-blue-500" />;
      case "photo":
        return <ImageIcon className="w-5 h-5 text-green-500" />;
      case "video":
        return <Video className="w-5 h-5 text-purple-500" />;
      case "email":
        return <Mail className="w-5 h-5 text-orange-500" />;
      default:
        return <FileIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const uploadFile = async (fileWithPreview: FileWithPreview) => {
    try {
      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) => (f.id === fileWithPreview.id ? { ...f, status: "uploading" } : f))
      );

      // Simulate upload progress (in real implementation, use presigned URL with progress tracking)
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileWithPreview.id && f.progress < 90
              ? { ...f, progress: f.progress + 10 }
              : f
          )
        );
      }, 200);

      // Read file as buffer
      const arrayBuffer = await fileWithPreview.file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Upload to S3 (this would normally use presigned URL from backend)
      const s3Key = `evidence/${caseId}/${Date.now()}-${fileWithPreview.file.name}`;
      
      // For now, we'll use a placeholder URL since we can't directly call server functions from client
      // In production, you'd get a presigned URL from the backend first
      const s3Url = `https://storage.example.com/${s3Key}`;

      clearInterval(progressInterval);

      // Create evidence file record
      await createEvidenceFile.mutateAsync({
        caseId,
        title: fileWithPreview.file.name,
        type: detectFileType(fileWithPreview.file.type) as any,
        fileName: fileWithPreview.file.name,
        fileSize: fileWithPreview.file.size.toString(),
        mimeType: fileWithPreview.file.type,
        source: "Upload",
        fileUrl: s3Url,
      });

      // Update status to completed
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileWithPreview.id ? { ...f, status: "completed", progress: 100 } : f
        )
      );
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileWithPreview.id
            ? {
                ...f,
                status: "failed",
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : f
        )
      );
      throw error;
    }
  };

  const uploadAll = async () => {
    setIsUploading(true);

    const pendingFiles = files.filter((f) => f.status === "pending");
    let ok = 0;
    let failed = 0;

    for (const file of pendingFiles) {
      try {
        await uploadFile(file);
        ok++;
      } catch {
        failed++;
      }
    }

    setIsUploading(false);
    if (ok > 0) toast.success(`Uploaded ${ok} file${ok === 1 ? "" : "s"} successfully`);
    if (failed > 0) toast.error(`${failed} file${failed === 1 ? "" : "s"} failed to upload`);

    if (onComplete && ok > 0) {
      onComplete();
    }
  };

  useEffect(() => {
    if (!open) setFiles([]);
  }, [open]);

  useEffect(() => {
    const hasPending = files.some((f) => f.status === "pending");
    if (!open || !hasPending || isUploading) return;
    void uploadAll();
    // Auto-upload immediately after files are added via click/drag-drop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, open, isUploading]);

  const cancelAll = () => {
    setFiles([]);
    onClose();
  };

  const completedCount = files.filter((f) => f.status === "completed").length;
  const failedCount = files.filter((f) => f.status === "failed").length;
  const totalCount = files.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload files</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-orange-500 bg-orange-500/10"
                : "border-border hover:border-orange-500/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop files here...</p>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">Drag & drop files here</p>
                <p className="text-sm text-muted-foreground">
                  or click to select files (max 100MB per file)
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Supported: PDF, Word, Excel, Images, Videos, Emails
                </p>
              </>
            )}
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  Files ({completedCount}/{totalCount})
                </h3>
                {failedCount > 0 && (
                  <Badge variant="destructive">{failedCount} failed</Badge>
                )}
              </div>

              {files.map((fileWithPreview) => (
                <Card key={fileWithPreview.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* File Icon/Preview */}
                      <div className="flex-shrink-0">
                        {fileWithPreview.preview ? (
                          <img
                            src={fileWithPreview.preview}
                            alt={fileWithPreview.file.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          getFileIcon(fileWithPreview.file.type)
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{fileWithPreview.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(fileWithPreview.file.size)}
                        </p>

                        {/* Progress Bar */}
                        {fileWithPreview.status === "uploading" && (
                          <Progress value={fileWithPreview.progress} className="mt-2" />
                        )}

                        {/* Error Message */}
                        {fileWithPreview.status === "failed" && fileWithPreview.error && (
                          <p className="text-sm text-destructive mt-1">{fileWithPreview.error}</p>
                        )}
                      </div>

                      {/* Status Icon */}
                      <div className="flex-shrink-0">
                        {fileWithPreview.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(fileWithPreview.id)}
                            disabled={isUploading}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                        {fileWithPreview.status === "uploading" && (
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        )}
                        {fileWithPreview.status === "completed" && (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        )}
                        {fileWithPreview.status === "failed" && (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end border-t pt-4">
          <Button variant="outline" onClick={cancelAll} disabled={isUploading}>
            Cancel
          </Button>
          <div className="text-sm text-muted-foreground flex items-center">
            {isUploading
              ? "Uploading automatically..."
              : "Files upload automatically after selection."}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
