import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Mail,
  Bell,
  Shield,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings as SettingsIcon,
  Sliders,
  User,
  HardDrive,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import EvidenceConnectionsCard from "@/components/EvidenceConnectionsCard";

type SettingsSection =
  | "personalization"
  | "email"
  | "outreach"
  | "notifications"
  | "system"
  | "security";

const NAV_ITEMS: Array<{
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof Mail;
}> = [
  { id: "personalization", label: "Personalization", description: "Dashboard & templates", icon: User },
  { id: "email", label: "Email", description: "Provider & test send", icon: Mail },
  { id: "outreach", label: "Outreach", description: "Follow-ups & scraper", icon: Sliders },
  { id: "notifications", label: "Notifications", description: "Alerts & channels", icon: Bell },
  { id: "system", label: "System", description: "Matching & scanner", icon: SettingsIcon },
  { id: "security", label: "Security", description: "Data & privacy", icon: Shield },
];

const DEFAULT_OUTREACH = {
  followUpIntervalDays: 5,
  maxFollowUps: 2,
  filterThreshold: 3,
  batchLimit: 10,
  scraperSchedule: "Every Sunday at 2:00 AM",
};

const DEFAULT_TOGGLES = {
  lawyerMatch: true,
  emailActivity: true,
  newCase: true,
  scraper: false,
};

