import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  File,
  FileText,
  Image as ImageIcon,
  Video,
  X,
  Check,
  AlertCircle,
  Camera,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  category?: string;
  confidence?: number;
  status: "uploading" | "analyzing" | "complete" | "error";
  progress: number;
  analysis?: {
    type: string;
    extractedInfo?: string[];
    suggestedCategory?: string;
  };
}

const FILE_CATEGORIES = [
  { value: "contract", label: "Contract", icon: FileText },
  { value: "correspondence", label: "Correspondence", icon: FileText },
  { value: "photo", label: "Photo Evidence", icon: ImageIcon },
  { value: "video", label: "Video Evidence", icon: Video },
  { value: "receipt", label: "Receipt/Invoice", icon: FileText },
  { value: "medical", label: "Medical Record", icon: FileText },
  { value: "other", label: "Other", icon: File },
];

export default function EnhancedEvidenceUpload({ caseId }: { caseId?: string }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const categorizeFile = async (file: File): Promise<{ category: string; confidence: number }> => {
    // Simple file type based categorization
    const extension = file.name.split('.').pop()?.toLowerCase();
    const type = file.type;

    if (type.startsWith('image/')) {
      return { category: 'photo', confidence: 0.9 };
    }
    
    if (type.startsWith('video/')) {
      return { category: 'video', confidence: 0.9 };
    }

    if (extension === 'pdf' || type.includes('pdf')) {
      // Could be contract, correspondence, or medical
      const name = file.name.toLowerCase();
      if (name.includes('contract') || name.includes('agreement')) {
        return { category: 'contract', confidence: 0.8 };
      }
      if (name.includes('email') || name.includes('letter')) {
        return { category: 'correspondence', confidence: 0.7 };
      }
      if (name.includes('invoice') || name.includes('receipt')) {
        return { category: 'receipt', confidence: 0.8 };
      }
      if (name.includes('medical') || name.includes('doctor')) {
        return { category: 'medical', confidence: 0.8 };
      }
      return { category: 'other', confidence: 0.5 };
    }

    return { category: 'other', confidence: 0.5 };
  };

  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status: "uploading" as const,
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Process each file
    for (const uploadedFile of newFiles) {
      try {
        // Simulate upload progress
        for (let i = 0; i <= 100; i += 20) {
          await new Promise(resolve => setTimeout(resolve, 200));
          setFiles(prev => prev.map(f => 
            f.id === uploadedFile.id ? { ...f, progress: i } : f
          ));
        }

        // Categorize file
        setFiles(prev => prev.map(f => 
          f.id === uploadedFile.id ? { ...f, status: "analyzing" as const } : f
        ));

        const { category, confidence } = await categorizeFile(uploadedFile.file);

        // Simulate AI analysis
        await new Promise(resolve => setTimeout(resolve, 1000));

        setFiles(prev => prev.map(f => 
          f.id === uploadedFile.id ? {
            ...f,
            status: "complete" as const,
            category,
            confidence,
            analysis: {
              type: uploadedFile.file.type,
              suggestedCategory: category,
              extractedInfo: [
                `File size: ${(uploadedFile.file.size / 1024).toFixed(2)} KB`,
                `Type: ${uploadedFile.file.type || 'Unknown'}`,
                `Uploaded: ${new Date().toLocaleString()}`,
              ],
            },
          } : f
        ));

        toast.success(`${uploadedFile.file.name} uploaded and categorized`);
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === uploadedFile.id ? { ...f, status: "error" as const } : f
        ));
        toast.error(`Failed to upload ${uploadedFile.file.name}`);
      }
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    toast.info("File removed");
  };

  const updateCategory = (id: string, category: string) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, category, confidence: 1.0 } : f
    ));
    toast.success("Category updated");
  };

  const getCategoryIcon = (category?: string) => {
    const cat = FILE_CATEGORIES.find(c => c.value === category);
    return cat?.icon || File;
  };

  const completedFiles = files.filter(f => f.status === "complete").length;
  const totalFiles = files.length;

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-1">
                Drag and drop files here
              </h3>
              <p className="text-sm text-muted-foreground">
                or click to browse from your device
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="default"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Browse Files
              </Button>

              <Button
                variant="outline"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Supports: PDF, Images (JPG, PNG), Videos (MP4), Documents (DOCX)
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInput}
            accept=".pdf,.jpg,.jpeg,.png,.mp4,.mov,.docx,.doc"
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileInput}
          />
        </CardContent>
      </Card>

      {/* Progress Summary */}
      {totalFiles > 0 && (
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Upload Progress: {completedFiles} of {totalFiles} files
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round((completedFiles / totalFiles) * 100)}%
            </span>
          </div>
          <Progress value={(completedFiles / totalFiles) * 100} className="h-2" />
        </div>
      )}

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Uploaded Files ({files.length})</h3>
          
          <div className="grid gap-3">
            {files.map((uploadedFile) => {
              const CategoryIcon = getCategoryIcon(uploadedFile.category);
              
              return (
                <Card key={uploadedFile.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Preview or Icon */}
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {uploadedFile.preview ? (
                          <img
                            src={uploadedFile.preview}
                            alt={uploadedFile.file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <CategoryIcon className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{uploadedFile.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(uploadedFile.file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={() => removeFile(uploadedFile.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Status */}
                        {uploadedFile.status === "uploading" && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Uploading...
                            </div>
                            <Progress value={uploadedFile.progress} className="h-1" />
                          </div>
                        )}

                        {uploadedFile.status === "analyzing" && (
                          <div className="flex items-center gap-2 text-sm text-primary">
                            <Sparkles className="w-3 h-3 animate-pulse" />
                            Analyzing with AI...
                          </div>
                        )}

                        {uploadedFile.status === "complete" && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-green-600 dark:text-green-400">
                                Upload complete
                              </span>
                            </div>

                            {/* AI Categorization */}
                            {uploadedFile.category && (
                              <div className="bg-primary/5 border border-primary/20 rounded-md p-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <Sparkles className="w-3 h-3 text-primary" />
                                  <span className="text-xs font-medium">AI Categorization</span>
                                  {uploadedFile.confidence && (
                                    <Badge variant="secondary" className="text-xs">
                                      {Math.round(uploadedFile.confidence * 100)}% confident
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="flex flex-wrap gap-1">
                                  {FILE_CATEGORIES.map((cat) => (
                                    <Button
                                      key={cat.value}
                                      variant={uploadedFile.category === cat.value ? "default" : "outline"}
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => updateCategory(uploadedFile.id, cat.value)}
                                    >
                                      {cat.label}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {uploadedFile.status === "error" && (
                          <div className="flex items-center gap-2 text-sm text-destructive">
                            <AlertCircle className="w-4 h-4" />
                            Upload failed
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Missing Evidence Alerts */}
      {completedFiles > 0 && (
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm mb-1">Suggested Additional Evidence</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Signed contract or agreement</li>
                  <li>• Email correspondence with the other party</li>
                  <li>• Payment records or receipts</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

