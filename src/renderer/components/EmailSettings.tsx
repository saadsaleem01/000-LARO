import React from "react";
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Mail, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

/**
 * Email Settings Page
 * Allows admin to connect Gmail or Outlook account for sending emails
 */
export default function EmailSettings() {
  const utils = trpc.useUtils();

  // Get list of connected accounts
  const { data: accounts, isLoading } = trpc.emailAccounts.list.useQuery();

  return (
    <DashboardLayout>
      <div>Email Settings</div>
    </DashboardLayout>
  );
}
