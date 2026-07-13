import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, DollarSign, Activity, Target, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';

/**
 * Admin Analytics Dashboard
 * Platform-wide metrics and insights for administrators
 */

export default function AdminAnalytics() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: overview, isLoading: overviewLoading } = trpc.adminAnalytics.overview.useQuery();
  const { data: usageMetrics, isLoading: usageLoading } = trpc.adminAnalytics.usageMetrics.useQuery();
  const { data: conversionFunnel, isLoading: conversionLoading } = trpc.adminAnalytics.conversionFunnel.useQuery();
  const { data: topUsers, isLoading: topUsersLoading } = trpc.adminAnalytics.topUsers.useQuery({ limit: 10 });
  const { data: featureUsage, isLoading: featureLoading } = trpc.adminAnalytics.featureUsage.useQuery();
  const { data: revenueOverTime, isLoading: revenueLoading } = trpc.adminAnalytics.revenueOverTime.useQuery({ months: 12 });

  // Redirect if not admin
  if (!loading && user?.role !== 'admin') {
    setLocation('/');
    return null;
  }

  if (loading || overviewLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Platform-wide metrics and insights
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overview?.activeUsers || 0} active (30 days)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${overview?.totalRevenue.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              All-time revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pro Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.usersByTier.find(t => t.tier === 'pro')?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {conversionFunnel?.conversionRate.toFixed(1)}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.usersByTier.find(t => t.tier === 'free')?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Potential conversions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Revenue Trend (Last 12 Months)
          </CardTitle>
          <CardDescription>
            Monthly revenue tracking with growth trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          {revenueLoading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="text-muted-foreground">Loading revenue data...</div>
            </div>
          ) : revenueOverTime && revenueOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={revenueOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Monthly Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              No revenue data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Resource Usage (This Month)
          </CardTitle>
          <CardDescription>
            Platform resource consumption by type
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usageLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {usageMetrics?.map(metric => (
                <div key={metric.resourceType} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{metric.resourceType.replace(/_/g, ' ').toUpperCase()}</p>
                    <p className="text-sm text-muted-foreground">
                      {metric.uniqueUsers} users
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{metric.totalQuantity.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      ${metric.totalCost.toFixed(2)} revenue
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Most Used Features
          </CardTitle>
          <CardDescription>
            Feature adoption and engagement metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {featureLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {featureUsage?.map(feature => (
                <div key={feature.feature} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{feature.feature.replace(/_/g, ' ').toUpperCase()}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min((feature.usageCount / (featureUsage[0]?.usageCount || 1)) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold">{feature.usageCount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{feature.uniqueUsers} users</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Top Users by Usage
          </CardTitle>
          <CardDescription>
            Highest spending users this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topUsersLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {topUsers?.map((user, index) => (
                <div key={user.userId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{user.userName}</p>
                      <p className="text-sm text-muted-foreground">{user.userEmail}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${user.totalCost.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.totalOperations} operations
                    </p>
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                      {user.tier}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Conversion Funnel
          </CardTitle>
          <CardDescription>
            Free to Pro tier conversion metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {conversionLoading ? (
            <div className="animate-pulse h-32 bg-gray-200 rounded"></div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold">{conversionFunnel?.freeUsers}</p>
                  <p className="text-sm text-muted-foreground">Free Tier</p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-blue-50">
                  <p className="text-2xl font-bold text-blue-600">{conversionFunnel?.proUsers}</p>
                  <p className="text-sm text-muted-foreground">Pro Tier</p>
                </div>
                <div className="text-center p-4 border rounded-lg bg-green-50">
                  <p className="text-2xl font-bold text-green-600">
                    {conversionFunnel?.conversionRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
