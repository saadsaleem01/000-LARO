import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Users, Mail, CheckCircle, XCircle, Clock } from "lucide-react";

export default function Analytics() {
  const { data: stats, isLoading } = trpc.analytics.getOverallStats.useQuery();
  const { data: outreachTrends } = trpc.analytics.getOutreachTrends.useQuery();
  const { data: lawyerPerformance } = trpc.analytics.getLawyerPerformance.useQuery();
  const { data: legalAreaDistribution } = trpc.analytics.getLegalAreaDistribution.useQuery();
  const { data: lawyerCapacity } = trpc.analytics.getLawyerCapacity.useQuery();
  const { data: caseDistribution } = trpc.analytics.getCaseDistribution.useQuery();
  const { data: workloadMetrics } = trpc.analytics.getWorkloadMetrics.useQuery();

  if (isLoading) {
    return <div className="p-6">Loading analytics...</div>;
  }

  const COLORS = ["#10b981", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899"];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Outreach performance and system metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outreaches</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOutreaches || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.outreachesThisWeek || 0} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.responseRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalResponses || 0} responses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.acceptanceRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalAcceptances || 0} accepted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgResponseTime || 0}h</div>
            <p className="text-xs text-muted-foreground">
              Median: {stats?.medianResponseTime || 0}h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Outreach Trends Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Outreach Trends</CardTitle>
          <CardDescription>Daily outreach activity over the past 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={outreachTrends || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sent" stroke="#3b82f6" name="Sent" />
              <Line type="monotone" dataKey="responses" stroke="#10b981" name="Responses" />
              <Line type="monotone" dataKey="accepted" stroke="#8b5cf6" name="Accepted" />
              <Line type="monotone" dataKey="declined" stroke="#ef4444" name="Declined" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Lawyer Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Lawyers</CardTitle>
            <CardDescription>By response rate and acceptance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={lawyerPerformance || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="responseRate" fill="#10b981" name="Response Rate %" />
                <Bar dataKey="acceptanceRate" fill="#3b82f6" name="Acceptance Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Legal Area Distribution</CardTitle>
            <CardDescription>Cases by legal area</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={legalAreaDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(legalAreaDistribution || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Outreach Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Outreach Status Breakdown</CardTitle>
          <CardDescription>Current status of all outreach attempts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Contacted</p>
                <p className="text-2xl font-bold">{stats?.statusBreakdown?.contacted || 0}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Awaiting Response</p>
                <p className="text-2xl font-bold">{stats?.statusBreakdown?.awaiting || 0}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Interested</p>
                <p className="text-2xl font-bold">{stats?.statusBreakdown?.interested || 0}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Declined</p>
                <p className="text-2xl font-bold">{stats?.statusBreakdown?.declined || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Case-Load Tracking Dashboard */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Case-Load Tracking</h2>
          <p className="text-muted-foreground">Monitor lawyer capacity and case distribution</p>
        </div>

        {/* Workload Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Case Load</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workloadMetrics?.avgCaseLoad || 0}</div>
              <p className="text-xs text-muted-foreground">cases per lawyer</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">At Capacity</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{workloadMetrics?.lawyersAtCapacity || 0}</div>
              <p className="text-xs text-muted-foreground">lawyers ≥80% capacity</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepting Cases</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{workloadMetrics?.lawyersAccepting || 0}</div>
              <p className="text-xs text-muted-foreground">lawyers available</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Outreach</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{workloadMetrics?.activeOutreach || 0}</div>
              <p className="text-xs text-muted-foreground">pending contacts</p>
            </CardContent>
          </Card>
        </div>

        {/* Lawyer Capacity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Lawyer Capacity Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={lawyerCapacity || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="capacity" fill="#f59e0b" name="Capacity %" />
                <Bar dataKey="caseLoad" fill="#3b82f6" name="Case Load" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Case Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Cases by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={caseDistribution?.byStatus || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.status}: ${entry.count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {(caseDistribution?.byStatus || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cases by Urgency</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={caseDistribution?.byUrgency || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="urgency" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

