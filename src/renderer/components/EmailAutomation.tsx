import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, Clock, CheckCircle2, XCircle, TrendingUp, Activity, FileText } from "lucide-react";
import { EmailTemplateEditor } from "@/components/EmailTemplateEditor";

export default function EmailAutomation() {
  // TODO: Implement email router in backend
  // const { data: emailActivity } = trpc.email.recentActivity.useQuery();
  const emailActivity: any[] = [];

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
            Email Automation
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Monitor and manage automated lawyer outreach campaigns
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-orange-500/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sent
              </CardTitle>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Send className="w-5 h-5 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">4</div>
              <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +15% from last week
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-green-500/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Responses
              </CardTitle>
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">3</div>
              <p className="text-xs text-green-500 mt-2">
                75% response rate
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">1</div>
              <p className="text-xs text-muted-foreground mt-2">
                Awaiting response
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Success Rate
              </CardTitle>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">50%</div>
              <p className="text-xs text-green-500 mt-2">
                Interested lawyers
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList className="grid grid-cols-3 bg-muted/50 backdrop-blur-sm">
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity Log
            </TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            {/* Campaign Actions */}
            <div className="flex justify-end gap-4">
              <Button variant="outline" className="bg-card/50 backdrop-blur-sm">
                Import Lawyers
              </Button>
              <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/20">
                Create Campaign
              </Button>
            </div>

            {/* Campaign List */}
            <div className="space-y-4">
              {emailActivity.length === 0 ? (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Mail className="w-16 h-16 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Campaigns Yet</h3>
                    <p className="text-muted-foreground mb-6">Create your first email campaign to start connecting with lawyers</p>
                    <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                      Create First Campaign
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                emailActivity.map((activity: any, index: number) => (
                  <Card key={index} className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/10">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-lg ${activity.status === 'completed' ? 'bg-green-500/10' : activity.status === 'running' ? 'bg-blue-500/10' : 'bg-yellow-500/10'}`}>
                            {activity.status === 'completed' ? (
                              <CheckCircle2 className="w-6 h-6 text-green-500" />
                            ) : activity.status === 'running' ? (
                              <Clock className="w-6 h-6 text-blue-500 animate-spin" />
                            ) : (
                              <Clock className="w-6 h-6 text-yellow-500" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{activity.campaignName}</h3>
                            <p className="text-sm text-muted-foreground">{activity.targetAudience}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className={activity.status === 'completed' ? 'border-green-500 text-green-500' : activity.status === 'running' ? 'border-blue-500 text-blue-500' : 'border-yellow-500 text-yellow-500'}>
                            {activity.status === 'completed' ? 'Completed' : activity.status === 'running' ? 'Running' : 'Draft'}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-border/50 pt-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Sent</p>
                          <p className="font-semibold">{activity.sent}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Opened</p>
                          <p className="font-semibold">{activity.opened}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Responded</p>
                          <p className="font-semibold">{activity.responded}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Rate</p>
                          <p className="font-semibold">{activity.responseRate}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="flex justify-end">
              <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/20">
                Create Template
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Placeholder Templates */}
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 rounded-lg bg-orange-500/10">
                        <FileText className="w-5 h-5 text-orange-500" />
                      </div>
                      <Badge variant="outline" className="border-green-500 text-green-500">Active</Badge>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Template {i}</h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      This is a template for introducing your services to potential clients. It's designed to be professional and engaging.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">Edit</Button>
                      <Button variant="destructive" size="sm" className="flex-1">Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity" className="space-y-6">
            <div className="flex justify-end gap-4">
              <Button variant="outline" className="bg-card/50 backdrop-blur-sm">
                Export Log
              </Button>
              <Button variant="outline" className="bg-card/50 backdrop-blur-sm">
                Clear Log
              </Button>
            </div>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-12 flex flex-col items-center justify-center">
                <Activity className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Activity Log Empty</h3>
                <p className="text-muted-foreground">Automated activities and system events will appear here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
