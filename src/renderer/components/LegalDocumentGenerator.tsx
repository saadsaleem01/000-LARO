import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  FileText,
  Download,
  Eye,
  Shield,
  AlertTriangle,
  Scale,
  Send,
  Loader2,
} from "lucide-react";

interface LegalDocumentGeneratorProps {
  caseId: string;
}

export function LegalDocumentGenerator({ caseId }: LegalDocumentGeneratorProps) {
  const [demandAmount, setDemandAmount] = useState("");
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const generateDocMutation = trpc.gapAnalysis.generateDocument.useMutation({
    onSuccess: (data) => {
      if (data.success && data.document) {
        setPreviewDoc(data.document);
        setPreviewOpen(true);
      }
    },
  });

  const handleGenerate = async (
    documentType: "discovery_request" | "preservation_notice" | "spoliation_warning" | "demand_letter"
  ) => {
    await generateDocMutation.mutateAsync({
      caseId,
      documentType,
      demandAmount: demandAmount ? parseFloat(demandAmount) : undefined,
    });
  };

  const handleDownload = (format: "txt" | "pdf") => {
    if (!previewDoc) return;

    const content = `${previewDoc.title}\n\n${previewDoc.content}\n\nLegal Basis:\n${previewDoc.legalBasis.join("\n")}\n\n${previewDoc.deadline ? `Deadline: ${previewDoc.deadline}\n\n` : ""}${previewDoc.consequences ? `Consequences:\n${previewDoc.consequences.join("\n")}` : ""}`;

    if (format === "txt") {
      // Download as text file
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${previewDoc.type}_${caseId}_${new Date().toISOString().split("T")[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // For PDF, we would need a server-side PDF generation
      // For now, download as formatted text that can be converted to PDF
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${previewDoc.type}_${caseId}_${new Date().toISOString().split("T")[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const documents = [
    {
      type: "discovery_request" as const,
      title: "Discovery Request (Art. 843a Rv)",
      description: "Formal request for opponent to provide documents",
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      type: "preservation_notice" as const,
      title: "Evidence Preservation Notice",
      description: "Formal notice requiring opponent to preserve all evidence",
      icon: Shield,
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
    {
      type: "spoliation_warning" as const,
      title: "Spoliation Warning",
      description: "Warning about consequences of destroying evidence",
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-50",
    },
    {
      type: "demand_letter" as const,
      title: "Formal Demand Letter",
      description: "Formal demand for compliance with obligations",
      icon: Send,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Automated Legal Document Generator</CardTitle>
          <CardDescription>
            Generate professional legal documents based on gap analysis findings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Scale className="h-4 w-4" />
            <AlertDescription>
              All documents are auto-populated with case data, gap analysis findings, and Dutch
              legal citations. Review before sending to opponent.
            </AlertDescription>
          </Alert>

          {/* Demand Amount Input (for demand letter) */}
          <div className="mb-6">
            <Label htmlFor="demand-amount">Demand Amount (Optional, for Demand Letter)</Label>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-lg">€</span>
              <Input
                id="demand-amount"
                type="number"
                placeholder="5000"
                value={demandAmount}
                onChange={(e) => setDemandAmount(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </div>

          {/* Document Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <Card key={doc.type} className="relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-32 h-32 ${doc.bgColor} opacity-10 rounded-full -mr-16 -mt-16`} />
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${doc.bgColor}`}>
                      <doc.icon className={`w-5 h-5 ${doc.color}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{doc.title}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {doc.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleGenerate(doc.type)}
                    disabled={generateDocMutation.isPending}
                    className="w-full"
                    variant="outline"
                  >
                    {generateDocMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Generate & Preview
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewDoc?.title}</DialogTitle>
            <DialogDescription>
              Review the generated document before downloading
            </DialogDescription>
          </DialogHeader>

          {previewDoc && (
            <div className="space-y-6">
              {/* Document Content */}
              <div className="p-6 bg-white border rounded-lg">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {previewDoc.content}
                </pre>
              </div>

              {/* Legal Basis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Legal Basis</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {previewDoc.legalBasis.map((basis: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground font-mono">
                        • {basis}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Deadline */}
              {previewDoc.deadline && (
                <Alert>
                  <AlertDescription>
                    <span className="font-semibold">Deadline:</span> {previewDoc.deadline}
                  </AlertDescription>
                </Alert>
              )}

              {/* Consequences */}
              {previewDoc.consequences && previewDoc.consequences.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Legal Consequences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {previewDoc.consequences.map((consequence: string, idx: number) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          • {consequence}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Download Buttons */}
              <div className="flex gap-3">
                <Button onClick={() => handleDownload("txt")} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download as Text
                </Button>
                <Button onClick={() => handleDownload("pdf")} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download as PDF
                </Button>
              </div>

              <Alert>
                <AlertDescription className="text-xs">
                  <strong>Note:</strong> Review this document with a qualified lawyer before
                  sending to the opponent. This is a template that may require customization for
                  your specific case.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

