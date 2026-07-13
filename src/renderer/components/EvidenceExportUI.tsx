import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Download,
  FileText,
  Table2,
  Archive,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface EvidenceExportUIProps {
  caseId: string;
  onExportComplete?: (format: string, url: string) => void;
}

export default function EvidenceExportUI({ caseId, onExportComplete }: EvidenceExportUIProps) {
  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "csv" | "zip" | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedFiles, setExportedFiles] = useState<
    Record<string, { url: string; timestamp: Date; success: boolean }>
  >({});

  // Get available export formats
  const { data: formats } = trpc.evidenceExport.getFormats.useQuery();

  // Export mutations
  const exportPDFMutation = trpc.evidenceExport.exportPDF.useMutation({
    onSuccess: (data) => {
      setExportedFiles((prev) => ({
        ...prev,
        pdf: { url: data.url, timestamp: new Date(), success: true },
      }));
      toast.success("PDF exported successfully!");
      onExportComplete?.("pdf", data.url);
      setSelectedFormat(null);
      setExportProgress(0);
    },
    onError: (error) => {
      toast.error(`Failed to export PDF: ${error.message}`);
      setExportProgress(0);
    },
  });

  const exportCSVMutation = trpc.evidenceExport.exportCSV.useMutation({
    onSuccess: (data) => {
      setExportedFiles((prev) => ({
        ...prev,
        csv: { url: data.url, timestamp: new Date(), success: true },
      }));
      toast.success("CSV exported successfully!");
      onExportComplete?.("csv", data.url);
      setSelectedFormat(null);
      setExportProgress(0);
    },
    onError: (error) => {
      toast.error(`Failed to export CSV: ${error.message}`);
      setExportProgress(0);
    },
  });

  const exportZIPMutation = trpc.evidenceExport.exportZIP.useMutation({
    onSuccess: (data) => {
      setExportedFiles((prev) => ({
        ...prev,
        zip: { url: data.url, timestamp: new Date(), success: true },
      }));
      toast.success("ZIP exported successfully!");
      onExportComplete?.("zip", data.url);
      setSelectedFormat(null);
      setExportProgress(0);
    },
    onError: (error) => {
      toast.error(`Failed to export ZIP: ${error.message}`);
      setExportProgress(0);
    },
  });

  const exportAllMutation = trpc.evidenceExport.exportAll.useMutation({
    onSuccess: (data) => {
      setExportedFiles((prev) => ({
        ...prev,
        pdf: { url: data.exports.pdf.url, timestamp: new Date(), success: true },
        csv: { url: data.exports.csv.url, timestamp: new Date(), success: true },
        zip: { url: data.exports.zip.url, timestamp: new Date(), success: true },
      }));
      toast.success("All formats exported successfully!");
      setSelectedFormat(null);
      setExportProgress(0);
    },
    onError: (error) => {
      toast.error(`Failed to export all formats: ${error.message}`);
      setExportProgress(0);
    },
  });

  const handleExport = async (format: "pdf" | "csv" | "zip" | "all") => {
    setSelectedFormat(format as any);
    setExportProgress(10);

    try {
      if (format === "pdf") {
        setExportProgress(30);
        await exportPDFMutation.mutateAsync({ caseId });
      } else if (format === "csv") {
        setExportProgress(30);
        await exportCSVMutation.mutateAsync({ caseId });
      } else if (format === "zip") {
        setExportProgress(30);
        await exportZIPMutation.mutateAsync({ caseId });
      } else if (format === "all") {
        setExportProgress(30);
        await exportAllMutation.mutateAsync({ caseId });
      }
      setExportProgress(100);
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  const handleDownload = (url: string, format: string) => {
    window.open(url, "_blank");
    toast.success(`Downloading ${format.toUpperCase()}...`);
  };

  const isExporting =
    exportPDFMutation.isPending ||
    exportCSVMutation.isPending ||
    exportZIPMutation.isPending ||
    exportAllMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Evidence
          </CardTitle>
          <CardDescription>
            Download your evidence in multiple formats for analysis, sharing, or archival
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Format Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* PDF Option */}
            <button
              onClick={() => handleExport("pdf")}
              disabled={isExporting}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedFormat === "pdf"
                  ? "border-orange-500 bg-orange-50 dark:bg-orange-950"
                  : "border-border hover:border-orange-300"
              } ${isExporting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-6 h-6 text-orange-500" />
                <span className="font-semibold">PDF Report</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Professional report with summary and all evidence
              </p>
            </button>

            {/* CSV Option */}
            <button
              onClick={() => handleExport("csv")}
              disabled={isExporting}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedFormat === "csv"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-border hover:border-blue-300"
              } ${isExporting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Table2 className="w-6 h-6 text-blue-500" />
                <span className="font-semibold">CSV Spreadsheet</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Import into Excel or other analysis tools
              </p>
            </button>

            {/* ZIP Option */}
            <button
              onClick={() => handleExport("zip")}
              disabled={isExporting}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedFormat === "zip"
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-950"
                  : "border-border hover:border-purple-300"
              } ${isExporting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Archive className="w-6 h-6 text-purple-500" />
                <span className="font-semibold">ZIP Archive</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Complete export with metadata and summary
              </p>
            </button>
          </div>

          {/* Progress Bar */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Exporting...</span>
                <span className="text-sm text-muted-foreground">{exportProgress}%</span>
              </div>
              <Progress value={exportProgress} className="h-2" />
            </div>
          )}

          {/* Export All Button */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={() => handleExport("all")}
              disabled={isExporting}
              variant="default"
              className="flex-1"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export All Formats
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export History */}
      {Object.keys(exportedFiles).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Export History
            </CardTitle>
            <CardDescription>Successfully exported files ready for download</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(exportedFiles).map(([format, file]) => (
                <div
                  key={format}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted"
                >
                  <div className="flex items-center gap-3">
                    {format === "pdf" && <FileText className="w-5 h-5 text-orange-500" />}
                    {format === "csv" && <Table2 className="w-5 h-5 text-blue-500" />}
                    {format === "zip" && <Archive className="w-5 h-5 text-purple-500" />}
                    <div>
                      <p className="font-medium capitalize">{format} Export</p>
                      <p className="text-sm text-muted-foreground">
                        {file.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleDownload(file.url, format)}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Format Information */}
      {formats && (
        <Card>
          <CardHeader>
            <CardTitle>Export Format Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {formats.map((format) => (
                <div key={format.format} className="flex gap-3">
                  <Badge variant="outline" className="h-fit">
                    {format.label}
                  </Badge>
                  <p className="text-sm text-muted-foreground">{format.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
