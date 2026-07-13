import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { FileText, HardDrive, Upload, Download } from "lucide-react";
import { formatFileSize } from "@/lib/utils";
import DashboardLayout from "@/components/DashboardLayout";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function EvidenceAnalytics() {
  const { data: stats, isLoading: statsLoading } = trpc.evidenceAnalytics.getStats.useQuery();
  const { data: fileTypeDistribution, isLoading: typeLoading } =
    trpc.evidenceAnalytics.getFileTypeDistribution.useQuery();
  const { data: uploadTimeline, isLoading: timelineLoading } =
    trpc.evidenceAnalytics.getUploadTimeline.useQuery({ days: 30 });
  const { data: storageByCase, isLoading: storageLoading } =
    trpc.evidenceAnalytics.getStorageByCase.useQuery();
  const { data: uploadSourceBreakdown, isLoading: sourceLoading } =
    trpc.evidenceAnalytics.getUploadSourceBreakdown.useQuery();

  if (statsLoading || typeLoading || timelineLoading || storageLoading || sourceLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Evidence Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive insights into your evidence collection
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Files</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalFiles || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Evidence files collected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatFileSize(parseInt(stats?.totalSize || "0"))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Space used
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Manual Uploads</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.manualUploads || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Files uploaded manually
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agent Uploads</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.agentUploads || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Files collected by agent
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Timeline</CardTitle>
              <CardDescription>Files uploaded per day (last 30 days)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={uploadTimeline || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Files"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* File Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>File Type Distribution</CardTitle>
              <CardDescription>Breakdown by file type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={fileTypeDistribution || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ fileType, count }) => `${fileType}: ${count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {(fileTypeDistribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Storage by Case */}
          <Card>
            <CardHeader>
              <CardTitle>Storage by Case</CardTitle>
              <CardDescription>Top 10 cases by storage usage</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={storageByCase || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="caseId" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatFileSize(value)}
                  />
                  <Legend />
                  <Bar dataKey="totalSize" fill="#10b981" name="Storage (bytes)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Upload Source Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Source Breakdown</CardTitle>
              <CardDescription>Manual vs Agent uploads</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={uploadSourceBreakdown || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ uploadSource, count }) => `${uploadSource}: ${count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {(uploadSourceBreakdown || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
