import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Send, Megaphone, CheckCircle, Users, Bot, ArrowUp } from "lucide-react";

interface DashboardStats {
  messagesToday: number;
  activeCampaigns: number;
  deliveryRate: number;
  totalContacts: number;
  totalCampaigns: number;
  totalMessages: number;
  // Bot statistics
  botRepliesToday: number;
  totalBotReplies: number;
  activeBotRules: number;
  // AI statistics
  aiRepliesToday: number;
  totalAiReplies: number;
}

export function StatsCards() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/analytics/dashboard"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-lg" />
              </div>
              <div className="flex items-center mt-4">
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: "Messages Today",
      value: stats?.messagesToday || 0,
      icon: Send,
      iconBg: "bg-chart-1/10",
      iconColor: "text-chart-1",
      change: "+12%",
      changeLabel: "vs yesterday",
      testId: "stat-messages-today"
    },
    {
      title: "Active Campaigns",
      value: stats?.activeCampaigns || 0,
      icon: Megaphone,
      iconBg: "bg-chart-2/10",
      iconColor: "text-chart-2",
      change: "+3",
      changeLabel: "this week",
      testId: "stat-active-campaigns"
    },
    {
      title: "Delivery Rate",
      value: `${stats?.deliveryRate || 0}%`,
      icon: CheckCircle,
      iconBg: "bg-chart-2/10",
      iconColor: "text-chart-2",
      change: "+1.3%",
      changeLabel: "vs last month",
      testId: "stat-delivery-rate"
    },
    {
      title: "Total Contacts",
      value: stats?.totalContacts || 0,
      icon: Users,
      iconBg: "bg-chart-4/10",
      iconColor: "text-chart-4",
      change: "+284",
      changeLabel: "this week",
      testId: "stat-total-contacts"
    },
    {
      title: "Bot Replies Today",
      value: stats?.botRepliesToday || 0,
      icon: Bot,
      iconBg: "bg-chart-3/10",
      iconColor: "text-chart-3",
      change: `+${stats?.botRepliesToday || 0}`,
      changeLabel: "automated responses",
      testId: "stat-bot-replies-today"
    },
    {
      title: "Active Bot Rules",
      value: stats?.activeBotRules || 0,
      icon: Bot,
      iconBg: "bg-chart-5/10",
      iconColor: "text-chart-5",
      change: `${stats?.totalBotReplies || 0} total`,
      changeLabel: "all-time replies",
      testId: "stat-active-bot-rules"
    },
    {
      title: "AI Replies Today",
      value: stats?.aiRepliesToday || 0,
      icon: Bot,
      iconBg: "bg-purple-100 dark:bg-purple-900/20",
      iconColor: "text-purple-600 dark:text-purple-400",
      change: `${stats?.totalAiReplies || 0} total`,
      changeLabel: "intelligent responses",
      testId: "stat-ai-replies-today"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-6">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="bg-card border border-border" data-testid={stat.testId}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground" data-testid={`${stat.testId}-value`}>
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`${stat.iconColor} text-xl`} />
                </div>
              </div>
              <div className="flex items-center mt-4 text-sm">
                <ArrowUp className="text-chart-2 mr-1 h-4 w-4" />
                <span className="text-chart-2 font-medium" data-testid={`${stat.testId}-change`}>{stat.change}</span>
                <span className="text-muted-foreground ml-1">{stat.changeLabel}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
