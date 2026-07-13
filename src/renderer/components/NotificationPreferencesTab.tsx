import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Bell, Mail, Smartphone, MessageSquare } from "lucide-react";

export function NotificationPreferencesTab() {
  const { data: preferences, isLoading } = trpc.userPreferences.get.useQuery();
  const updateNotificationsMutation = trpc.userPreferences.updateNotifications.useMutation();
  const utils = trpc.useUtils();

  const [notificationSettings, setNotificationSettings] = useState({
    newMessages: { email: true, push: true, inApp: true },
    caseStatusChanges: { email: true, push: true, inApp: true },
    evidenceAdded: { email: false, push: true, inApp: true },
    lawyerAssigned: { email: true, push: true, inApp: true },
    gapDetected: { email: false, push: false, inApp: true },
  });

  useEffect(() => {
    if (preferences?.notificationSettings) {
      setNotificationSettings(preferences.notificationSettings as any);
    }
  }, [preferences]);

  const handleToggle = async (event: string, channel: 'email' | 'push' | 'inApp') => {
    const newSettings = {
      ...notificationSettings,
      [event]: {
        ...notificationSettings[event as keyof typeof notificationSettings],
        [channel]: !notificationSettings[event as keyof typeof notificationSettings][channel],
      },
    };

    setNotificationSettings(newSettings);

    try {
      await updateNotificationsMutation.mutateAsync({ notificationSettings: newSettings });
      utils.userPreferences.get.invalidate();
      toast.success("Notification preferences updated");
    } catch (error) {
      toast.error("Failed to update preferences");
      // Revert on error
      setNotificationSettings(notificationSettings);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const events = [
    {
      id: 'newMessages',
      title: 'New Messages',
      description: 'When you receive a new message from a lawyer or the system',
    },
    {
      id: 'caseStatusChanges',
      title: 'Case Status Changes',
      description: 'When your case status is updated (e.g., active, matched, closed)',
    },
    {
      id: 'evidenceAdded',
      title: 'Evidence Added',
      description: 'When new evidence is uploaded to your case',
    },
    {
      id: 'lawyerAssigned',
      title: 'Lawyer Assigned',
      description: 'When a lawyer is assigned to your case',
    },
    {
      id: 'gapDetected',
      title: 'Evidence Gaps Detected',
      description: 'When the system detects missing evidence or documentation',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Notification Preferences</CardTitle>
        <CardDescription className="mt-2">
          Choose how you want to be notified for different events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground mb-4">
          <div>Event</div>
          <div className="flex items-center gap-2 justify-center">
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Email</span>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Push</span>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">In-App</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-6">
          {events.map((event) => (
            <div key={event.id} className="grid grid-cols-4 gap-4 items-center">
              <div className="space-y-1">
                <Label className="text-base font-medium">{event.title}</Label>
                <p className="text-sm text-muted-foreground">{event.description}</p>
              </div>
              <div className="flex justify-center">
                <Switch
                  checked={notificationSettings[event.id as keyof typeof notificationSettings].email}
                  onCheckedChange={() => handleToggle(event.id, 'email')}
                />
              </div>
              <div className="flex justify-center">
                <Switch
                  checked={notificationSettings[event.id as keyof typeof notificationSettings].push}
                  onCheckedChange={() => handleToggle(event.id, 'push')}
                />
              </div>
              <div className="flex justify-center">
                <Switch
                  checked={notificationSettings[event.id as keyof typeof notificationSettings].inApp}
                  onCheckedChange={() => handleToggle(event.id, 'inApp')}
                />
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="space-y-1">
            <p className="text-sm font-medium">Notification Channels</p>
            <p className="text-xs text-muted-foreground">
              Email: Sent to your registered email address • Push: Browser/mobile notifications • In-App: Toast notifications while using LARO
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

