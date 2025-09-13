import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, Activity } from "lucide-react";
import type { Campaign } from "@shared/schema";

export function RecentActivity() {
  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running": return "bg-chart-2/20 text-chart-2";
      case "scheduled": return "bg-chart-5/20 text-chart-5";
      case "paused": return "bg-chart-4/20 text-chart-4";
      case "completed": return "bg-muted text-muted-foreground";
      case "stopped": return "bg-destructive/20 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running": return "🟢";
      case "scheduled": return "🟡";
      case "paused": return "⏸️";
      case "completed": return "✅";
      case "stopped": return "🛑";
      default: return "⚪";
    }
  };

  // Show only the most recent 3 campaigns
  const recentCampaigns = campaigns
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 3);

  return (
    <Card className="bg-card border border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div>
          <CardTitle className="flex items-center gap-2" data-testid="recent-campaigns-title">
            <Activity className="h-5 w-5" />
            Recent Campaigns
          </CardTitle>
          <CardDescription>Latest campaign activity and status</CardDescription>
        </div>
        <Button variant="link" size="sm" data-testid="link-view-all-campaigns">
          View all
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground" data-testid="loading-recent-campaigns">Loading campaigns...</p>
          </div>
        ) : recentCampaigns.length === 0 ? (
          <div className="text-center py-8">
            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-medium text-foreground mb-2" data-testid="no-recent-campaigns-title">No campaigns yet</h4>
            <p className="text-muted-foreground" data-testid="no-recent-campaigns-description">
              Create your first campaign to see activity here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentCampaigns.map((campaign) => (
              <div 
                key={campaign.id} 
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                data-testid={`recent-campaign-${campaign.id}`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-chart-1/20 rounded-lg flex items-center justify-center">
                    <Megaphone className="h-5 w-5 text-chart-1" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground" data-testid={`recent-campaign-name-${campaign.id}`}>
                      {campaign.name}
                    </h4>
                    <p className="text-sm text-muted-foreground" data-testid={`recent-campaign-info-${campaign.id}`}>
                      {campaign.contacts?.length || 0} contacts • Created {new Date(campaign.createdAt!).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge 
                    className={`${getStatusColor(campaign.status)} flex items-center gap-1`}
                    data-testid={`recent-campaign-status-${campaign.id}`}
                  >
                    <span>{getStatusIcon(campaign.status)}</span>
                    {campaign.status}
                  </Badge>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground" data-testid={`recent-campaign-progress-${campaign.id}`}>
                      --
                    </p>
                    <p className="text-xs text-muted-foreground">Progress</p>
                  </div>
                </div>
              </div>
            ))}
            
            {campaigns.length > 3 && (
              <div className="pt-2 text-center">
                <Button variant="outline" size="sm" data-testid="button-view-more-campaigns">
                  View {campaigns.length - 3} more campaigns
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
