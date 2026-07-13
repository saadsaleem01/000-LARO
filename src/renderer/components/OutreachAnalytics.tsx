/**
 * Outreach Analytics Dashboard
 * 
 * Comprehensive analytics for outreach performance tracking
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Target,
  MapPin,
  Calendar,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];

export default function OutreachAnalytics() {
  const [timeRange, setTimeRange] = useState<string>("30");

  // Fetch analytics data
  const { data: overallMetrics, isLoading: metricsLoading } = trpc.outreachAnalytics.getOverallMetrics.useQuery();
  const { data: lawyerPerformance, isLoading: lawyersLoading } = trpc.outreachAnalytics.getResponseRateByLawyer.useQuery({ limit: 10 });
  const { data: legalAreaData, isLoading: legalAreaLoading } = trpc.outreachAnalytics.getTimeToMatchByLegalArea.useQuery();
  const { data: regionData, isLoading: regionLoading } = trpc.outreachAnalytics.getMatchSuccessByRegion.useQuery();
  const { data: trendsData, isLoading: trendsLoading } = trpc.outreachAnalytics.getPerformanceTrends.useQuery({ days: parseInt(timeRange) });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Outreach Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Track performance, response rates, and success metrics
            </p>
          </div>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Response Rate"
            value={overallMetrics?.overallResponseRate.toFixed(1) + "%"}
            icon={<TrendingUp className="h-4 w-4" />}
            trend={overallMetrics?.overallResponseRate > 50 ? "up" : "down"}
            loading={metricsLoading}
          />
          
          <MetricCard
            title="Acceptance Rate"
            value={overallMetrics?.acceptanceRate.toFixed(1) + "%"}
            icon={<Target className="h-4 w-4" />}
            trend={overallMetrics?.acceptanceRate > 60 ? "up" : "down"}
            loading={metricsLoading}
          />
          
          <MetricCard
            title="Avg Response Time"
            value={overallMetrics ? formatHours(overallMetrics.averageResponseTimeHours) : "-"}
            trend={overallMetrics && overallMetrics.averageResponseTimeHours < 48 ? "up" : "down"}
            loading={metricsLoading}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ title, value, icon, trend, loading }: any) {
  return (
    <Card>
      <CardHeader>{title}</CardHeader>
      <CardContent>{value}</CardContent>
    </Card>
  );
}

function formatHours(hours: number) {
  return `${hours}h`;
}