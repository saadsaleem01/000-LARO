import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Trash2, Shield, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Privacy() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  const { data: consent, refetch: refetchConsent } = trpc.gdpr.getConsent.useQuery();
  const exportDataMutation = trpc.gdpr.exportData.useMutation();
  const deleteDataMutation = trpc.gdpr.deleteData.useMutation();
  const updateConsentMutation = trpc.gdpr.updateConsent.useMutation();

  const handleExportData = async () => {
    try {
      const data = await exportDataMutation.mutateAsync();
      
      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laro-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Data exported successfully");
    } catch (error) {
      toast.error("Failed to export data: " + (error as Error).message);
    }
  };

  const handleDeleteData = async () => {
    try {
      await deleteDataMutation.mutateAsync({
        reason: "User requested deletion",
        confirmEmail,
      });
      
      toast.success("Your data has been deleted");
      
      // Redirect to logout after deletion
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (error) {
      toast.error("Failed to delete data: " + (error as Error).message);
    }
  };

  const handleUpdateConsent = async (field: string, value: boolean) => {
    try {
      await updateConsentMutation.mutateAsync({
        [field]: value,
      });
      
      await refetchConsent();
      toast.success("Consent preferences updated");
    } catch (error) {
      toast.error("Failed to update consent: " + (error as Error).message);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
            Privacy & Data
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage your data and privacy preferences
          </p>
        </div>

        {/* GDPR Rights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Export Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-blue-500" />
                Export Your Data
              </CardTitle>
              <CardDescription>
                Download a complete copy of all your data (GDPR Article 15)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This includes your profile, cases, outreach history, clarifications, evidence files, and activity logs.
              </p>
              <Button
                onClick={handleExportData}
                disabled={exportDataMutation.isPending}
                className="w-full"
              >
                {exportDataMutation.isPending ? "Exporting..." : "Export Data as JSON"}
              </Button>
            </CardContent>
          </Card>

          {/* Delete Data */}
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
                Delete Your Data
              </CardTitle>
              <CardDescription>
                Permanently delete all your data (GDPR Article 17)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showDeleteConfirm ? (
                <>
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This action cannot be undone. All your cases, evidence, and account data will be permanently deleted.
                    </AlertDescription>
                  </Alert>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full"
                  >
                    Delete My Data
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    To confirm deletion, please enter your email address:
                  </p>
                  <input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setConfirmEmail("");
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteData}
                      disabled={!confirmEmail || deleteDataMutation.isPending}
                      className="flex-1"
                    >
                      {deleteDataMutation.isPending ? "Deleting..." : "Confirm Delete"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Consent Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              Privacy Preferences
            </CardTitle>
            <CardDescription>
              Control how we use your data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Data Processing */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h4 className="font-medium">Data Processing</h4>
                <p className="text-sm text-muted-foreground">
                  Allow us to process your data to match you with lawyers (required for service)
                </p>
              </div>
              <Button
                variant="outline"
                disabled
                className="ml-4"
              >
                Required
              </Button>
            </div>

            {/* Email Communication */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h4 className="font-medium">Email Communication</h4>
                <p className="text-sm text-muted-foreground">
                  Receive updates about your cases and lawyer responses (required for service)
                </p>
              </div>
              <Button
                variant="outline"
                disabled
                className="ml-4"
              >
                Required
              </Button>
            </div>

            {/* Data Sharing */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h4 className="font-medium">Data Sharing with Lawyers</h4>
                <p className="text-sm text-muted-foreground">
                  Share your case information with matched lawyers
                </p>
              </div>
              <Button
                variant={consent?.dataSharing ? "default" : "outline"}
                onClick={() => handleUpdateConsent("dataSharing", !consent?.dataSharing)}
                disabled={updateConsentMutation.isPending}
                className="ml-4"
              >
                {consent?.dataSharing ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Last updated: {consent?.lastUpdated ? new Date(consent.lastUpdated).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Information */}
        <Card>
          <CardHeader>
            <CardTitle>Your Privacy Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Under the General Data Protection Regulation (GDPR), you have the following rights:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Right to Access:</strong> You can request a copy of your personal data</li>
              <li><strong>Right to Rectification:</strong> You can update incorrect or incomplete data</li>
              <li><strong>Right to Erasure:</strong> You can request deletion of your data</li>
              <li><strong>Right to Restrict Processing:</strong> You can limit how we use your data</li>
              <li><strong>Right to Data Portability:</strong> You can receive your data in a machine-readable format</li>
              <li><strong>Right to Object:</strong> You can object to certain types of processing</li>
            </ul>
            <p>
              For questions about your privacy rights or data handling, please contact us at privacy@laro.nl
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

