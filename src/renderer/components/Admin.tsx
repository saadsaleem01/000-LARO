import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Briefcase, 
  Mail, 
  Settings, 
  Search,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Database,
  BarChart3
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { exportLawyersToCSV, exportLawyersToJSON, exportCasesToCSV, exportCasesToJSON } from "@/lib/export";
import { Download } from "lucide-react";

/**
 * Admin Panel
 * 
 * Centralized management interface for:
 * - Lawyers database (view, edit, filter)
 * - Cases management (all users)
 * - Email automation monitoring
 * - System configuration
 * - Analytics and reports
 * 
 * Access: Admin role only
 */
export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  // Redirect non-admin users
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-500">
              <Shield className="w-6 h-6" />
              <CardTitle>Access Denied</CardTitle>
            </div>
            <CardDescription>
              You need administrator privileges to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: stats } = trpc.dashboard.stats.useQuery();
  const { data: lawyersData } = trpc.lawyers.list.useQuery({ page: 1, limit: 100 });
  const { data: casesData } = trpc.cases.list.useQuery({ page: 1, limit: 100 });

  const lawyers = lawyersData?.lawyers || [];
  const cases = casesData?.cases || [];

  // Filter lawyers by search term
  const filteredLawyers = lawyers.filter(lawyer =>
    lawyer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lawyer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lawyer.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Shield className="w-8 h-8 text-orange-500" />
                Admin Panel
              </h1>
              <p className="text-muted-foreground mt-1">
                System management and monitoring
              </p>
            </div>
            <Badge variant="outline" className="border-orange-500 text-orange-500">
              Administrator
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="container py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Lawyers</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.totalLawyers || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Cases</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.totalCases || 0}</p>
                </div>
                <Briefcase className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Emails Sent</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.emailStats?.totalSent || 0}</p>
                </div>
                <Mail className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Response Rate</p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats?.emailStats?.responseRate || 0}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="lawyers" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="lawyers">
              <Users className="w-4 h-4 mr-2" />
              Lawyers
            </TabsTrigger>
            <TabsTrigger value="cases">
              <Briefcase className="w-4 h-4 mr-2" />
              Cases
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              Email Activity
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="enrichment">
              <Database className="w-4 h-4 mr-2" />
              Data Enrichment
            </TabsTrigger>
            <TabsTrigger value="system">
              <Settings className="w-4 h-4 mr-2" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Lawyers Tab */}
          <TabsContent value="lawyers" className="space-y-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Lawyers Database</CardTitle>
                    <CardDescription>
                      Manage and monitor lawyer profiles
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search lawyers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => exportLawyersToCSV(lawyers)}
                      className="border-green-500/30 hover:bg-green-500/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => exportLawyersToJSON(lawyers)}
                      className="border-blue-500/30 hover:bg-blue-500/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export JSON
                    </Button>
                    <Button onClick={() => setLocation("/lawyers")}>
                      View Full Database
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredLawyers.slice(0, 10).map((lawyer) => (
                    <div
                      key={lawyer.id}
                      className="p-4 rounded-lg border border-border/50 bg-background/50 hover:bg-background/80 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{lawyer.name}</h4>
                          <p className="text-sm text-muted-foreground">{lawyer.email}</p>
                          <p className="text-sm text-muted-foreground">{lawyer.city}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            variant={lawyer.currentlyAccepting === "Yes" ? "default" : "secondary"}
                            className={lawyer.currentlyAccepting === "Yes" ? "bg-green-500" : ""}
                          >
                            {lawyer.currentlyAccepting === "Yes" ? "Accepting Cases" : "Not Accepting"}
                          </Badge>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{lawyer.totalResponses || 0} responses</span>
                            <span>•</span>
                            <span>{lawyer.totalOutreaches || 0} contacted</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredLawyers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No lawyers found matching your search.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cases Tab */}
          <TabsContent value="cases" className="space-y-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Cases</CardTitle>
                    <CardDescription>
                      Monitor all cases across all users
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => exportCasesToCSV(cases)}
                      className="border-green-500/30 hover:bg-green-500/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => exportCasesToJSON(cases)}
                      className="border-blue-500/30 hover:bg-blue-500/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export JSON
                    </Button>
                    <Button onClick={() => setLocation("/cases")}>
                      View All Cases
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cases.slice(0, 10).map((caseItem: any) => (
                    <div
                      key={caseItem.id}
                      className="p-4 rounded-lg border border-border/50 bg-background/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{caseItem.clientName}</h4>
                          <p className="text-sm text-muted-foreground">{caseItem.caseType}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created: {new Date(caseItem.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            variant={
                              caseItem.status === "Matched" ? "default" :
                              caseItem.status === "Outreach" ? "secondary" :
                              "outline"
                            }
                            className={
                              caseItem.status === "Matched" ? "bg-green-500" :
                              caseItem.status === "Outreach" ? "bg-blue-500" :
                              ""
                            }
                          >
                            {caseItem.status}
                          </Badge>
                          <Badge variant="outline">
                            {caseItem.urgency} Priority
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Activity Tab */}
          <TabsContent value="email" className="space-y-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Email Automation</CardTitle>
                    <CardDescription>
                      Monitor outreach campaigns and responses
                    </CardDescription>
                  </div>
                  <Button onClick={() => setLocation("/email-automation")}>
                    View Details
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-3">
                      <Mail className="w-8 h-8 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Sent</p>
                        <p className="text-2xl font-bold text-foreground">
                          {stats?.emailStats?.totalSent || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Responses</p>
                        <p className="text-2xl font-bold text-foreground">
                          {stats?.emailStats?.totalResponses || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-3">
                      <Clock className="w-8 h-8 text-yellow-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <p className="text-2xl font-bold text-foreground">
                          {(stats?.emailStats?.total || 0) - (stats?.emailStats?.responded || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>
                  Manage system settings and configurations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border border-border/50 bg-background/50">
                  <div className="flex items-center gap-3">
                    <Database className="w-6 h-6 text-blue-500" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">Database</h4>
                      <p className="text-sm text-muted-foreground">
                        {stats?.totalLawyers || 0} lawyers, {stats?.totalCases || 0} cases
                      </p>
                    </div>
                    <Badge variant="outline" className="border-green-500 text-green-500">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border/50 bg-background/50">
                  <div className="flex items-center gap-3">
                    <Mail className="w-6 h-6 text-purple-500" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">Email Service</h4>
                      <p className="text-sm text-muted-foreground">
                        Configure in Settings page
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setLocation("/settings")}>
                      Configure
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-orange-500/20 bg-orange-500/10">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-orange-500" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">Geocoding</h4>
                      <p className="text-sm text-muted-foreground">
                        Run geocoding script to update lawyer coordinates
                      </p>
                    </div>
                    <Button variant="outline">
                      Run Script
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>System Analytics</CardTitle>
                <CardDescription>
                  Usage metrics and engagement statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    View detailed analytics on the dedicated Analytics page
                  </p>
                  <Button onClick={() => setLocation("/analytics")}>
                    Open Analytics Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Enrichment Tab */}
          <TabsContent value="enrichment" className="space-y-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Data Enrichment</CardTitle>
                <CardDescription>
                  Autonomous system that keeps lawyer database up-to-date
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    View detailed enrichment statistics and controls on the dedicated page
                  </p>
                  <Button onClick={() => setLocation("/admin/enrichment")}>
                    Open Data Enrichment Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