export default function Settings() {
  const [section, setSection] = useState<SettingsSection>("email");
  const [, setLocation] = useLocation();
  const [testEmail, setTestEmail] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [isExportingSecurityData, setIsExportingSecurityData] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const scraperScheduleInputRef = useRef<HTMLInputElement>(null);

  const { data: userPref, refetch: refetchPrefs } = trpc.userPreferences.get.useQuery();
  const updateWorkbench = trpc.userPreferences.updateAppWorkbench.useMutation({
    onSuccess: () => {
      void refetchPrefs();
    },
  });

  const outreach = userPref?.appWorkbench?.outreach ?? DEFAULT_OUTREACH;
  const toggles = userPref?.appWorkbench?.quickNotificationToggles ?? DEFAULT_TOGGLES;

  const { data: providerInfo } = trpc.email.getProviderInfo.useQuery();
  const { data: healthInfo } = trpc.health.check.useQuery();
  const testEmailMutation = trpc.email.test.useMutation();
  const exportDataMutation = trpc.gdpr.exportData.useMutation();

  // Stored list of folders to include whenever LARO runs a keyword pull. We
  // keep this in localStorage so it works without an extra DB migration; the
  // case-view "Pull evidence by keyword" panel reads from here when sending
  // localFolderPaths to the server.
  const LARO_FOLDERS_KEY = "laroDefaultLocalScanFolders";

  const readDefaultFolders = (): string[] => {
    try {
      const raw = localStorage.getItem(LARO_FOLDERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const writeDefaultFolders = (paths: string[]) => {
    localStorage.setItem(LARO_FOLDERS_KEY, JSON.stringify(paths));
    // Surface the change to other components in the same window.
    window.dispatchEvent(new CustomEvent("laro:default-folders-changed"));
  };

  const [scannerFolders, setScannerFolders] = useState<string[]>(readDefaultFolders());

  const openScanner = useCallback(async () => {
    try {
      // Electron environment → native folder picker. No token page, no
      // separate window. Just pick a folder and we remember it.
      if (typeof window !== "undefined" && window.electronAPI?.selectFolder) {
        const result = await window.electronAPI.selectFolder();
        const picked = Array.isArray(result) ? result : result ? [result as unknown as string] : null;
        if (!picked || picked.length === 0) return; // user cancelled
        const merged = Array.from(new Set([...readDefaultFolders(), ...picked]));
        writeDefaultFolders(merged);
        setScannerFolders(merged);
        toast.success(
          picked.length === 1
            ? `Added "${picked[0]}" — will scan during keyword pulls`
            : `Added ${picked.length} folders — they'll be scanned during keyword pulls`,
          {
            description:
              "Open a case → Evidence → Pull evidence by keyword to run the scan now.",
          }
        );
        return;
      }
      // Browser fallback — no native dialog available.
      toast.message("Folder picker requires the LARO Desktop app", {
        description: "Run the app with Electron to pick local folders.",
      });
    } catch {
      toast.error("Could not open the folder picker");
    }
  }, []);

  const removeScannerFolder = (p: string) => {
    const next = scannerFolders.filter((x) => x !== p);
    writeDefaultFolders(next);
    setScannerFolders(next);
  };

  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsTesting(true);
    try {
      const result = await testEmailMutation.mutateAsync({
        to: testEmail,
        subject: "LARO Email Service Test",
      });

      if (result.success) {
        const message =
          providerInfo?.provider === "console"
            ? "Test email logged to console (check server logs)"
            : "Test email sent successfully! Check your inbox.";
        toast.success(message);
      } else {
        toast.error(`Failed to send test email: ${(result as { error?: string }).error ?? "Unknown"}`);
      }
    } catch (error) {
      toast.error(`Error sending test email: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsTesting(false);
    }
  };

  const downloadJsonFile = (name: string, payload: unknown) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getProviderStatusBadge = () => {
    if (!providerInfo) return null;

    if (providerInfo.configured) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Configured
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Not Configured
      </Badge>
    );
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case "sendgrid":
        return "SendGrid";
      case "ses":
        return "AWS SES";
      case "smtp":
        return "SMTP";
      case "console":
        return "Console (Development)";
      default:
        return provider;
    }
  };

  const activeMeta = useMemo(() => NAV_ITEMS.find((n) => n.id === section), [section]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Configure system preferences and integrations
          </p>
        </div>

        <div className="space-y-4">
          <Card className="border-border/50 bg-card/40">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = section === item.id;
                  return (
                    <Button
                      key={item.id}
                      variant={active ? "default" : "outline"}
                      className={active ? "bg-orange-500 hover:bg-orange-600" : ""}
                      onClick={() => setSection(item.id)}
                    >
                      <Icon className="h-4 w-4 mr-2 shrink-0" />
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="min-w-0 space-y-5">
            {activeMeta && (
              <div className="rounded-lg border border-border/50 bg-card/30 px-4 py-3">
                <p className="text-sm font-medium text-foreground">{activeMeta.label}</p>
                <p className="text-xs text-muted-foreground">{activeMeta.description}</p>
              </div>
            )}

            {section === "personalization" && (
              <Card className="border-border/50 bg-card/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">Personalization</CardTitle>
                  <CardDescription className="mt-2">
                    Keep this page lightweight: quick UI and behavior preferences only.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-border/50 p-4">
                      <p className="text-sm font-medium mb-1">Compact spacing</p>
                      <p className="text-xs text-muted-foreground mb-3">Shows denser lists and cards.</p>
                      <Switch checked={true} disabled />
                    </div>
                    <div className="rounded-lg border border-border/50 p-4">
                      <p className="text-sm font-medium mb-1">Assistant follow-up prompts</p>
                      <p className="text-xs text-muted-foreground mb-3">Ask clarifying questions when context is missing.</p>
                      <Switch checked={true} disabled />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 border-t pt-3">
                    <Button variant="outline" onClick={() => setSection("notifications")}>
                      Notifications
                    </Button>
                    <Button variant="outline" onClick={() => setSection("email")}>
                      Email Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {section === "email" && (
              <Card className="border-border/50 bg-card/50 shadow-sm">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-2xl">Email Service Configuration</CardTitle>
                      <CardDescription className="mt-2">
                        Configure and test your email service provider
                      </CardDescription>
                    </div>
                    {getProviderStatusBadge()}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-base">Current Provider</Label>
                      <p className="text-sm font-semibold text-foreground">
                        {providerInfo ? getProviderName(providerInfo.provider) : "Loading…"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-base">From Address</Label>
                      <p className="text-sm font-semibold text-foreground">
                        {providerInfo?.from || "Not configured"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-base">Status</Label>
                      <p className="text-sm font-semibold text-foreground">
                        {providerInfo?.configured ? "Ready to send" : "Configuration needed"}
                      </p>
                    </div>
                  </div>

                  {providerInfo && !providerInfo.configured && providerInfo.missingVars?.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Missing environment variables: <strong>{providerInfo.missingVars.join(", ")}</strong>
                        <br />
                        Configure these in your environment or <code className="rounded bg-muted px-1">.env</code> file.
                      </AlertDescription>
                    </Alert>
                  )}

                  {providerInfo?.provider === "console" && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Development mode:</strong> Emails are logged to the server console, not delivered.
                        Set <code className="rounded bg-muted px-1 py-0.5">EMAIL_PROVIDER</code> and provider keys for
                        production.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4 border-t pt-4">
                    <div>
                      <Label htmlFor="test-email" className="text-base">
                        Test email address
                      </Label>
                      <p className="mt-1 mb-3 text-sm text-muted-foreground">
                        Send a test message to verify configuration
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          id="test-email"
                          type="email"
                          placeholder="your-email@example.com"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleTestEmail()}
                          className="max-w-md"
                        />
                        <Button onClick={handleTestEmail} disabled={isTesting || !testEmail}>
                          {isTesting ? (
                            "Sending…"
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              Send test
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {section === "outreach" && (
              <div className="space-y-4">
                <Card className="border-border/50 bg-card/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-2xl">Outreach Settings</CardTitle>
                    <CardDescription className="mt-2">
                      Configure automated lawyer outreach parameters
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1.5 rounded-lg border border-border/40 p-3">
                        <Label htmlFor="follow-up-interval" className="text-sm">
                          Follow-up interval (days)
                        </Label>
                        <Input
                          id="follow-up-interval"
                          type="number"
                          className="max-w-[220px]"
                          value={outreach.followUpIntervalDays}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (!Number.isFinite(v)) return;
                            updateWorkbench.mutate({ outreach: { followUpIntervalDays: v } });
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          Days between follow-up emails (Day 0, 5, 10, 15)
                        </p>
                      </div>
                      <div className="space-y-1.5 rounded-lg border border-border/40 p-3">
                        <Label htmlFor="max-follow-ups" className="text-sm">
                          Maximum follow-ups
                        </Label>
                        <Input
                          id="max-follow-ups"
                          type="number"
                          className="max-w-[220px]"
                          value={outreach.maxFollowUps}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (!Number.isFinite(v)) return;
                            updateWorkbench.mutate({ outreach: { maxFollowUps: v } });
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          Total follow-ups before marking as &quot;No Response&quot;
                        </p>
                      </div>
                      <div className="space-y-1.5 rounded-lg border border-border/40 p-3">
                        <Label htmlFor="filter-threshold" className="text-sm">
                          Permanent filter threshold
                        </Label>
                        <Input
                          id="filter-threshold"
                          type="number"
                          className="max-w-[220px]"
                          value={outreach.filterThreshold}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (!Number.isFinite(v)) return;
                            updateWorkbench.mutate({ outreach: { filterThreshold: v } });
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          Contacts with 0% response before filtering (6 months)
                        </p>
                      </div>
                      <div className="space-y-1.5 rounded-lg border border-border/40 p-3">
                        <Label htmlFor="batch-limit" className="text-sm">
                          Batch processing limit
                        </Label>
                        <Input
                          id="batch-limit"
                          type="number"
                          className="max-w-[220px]"
                          value={outreach.batchLimit}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (!Number.isFinite(v)) return;
                            updateWorkbench.mutate({ outreach: { batchLimit: v } });
                          }}
                        />
                        <p className="text-xs text-muted-foreground">Maximum lawyers to contact per case</p>
                      </div>
                    </div>
                    <p className="flex items-center text-sm font-medium text-muted-foreground">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      Changes are saved automatically
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-2xl">Scraper</CardTitle>
                    <CardDescription className="mt-2">
                      Configure how often LARO refreshes its lawyer database.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5 rounded-lg border border-border/40 p-3 max-w-md">
                      <Label className="text-sm">Scraping schedule</Label>
                      <Input
                        ref={scraperScheduleInputRef}
                        value={outreach.scraperSchedule}
                        onChange={(e) =>
                          updateWorkbench.mutate({ outreach: { scraperSchedule: e.target.value } })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Saved automatically as you type.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {section === "notifications" && (
              <Card className="border-border/50 bg-card/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">Notification Preferences</CardTitle>
                  <CardDescription className="mt-2">Manage how and when you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="notify-match" className="text-base font-medium">
                          Lawyer match notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when a lawyer shows interest in your case
                        </p>
                      </div>
                      <Switch
                        id="notify-match"
                        checked={toggles.lawyerMatch}
                        className="border border-white/25 bg-slate-700 data-[state=checked]:bg-orange-500"
                        onCheckedChange={(v: boolean) =>
                          updateWorkbench.mutate({ quickNotificationToggles: { lawyerMatch: v } })
                        }
                      />
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="notify-email" className="text-base font-medium">
                          Email activity notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified of email responses and outreach activity
                        </p>
                      </div>
                      <Switch
                        id="notify-email"
                        checked={toggles.emailActivity}
                        className="border border-white/25 bg-slate-700 data-[state=checked]:bg-orange-500"
                        onCheckedChange={(v: boolean) =>
                          updateWorkbench.mutate({ quickNotificationToggles: { emailActivity: v } })
                        }
                      />
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="notify-case" className="text-base font-medium">
                          New case notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">Get notified when new cases are added</p>
                      </div>
                      <Switch
                        id="notify-case"
                        checked={toggles.newCase}
                        className="border border-white/25 bg-slate-700 data-[state=checked]:bg-orange-500"
                        onCheckedChange={(v: boolean) =>
                          updateWorkbench.mutate({ quickNotificationToggles: { newCase: v } })
                        }
                      />
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="notify-scraper" className="text-base font-medium">
                          Scraper notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">Get notified of weekly scraper runs</p>
                      </div>
                      <Switch
                        id="notify-scraper"
                        checked={toggles.scraper}
                        className="border border-white/25 bg-slate-700 data-[state=checked]:bg-orange-500"
                        onCheckedChange={(v: boolean) =>
                          updateWorkbench.mutate({ quickNotificationToggles: { scraper: v } })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {section === "system" && (
              <div className="space-y-4">
                <Card className="border-border/50 bg-card/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-2xl">System Configuration</CardTitle>
                    <CardDescription className="mt-2">General system settings and preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="geo-range" className="text-base">
                          Geographic range limit (km)
                        </Label>
                        <Input id="geo-range" type="number" defaultValue="50" className="max-w-xs" />
                        <p className="text-sm text-muted-foreground">Maximum distance for lawyer matching</p>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="auto-match" className="text-base font-medium">
                            Automatic matching
                          </Label>
                          <p className="text-sm text-muted-foreground">Automatically match cases with lawyers</p>
                        </div>
                        <Switch id="auto-match" defaultChecked />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <EvidenceConnectionsCard />

                <Card className="border-border/50 bg-card/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl">Local Computer Scanner</CardTitle>
                    <CardDescription>
                      Pick folders on this computer that LARO should scan for
                      evidence when you run a keyword pull on a case.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="border-purple-500/30 font-semibold"
                      onClick={openScanner}
                    >
                      <HardDrive className="mr-2 h-4 w-4 text-purple-500" />
                      Add folder to scan
                    </Button>

                    {scannerFolders.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No folders selected. Add one or more — they'll be
                        included automatically when you click "Pull evidence by
                        keyword" inside a case.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {scannerFolders.map((p) => (
                          <div
                            key={p}
                            className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-background/50 px-3 py-1.5 text-sm"
                          >
                            <span className="truncate" title={p}>
                              {p}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-muted-foreground hover:text-destructive"
                              onClick={() => removeScannerFolder(p)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {section === "security" && (
              <Card className="border-border/50 bg-card/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">Security &amp; Privacy</CardTitle>
                  <CardDescription className="mt-2">Manage security settings and data privacy</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-3 rounded-lg border border-border/50 p-4">
                      <Label className="text-base">Data export</Label>
                      <p className="text-sm text-muted-foreground">Export all system data</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={isExportingSecurityData}
                        onClick={async () => {
                          setIsExportingSecurityData(true);
                          try {
                            const data = await exportDataMutation.mutateAsync();
                            downloadJsonFile(
                              `laro-security-export-${new Date().toISOString().slice(0, 10)}.json`,
                              data
                            );
                            toast.success("Security export downloaded");
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Export failed");
                          } finally {
                            setIsExportingSecurityData(false);
                          }
                        }}
                      >
                        {isExportingSecurityData ? "Exporting..." : "Export data"}
                      </Button>
                    </div>
                    <div className="space-y-3 rounded-lg border border-border/50 p-4">
                      <Label className="text-base">Activity logs</Label>
                      <p className="text-sm text-muted-foreground">View system activity logs</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          const logPayload = {
                            generatedAt: new Date().toISOString(),
                            health: healthInfo ?? null,
                            emailProvider: providerInfo ?? null,
                          };
                          downloadJsonFile(
                            `laro-activity-log-${new Date().toISOString().slice(0, 10)}.json`,
                            logPayload
                          );
                          toast.success("Activity log snapshot downloaded");
                        }}
                      >
                        View logs
                      </Button>
                    </div>
                    <div className="space-y-3 rounded-lg border border-border/50 p-4 sm:col-span-2">
                      <Label className="text-base">Backup &amp; restore</Label>
                      <p className="text-sm text-muted-foreground">Backup or restore system data</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={isCreatingBackup}
                        onClick={async () => {
                          setIsCreatingBackup(true);
                          try {
                            const data = await exportDataMutation.mutateAsync();
                            downloadJsonFile(
                              `laro-backup-${Date.now()}.json`,
                              { type: "full-backup", data, createdAt: new Date().toISOString() }
                            );
                            toast.success("Backup file created");
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Backup failed");
                          } finally {
                            setIsCreatingBackup(false);
                          }
                        }}
                      >
                        {isCreatingBackup ? "Creating..." : "Create backup"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
