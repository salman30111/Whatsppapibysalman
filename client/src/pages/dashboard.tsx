import { Sidebar } from "@/components/layout/sidebar";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ChartsSection } from "@/components/dashboard/charts-section";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { QuickSend } from "@/components/dashboard/quick-send";
import { Button } from "@/components/ui/button";
import { Plus, Bell } from "lucide-react";
import { useState } from "react";
import { CampaignWizard } from "@/components/campaigns/campaign-wizard";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { exportData, formatDate, getTimestamp } from "@/lib/export-utils";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Campaign, Message, Contact } from "@shared/schema";

export default function Dashboard() {
  const [showCampaignWizard, setShowCampaignWizard] = useState(false);
  const { toast } = useToast();

  // Fetch analytics data for export
  const { data: dashboardStats } = useQuery<{
    totalCampaigns: number;
    activeCampaigns: number;
    totalMessages: number;
    messagesToday: number;
    totalContacts: number;
    deliveryRate: number;
  }>({
    queryKey: ["/api/analytics/dashboard"],
  });

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const handleExportAnalytics = (format: 'csv' | 'xlsx') => {
    const analyticsData = [
      {
        metric: 'Total Campaigns',
        value: dashboardStats?.totalCampaigns || campaigns.length || 0,
        timestamp: new Date()
      },
      {
        metric: 'Active Campaigns', 
        value: dashboardStats?.activeCampaigns || campaigns.filter(c => c.status === 'running' || c.status === 'scheduled').length || 0,
        timestamp: new Date()
      },
      {
        metric: 'Total Messages',
        value: dashboardStats?.totalMessages || messages.length || 0,
        timestamp: new Date()
      },
      {
        metric: 'Messages Today',
        value: dashboardStats?.messagesToday || 0,
        timestamp: new Date()
      },
      {
        metric: 'Total Contacts',
        value: dashboardStats?.totalContacts || contacts.length || 0,
        timestamp: new Date()
      },
      {
        metric: 'Delivery Rate (%)',
        value: dashboardStats?.deliveryRate || 0,
        timestamp: new Date()
      }
    ];

    const columns = [
      { key: 'metric', label: 'Metric' },
      { key: 'value', label: 'Value' },
      { key: 'timestamp', label: 'Generated At', format: formatDate }
    ];
    
    try {
      exportData({
        filename: `analytics-${getTimestamp()}`,
        format,
        columns,
        data: analyticsData,
        sheetName: 'Analytics'
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting analytics data.",
        variant: "destructive",
      });
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
              <h2 className="text-2xl font-bold text-foreground" data-testid="page-title">Dashboard</h2>
              <p className="text-sm text-muted-foreground">Welcome back! Here's your campaign overview.</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="relative"
                  data-testid="button-notifications"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-0 right-0 w-2 h-2 bg-destructive rounded-full" />
                </Button>
              </div>
              
              <ExportDropdown
                onExportCSV={() => handleExportAnalytics('csv')}
                onExportExcel={() => handleExportAnalytics('xlsx')}
                disabled={!dashboardStats}
                label="Export Analytics"
              />
              
              <Button 
                onClick={() => setShowCampaignWizard(true)}
                data-testid="button-new-campaign"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6 space-y-6">
          <StatsCards />
          <ChartsSection />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentActivity />
            </div>
            <div className="space-y-6">
              <QuickSend />
              
              {/* System Status */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4" data-testid="system-status-title">System Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">WhatsApp API</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-chart-2 rounded-full" />
                      <span className="text-sm text-chart-2" data-testid="status-whatsapp-api">Active</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Message Queue</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-chart-2 rounded-full" />
                      <span className="text-sm text-chart-2" data-testid="status-message-queue">Running</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Webhook Status</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-chart-3 rounded-full" />
                      <span className="text-sm text-chart-3" data-testid="status-webhook">Warning</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground" data-testid="last-sync">Last sync: 2 minutes ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Scheduled Campaigns */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground" data-testid="upcoming-campaigns-title">Upcoming Scheduled Campaigns</h3>
              <Button variant="link" size="sm" data-testid="link-manage-schedule">Manage schedule</Button>
            </div>
            <div className="text-center py-8">
              <p className="text-muted-foreground" data-testid="no-scheduled-campaigns">No scheduled campaigns</p>
            </div>
          </div>
        </div>
      </main>

      {/* Campaign Wizard Modal */}
      {showCampaignWizard && (
        <CampaignWizard onClose={() => setShowCampaignWizard(false)} />
      )}
    </div>
  );
}
