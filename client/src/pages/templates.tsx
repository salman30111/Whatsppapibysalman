import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, FileText, Plus } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Template } from "@shared/schema";

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  components: any[];
}

export default function Templates() {
  const { toast } = useToast();

  const { data: localTemplates = [], isLoading: loadingLocal } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const { data: whatsappTemplates = [], isLoading: loadingWhatsApp, refetch } = useQuery<WhatsAppTemplate[]>({
    queryKey: ["/api/templates/whatsapp"],
    retry: false,
  });

  const syncTemplatesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/templates/whatsapp");
      return await res.json();
    },
    onSuccess: (templates) => {
      queryClient.setQueryData(["/api/templates/whatsapp"], templates);
      toast({
        title: "Templates synced",
        description: `Found ${templates.length} templates from WhatsApp Business API.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const importTemplateMutation = useMutation({
    mutationFn: async (template: WhatsAppTemplate) => {
      const res = await apiRequest("POST", "/api/templates", {
        templateId: template.id,
        name: template.name,
        category: template.category,
        language: template.language,
        components: template.components,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template imported",
        description: "Template has been added to your collection.",
      });
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "marketing": return "bg-chart-1 text-chart-1-foreground";
      case "utility": return "bg-chart-2 text-chart-2-foreground";
      case "authentication": return "bg-chart-3 text-chart-3-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved": return "bg-chart-2 text-chart-2-foreground";
      case "pending": return "bg-chart-3 text-chart-3-foreground";
      case "rejected": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
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
              <h2 className="text-2xl font-bold text-foreground" data-testid="page-title">Templates</h2>
              <p className="text-sm text-muted-foreground">Manage WhatsApp message templates</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                onClick={() => syncTemplatesMutation.mutate()}
                disabled={syncTemplatesMutation.isPending}
                data-testid="button-sync-templates"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncTemplatesMutation.isPending ? 'animate-spin' : ''}`} />
                Sync from WhatsApp
              </Button>
            </div>
          </div>
        </header>

        {/* Templates Content */}
        <div className="p-6 space-y-8">
          {/* Local Templates */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground" data-testid="local-templates-title">Your Templates</h3>
              <span className="text-sm text-muted-foreground" data-testid="local-templates-count">
                {localTemplates.length} templates
              </span>
            </div>
            
            {loadingLocal ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : localTemplates.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-lg">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium text-foreground mb-2" data-testid="no-local-templates-title">No templates yet</h4>
                <p className="text-muted-foreground" data-testid="no-local-templates-description">
                  Import templates from WhatsApp Business API to get started
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {localTemplates.map((template) => (
                  <Card key={template.id} data-testid={`local-template-card-${template.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base" data-testid={`template-name-${template.id}`}>{template.name}</CardTitle>
                        <Badge className={getCategoryColor(template.category)} data-testid={`template-category-${template.id}`}>
                          {template.category}
                        </Badge>
                      </div>
                      <CardDescription data-testid={`template-language-${template.id}`}>
                        Language: {template.language}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground" data-testid={`template-components-${template.id}`}>
                        {template.components?.length || 0} components
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* WhatsApp Templates */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground" data-testid="whatsapp-templates-title">WhatsApp Business Templates</h3>
              <span className="text-sm text-muted-foreground" data-testid="whatsapp-templates-count">
                {whatsappTemplates.length} available
              </span>
            </div>
            
            {loadingWhatsApp ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : whatsappTemplates.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-lg">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium text-foreground mb-2" data-testid="no-whatsapp-templates-title">No templates found</h4>
                <p className="text-muted-foreground mb-4" data-testid="no-whatsapp-templates-description">
                  Configure your WhatsApp Business API credentials in settings to fetch templates
                </p>
                <Button variant="outline" onClick={() => syncTemplatesMutation.mutate()} data-testid="button-retry-sync">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {whatsappTemplates.map((template) => {
                  const isImported = localTemplates.some(local => local.templateId === template.id);
                  
                  return (
                    <Card key={template.id} data-testid={`whatsapp-template-card-${template.id}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base" data-testid={`whatsapp-template-name-${template.id}`}>{template.name}</CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge className={getCategoryColor(template.category)} data-testid={`whatsapp-template-category-${template.id}`}>
                              {template.category}
                            </Badge>
                            <Badge className={getStatusColor(template.status)} data-testid={`whatsapp-template-status-${template.id}`}>
                              {template.status}
                            </Badge>
                          </div>
                        </div>
                        <CardDescription data-testid={`whatsapp-template-language-${template.id}`}>
                          Language: {template.language}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm text-muted-foreground" data-testid={`whatsapp-template-components-${template.id}`}>
                          {template.components?.length || 0} components
                        </div>
                        
                        {isImported ? (
                          <Badge variant="outline" className="w-full justify-center" data-testid={`template-imported-${template.id}`}>
                            Already Imported
                          </Badge>
                        ) : template.status === 'APPROVED' ? (
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => importTemplateMutation.mutate(template)}
                            disabled={importTemplateMutation.isPending}
                            data-testid={`button-import-template-${template.id}`}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Import Template
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="w-full justify-center" data-testid={`template-not-approved-${template.id}`}>
                            Not Approved
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
