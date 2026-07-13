/**
 * OCR Extractor Component
 * Extracts text from images with progress indicator
 */

import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  FileText,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  Languages,
} from 'lucide-react';

interface OcrExtractorProps {
  itemId: string;
  fileUrl: string;
  mimeType: string;
  onExtracted?: (text: string) => void;
}

export default function OcrExtractor({
  itemId,
  fileUrl,
  mimeType,
  onExtracted,
}: OcrExtractorProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [language, setLanguage] = useState('eng+nld');
  const [copied, setCopied] = useState(false);

  // Check if OCR is supported for this file type
  const { data: supportData } = trpc.ocr.supportsOcr.useQuery({ mimeType });

  // Get existing OCR status
  const { data: statusData, refetch: refetchStatus } = trpc.ocr.getStatus.useQuery({
    itemId,
  });

  // Get supported languages
  const { data: languagesData } = trpc.ocr.getSupportedLanguages.useQuery();

  // Extract text mutation
  const extractMutation = trpc.ocr.extractText.useMutation({
    onSuccess: (result) => {
      if (result.success && result.text) {
        setExtractedText(result.text);
        setConfidence(result.confidence || 0);
        toast.success('Text extracted successfully!');
        onExtracted?.(result.text);
        refetchStatus();
      } else {
        toast.error(result.error || 'Failed to extract text');
      }
      setIsExtracting(false);
      setProgress(0);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsExtracting(false);
      setProgress(0);
    },
  });

  const handleExtract = () => {
    setIsExtracting(true);
    setProgress(10);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 500);

    extractMutation.mutate(
      {
        itemId,
        imageUrl: fileUrl,
        language,
        saveToItem: true,
      },
      {
        onSettled: () => {
          clearInterval(progressInterval);
          setProgress(100);
        },
      }
    );
  };

  const handleCopy = async () => {
    if (extractedText) {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      toast.success('Text copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Show existing OCR results if available
  const displayText = extractedText || statusData?.text;
  const displayConfidence = confidence ?? statusData?.confidence;

  if (!supportData?.supported) {
    return (
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">OCR is not supported for this file type. Only images can be processed.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-base">Text Extraction (OCR)</CardTitle>
          </div>
          {statusData?.hasOcr && (
            <span className="text-xs text-green-500 font-medium">
              Previously extracted
            </span>
          )}
        </div>
        <CardDescription>
          Extract text from this image using optical character recognition
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Language Selection */}
        <div className="flex items-center gap-3">
          <Languages className="w-4 h-4 text-gray-500" />
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {languagesData?.languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Extract Button */}
        {!displayText && !isExtracting && (
          <Button onClick={handleExtract} className="w-full gap-2">
            <FileText className="w-4 h-4" />
            Extract Text
          </Button>
        )}

        {/* Progress */}
        {isExtracting && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm">Extracting text...</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-gray-500">
              This may take a few moments depending on image complexity
            </p>
          </div>
        )}

        {/* Results */}
        {displayText && (
          <div className="space-y-3">
            {/* Confidence Score */}
            {displayConfidence !== null && displayConfidence !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Confidence:</span>
                <span
                  className={`font-medium ${
                    displayConfidence > 80
                      ? 'text-green-500'
                      : displayConfidence > 60
                      ? 'text-yellow-500'
                      : 'text-red-500'
                  }`}
                >
                  {displayConfidence.toFixed(1)}%
                </span>
              </div>
            )}

            {/* Extracted Text */}
            <div className="relative">
              <Textarea
                value={displayText}
                readOnly
                className="min-h-32 resize-none font-mono text-sm"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="absolute top-2 right-2 h-8 w-8 p-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Re-extract Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExtract}
              disabled={isExtracting}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Re-extract with different language
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
