import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Pause, Square, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CampaignWizard } from "@/components/campaigns/campaign-wizard";
import type { Campaign } from "@shared/schema";

export default function Campaigns() {
  const [showCampaignWizard, setShowCampaignWizard] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running": return "bg-chart-2 text-chart-2-foreground";
      case "scheduled": return "bg-chart-3 text-chart-3-foreground";
      case "paused": return "bg-chart-4 text-chart-4-foreground";
      case "completed": return "bg-muted text-muted-foreground";
      case "stopped": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running": return <Play className="h-3 w-3" />;
      case "paused": return <Pause className="h-3 w-3" />;
      case "stopped": return <Square className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground" data-testid="page-title">Campaigns</h2>
              <p className="text-sm text-muted-foreground">Manage your WhatsApp marketing campaigns</p>
            </div>
            <Button onClick={() => setShowCampaignWizard(true)} data-testid="button-new-campaign">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </header>

        {/* Campaigns Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground" data-testid="loading-campaigns">Loading campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="no-campaigns-title">No campaigns yet</h3>
              <p className="text-muted-foreground mb-4" data-testid="no-campaigns-description">
                Create your first WhatsApp campaign to start reaching your audience
              </p>
              <Button onClick={() => setShowCampaignWizard(true)} data-testid="button-create-first-campaign">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Campaign
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="hover:shadow-md transition-shadow" data-testid={`campaign-card-${campaign.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg" data-testid={`campaign-name-${campaign.id}`}>{campaign.name}</CardTitle>
                      <Badge className={`${getStatusColor(campaign.status)} flex items-center gap-1`} data-testid={`campaign-status-${campaign.id}`}>
                        {getStatusIcon(campaign.status)}
                        {campaign.status}
                      </Badge>
                    </div>
                    <CardDescription data-testid={`campaign-description-${campaign.id}`}>
                      {campaign.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <p data-testid={`campaign-contacts-${campaign.id}`}>{campaign.contacts?.length || 0} contacts</p>
                      <p data-testid={`campaign-created-${campaign.id}`}>Created {new Date(campaign.createdAt!).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" data-testid={`button-edit-${campaign.id}`}>
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      {campaign.status === "running" ? (
                        <Button size="sm" variant="outline" data-testid={`button-pause-${campaign.id}`}>
                          <Pause className="h-3 w-3 mr-1" />
                          Pause
                        </Button>
                      ) : campaign.status === "paused" ? (
                        <Button size="sm" variant="outline" data-testid={`button-resume-${campaign.id}`}>
                          <Play className="h-3 w-3 mr-1" />
                          Resume
                        </Button>
                      ) : campaign.status === "draft" ? (
                        <Button size="sm" data-testid={`button-start-${campaign.id}`}>
                          <Play className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" data-testid={`button-delete-${campaign.id}`}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Campaign Wizard Modal */}
      {showCampaignWizard && (
        <CampaignWizard onClose={() => setShowCampaignWizard(false)} />
      )}
    </div>
  );
}
