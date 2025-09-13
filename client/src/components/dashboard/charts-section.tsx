import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";

// Mock data for charts - in a real app, this would come from the API
const mockMessageData = [
  { name: 'Mon', sent: 1200, delivered: 1140, failed: 60 },
  { name: 'Tue', sent: 1900, delivered: 1805, failed: 95 },
  { name: 'Wed', sent: 800, delivered: 764, failed: 36 },
  { name: 'Thu', sent: 2780, delivered: 2634, failed: 146 },
  { name: 'Fri', sent: 1890, delivered: 1796, failed: 94 },
  { name: 'Sat', sent: 2390, delivered: 2271, failed: 119 },
  { name: 'Sun', sent: 3490, delivered: 3316, failed: 174 },
];

const mockSuccessData = [
  { name: 'Delivered', value: 94.2, fill: 'hsl(var(--chart-2))' },
  { name: 'Failed', value: 5.8, fill: 'hsl(var(--destructive))' },
];

interface DashboardStats {
  deliveryRate: number;
}

export function ChartsSection() {
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/analytics/dashboard"],
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Message Analytics Chart */}
      <Card className="bg-card border border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle className="flex items-center gap-2" data-testid="message-analytics-title">
              <BarChart3 className="h-5 w-5" />
              Message Analytics
            </CardTitle>
            <CardDescription>Daily message delivery trends</CardDescription>
          </div>
          <Select defaultValue="7days">
            <SelectTrigger className="w-32" data-testid="select-message-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="h-64" data-testid="message-analytics-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockMessageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sent" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  name="Sent"
                />
                <Line 
                  type="monotone" 
                  dataKey="delivered" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  name="Delivered"
                />
                <Line 
                  type="monotone" 
                  dataKey="failed" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  name="Failed"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Success Rate */}
      <Card className="bg-card border border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle className="flex items-center gap-2" data-testid="success-rate-title">
              <PieChartIcon className="h-5 w-5" />
              Campaign Success Rate
            </CardTitle>
            <CardDescription>Message delivery success vs failure</CardDescription>
          </div>
          <div className="flex space-x-4">
            <div className="flex items-center text-sm">
              <div className="w-3 h-3 bg-chart-2 rounded-full mr-2"></div>
              <span className="text-muted-foreground">Delivered</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-3 h-3 bg-destructive rounded-full mr-2"></div>
              <span className="text-muted-foreground">Failed</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64" data-testid="success-rate-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockSuccessData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {mockSuccessData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Rate']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-4">
            <p className="text-2xl font-bold text-foreground" data-testid="overall-success-rate">
              {stats?.deliveryRate || 94.2}%
            </p>
            <p className="text-sm text-muted-foreground">Overall Success Rate</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
