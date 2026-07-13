/**
 * New case dialog — compact form (full multi-step wizard can be restored later).
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CaseData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  legalArea: string;
  summary: string;
  urgency: "Medium";
  profileSource: "account" | "custom";
  uploadDocumentsAfterCreate: boolean;
}

interface CaseCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (caseData: CaseData) => void;
}

const LEGAL_AREAS = [
  "Arbeidsrecht (Employment Law)",
  "Huurrecht (Tenancy Law)",
  "Familierecht (Family Law)",
  "Strafrecht (Criminal Law)",
  "Verbintenissenrecht (Contract Law)",
  "Bestuursrecht (Administrative Law)",
  "Ondernemingsrecht (Corporate Law)",
  "Intellectueel eigendomsrecht (IP Law)",
  "Belastingrecht (Tax Law)",
  "Socialezekerheidsrecht (Social Security Law)",
  "Other",
];

export default function CaseCreationWizard({
  open,
  onOpenChange,
  onComplete,
}: CaseCreationWizardProps) {
  const { user } = useAuth();
  const [caseData, setCaseData] = useState<CaseData>({
    clientName: user?.name || "",
    clientEmail: user?.email || "",
    clientPhone: "",
    legalArea: "",
    summary: "",
    urgency: "Medium",
    profileSource: "account",
    uploadDocumentsAfterCreate: false,
  });

  useEffect(() => {
    if (!open) {
      setCaseData({
        clientName: user?.name || "",
        clientEmail: user?.email || "",
        clientPhone: "",
        legalArea: "",
        summary: "",
        urgency: "Medium",
        profileSource: "account",
        uploadDocumentsAfterCreate: false,
      });
    } else {
      setCaseData(prev => ({
        ...prev,
        clientName: prev.clientName || user?.name || "",
        clientEmail: prev.clientEmail || user?.email || "",
      }));
    }
  }, [open, user]);

  const submit = () => {
    if (!caseData.clientName.trim() || !caseData.clientEmail.trim()) {
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(caseData.clientEmail)) {
      return;
    }
    onComplete?.({ ...caseData });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New case</DialogTitle>
          <DialogDescription>
            Add a matter so LARO can organise evidence and match lawyers.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Contact source</Label>
            <Select
              value={caseData.profileSource}
              onValueChange={(v: "account" | "custom") => {
                if (v === "account") {
                  setCaseData((d) => ({
                    ...d,
                    profileSource: "account",
                    clientName: user?.name || "",
                    clientEmail: user?.email || "",
                  }));
                } else {
                  setCaseData((d) => ({
                    ...d,
                    profileSource: "custom",
                    clientName: "",
                    clientEmail: "",
                  }));
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose profile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="account">
                  My account{user?.email ? ` (${user.email})` : ""}
                </SelectItem>
                <SelectItem value="custom">Someone else / enter manually</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Use your signed-in profile or enter different contact details for this matter.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ccw-name">Client name</Label>
            <Input
              id="ccw-name"
              value={caseData.clientName}
              disabled={caseData.profileSource === "account"}
              onChange={(e) =>
                setCaseData((d) => ({ ...d, clientName: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ccw-email">Client email</Label>
            <Input
              id="ccw-email"
              type="email"
              value={caseData.clientEmail}
              disabled={caseData.profileSource === "account"}
              onChange={(e) =>
                setCaseData((d) => ({ ...d, clientEmail: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ccw-phone">Phone (optional)</Label>
            <Input
              id="ccw-phone"
              value={caseData.clientPhone}
              onChange={(e) =>
                setCaseData((d) => ({ ...d, clientPhone: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>Legal area (Optional - AI will auto-detect)</Label>
            <Select
              value={caseData.legalArea || undefined}
              onValueChange={(v: string) =>
                setCaseData((d) => ({ ...d, legalArea: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional — leave blank for AI to detect" />
              </SelectTrigger>
              <SelectContent>
                {LEGAL_AREAS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ccw-summary">Case summary</Label>
            <Textarea
              id="ccw-summary"
              rows={16}
              value={caseData.summary}
              onChange={(e) =>
                setCaseData((d) => ({ ...d, summary: e.target.value }))
              }
              placeholder="Describe the case details here. LARO will analyze the description and automatically determine relevant legal areas from uploaded evidence."
              className="min-h-[240px]"
            />
            <p className="text-xs text-muted-foreground">
              Optional. You can create a case with documentation only and let LARO analyze the documents first.
            </p>
          </div>
          <label className="flex items-start gap-3 rounded-md border border-border/60 p-3">
            <input
              type="checkbox"
              checked={caseData.uploadDocumentsAfterCreate}
              onChange={(e) =>
                setCaseData((d) => ({ ...d, uploadDocumentsAfterCreate: e.target.checked }))
              }
              className="mt-1 h-4 w-4"
            />
            <span className="text-sm text-muted-foreground">
              Open document upload immediately after creating this case.
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Create case</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
