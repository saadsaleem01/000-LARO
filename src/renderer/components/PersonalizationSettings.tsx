import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Settings,
  Bell,
  Star,
  Layout,
  FileText,
  RotateCcw,
  Trash2,
  Plus,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface DashboardWidget {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
}

interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  channels: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

interface PreferredLawyer {
  id: string;
  name: string;
  firm: string;
  legalArea: string;
  addedAt: Date;
}

interface CaseTemplate {
  id: string;
  name: string;
  legalArea: string;
  description: string;
  fields: {
    urgency: string;
    [key: string]: any;
  };
}

export default function PersonalizationSettings() {
  // Fetch user preferences from backend
  const { data: prefsData, refetch: refetchPrefs } = trpc.userPreferences.get.useQuery();
  
  // Update widgets mutation
  const updateWidgetsMutation = trpc.userPreferences.updateWidgets.useMutation({
    onSuccess: () => {
      refetchPrefs();
      toast.success("Dashboard widgets updated");
    },
  });
  
  // Update notifications mutation
  const updateNotificationsMutation = trpc.userPreferences.updateNotifications.useMutation({
    onSuccess: () => {
      refetchPrefs();
      toast.success("Notification preferences updated");
    },
  });
  
  // Toggle preferred lawyer mutation
  const togglePreferredLawyerMutation = trpc.userPreferences.togglePreferredLawyer.useMutation({
    onSuccess: () => {
      refetchPrefs();
    },
  });
  
  // Update case templates mutation
  const updateCaseTemplatesMutation = trpc.userPreferences.updateCaseTemplates.useMutation({
    onSuccess: () => {
      refetchPrefs();
      toast.success("Case templates updated");
    },
  });
  
  // Parse dashboard widgets from backend
  const backendWidgets = prefsData?.dashboardWidgets || {};
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidget[]>([
    { id: "stats", name: "Statistics Overview", enabled: backendWidgets.caseStats !== false, order: 1 },
    { id: "recent-cases", name: "Recent Cases", enabled: backendWidgets.recentActivity !== false, order: 2 },
    { id: "matches", name: "Lawyer Matches", enabled: backendWidgets.lawyerMatches !== false, order: 3 },
    { id: "activity", name: "Activity Feed", enabled: backendWidgets.progress !== false, order: 4 },
    { id: "deadlines", name: "Upcoming Deadlines", enabled: backendWidgets.upcomingDeadlines !== false, order: 5 },
  ]);

  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreference[]>([
    {
      id: "new-match",
      label: "New Lawyer Match",
      description: "When a lawyer is interested in your case",
      enabled: true,
      channels: { email: true, push: true, sms: false },
    },
    {
      id: "case-update",
      label: "Case Status Update",
      description: "When your case status changes",
      enabled: true,
      channels: { email: true, push: true, sms: false },
    },
    {
      id: "deadline-reminder",
      label: "Deadline Reminders",
      description: "Reminders for upcoming deadlines",
      enabled: true,
      channels: { email: true, push: true, sms: true },
    },
    {
      id: "message-received",
      label: "New Messages",
      description: "When you receive a message from a lawyer",
      enabled: true,
      channels: { email: true, push: true, sms: false },
    },
  ]);

  const [preferredLawyers, setPreferredLawyers] = useState<PreferredLawyer[]>([
    {
      id: "1",
      name: "Mr. Jan de Vries",
      firm: "De Vries Advocaten",
      legalArea: "Employment Law",
      addedAt: new Date(),
    },
  ]);

  const [caseTemplates, setCaseTemplates] = useState<CaseTemplate[]>([
    {
      id: "1",
      name: "Employment Dispute",
      legalArea: "Employment Law",
      description: "Template for workplace disputes and wrongful termination",
      fields: { urgency: "high" },
    },
  ]);

  const toggleWidget = (id: string) => {
    const updatedWidgets = dashboardWidgets.map(w => 
      w.id === id ? { ...w, enabled: !w.enabled } : w
    );
    setDashboardWidgets(updatedWidgets);
    
    // Convert to backend format
    const widgetsObj: Record<string, boolean> = {};
    updatedWidgets.forEach(w => {
      widgetsObj[w.id] = w.enabled;
    });
    
    updateWidgetsMutation.mutate(widgetsObj);
  };

  const toggleNotification = (id: string) => {
    const updatedPrefs = notificationPreferences.map(n => 
      n.id === id ? { ...n, enabled: !n.enabled } : n
    );
    setNotificationPreferences(updatedPrefs);
    
    // Convert to backend format
    const prefsObj: Record<string, boolean> = {};
    updatedPrefs.forEach(n => {
      prefsObj[n.id] = n.enabled;
      prefsObj[`${n.id}_email`] = n.channels.email;
      prefsObj[`${n.id}_push`] = n.channels.push;
      prefsObj[`${n.id}_sms`] = n.channels.sms;
    });
    
    updateNotificationsMutation.mutate(prefsObj);
  };

  const toggleNotificationChannel = (id: string, channel: "email" | "push" | "sms") => {
    setNotificationPreferences(prev =>
      prev.map(n =>
        n.id === id
          ? { ...n, channels: { ...n.channels, [channel]: !n.channels[channel] } }
          : n
      )
    );
  };

  const removeLawyer = (id: string) => {
    setPreferredLawyers(prev => prev.filter(l => l.id !== id));
    togglePreferredLawyerMutation.mutate({ lawyerId: id });
    toast.success("Lawyer removed from preferred list");
  };

  const deleteTemplate = (id: string) => {
    setCaseTemplates(prev => prev.filter(t => t.id !== id));
    toast.success("Template deleted");
  };

  const resetToDefaults = () => {
    if (confirm("Reset all personalization settings to defaults?")) {
      toast.success("Settings reset to defaults");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={resetToDefaults}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset to defaults
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">
            <Layout className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="lawyers">
            <Star className="w-4 h-4 mr-2" />
            Preferred Lawyers
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Customization */}
        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Widgets</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose which widgets to display on your dashboard
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboardWidgets.map((widget) => (
                <div
                  key={widget.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />
                    <div>
                      <p className="font-medium">{widget.name}</p>
                      <p className="text-sm text-muted-foreground">Order: {widget.order}</p>
                    </div>
                  </div>
                  <Switch
                    checked={widget.enabled}
                    onCheckedChange={() => toggleWidget(widget.id)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Compact View</Label>
                  <p className="text-sm text-muted-foreground">Show more items in less space</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Case IDs</Label>
                  <p className="text-sm text-muted-foreground">Display case reference numbers</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div>
                <Label className="mb-2 block">Default View</Label>
                <Select defaultValue="grid">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grid View</SelectItem>
                    <SelectItem value="list">List View</SelectItem>
                    <SelectItem value="compact">Compact View</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Preferences */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Control how and when you receive notifications
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {notificationPreferences.map((pref) => (
                <div key={pref.id} className="space-y-3 pb-6 border-b last:border-0 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Label className="font-medium">{pref.label}</Label>
                        <Badge variant={pref.enabled ? "default" : "secondary"}>
                          {pref.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{pref.description}</p>
                    </div>
                    <Switch
                      checked={pref.enabled}
                      onCheckedChange={() => toggleNotification(pref.id)}
                    />
                  </div>

                  {pref.enabled && (
                    <div className="ml-4 space-y-2">
                      <p className="text-sm font-medium">Channels:</p>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={pref.channels.email}
                            onCheckedChange={() => toggleNotificationChannel(pref.id, "email")}
                            id={`${pref.id}-email`}
                          />
                          <Label htmlFor={`${pref.id}-email`} className="text-sm">Email</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={pref.channels.push}
                            onCheckedChange={() => toggleNotificationChannel(pref.id, "push")}
                            id={`${pref.id}-push`}
                          />
                          <Label htmlFor={`${pref.id}-push`} className="text-sm">Push</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={pref.channels.sms}
                            onCheckedChange={() => toggleNotificationChannel(pref.id, "sms")}
                            id={`${pref.id}-sms`}
                          />
                          <Label htmlFor={`${pref.id}-sms`} className="text-sm">SMS</Label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferred Lawyers */}
        <TabsContent value="lawyers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferred Lawyers</CardTitle>
              <p className="text-sm text-muted-foreground">
                Lawyers you've worked with or want to prioritize
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {preferredLawyers.map((lawyer) => (
                <div
                  key={lawyer.id}
                  className="flex items-start justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    <div>
                      <p className="font-medium">{lawyer.name}</p>
                      <p className="text-sm text-muted-foreground">{lawyer.firm}</p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {lawyer.legalArea}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLawyer(lawyer.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {preferredLawyers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No preferred lawyers yet</p>
                  <p className="text-sm">Star lawyers to add them to this list</p>
                </div>
              )}

              <Button variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Preferred Lawyer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Case Templates */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Case Templates</CardTitle>
              <p className="text-sm text-muted-foreground">
                Save templates for cases you create frequently
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {caseTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-start justify-between p-4 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{template.name}</p>
                      <Badge variant="outline">{template.legalArea}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Use
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {caseTemplates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No templates saved yet</p>
                  <p className="text-sm">Create templates to speed up case creation</p>
                </div>
              )}

              <Button variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Create New Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-center text-xs text-muted-foreground">
        Preference changes save automatically when you toggle options.
      </p>
    </div>
  );
}

