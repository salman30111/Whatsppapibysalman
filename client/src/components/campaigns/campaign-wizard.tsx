import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCampaignSchema, type InsertCampaign, type Template, type Contact, type Campaign } from "@shared/schema";
import { X, Check, Calendar, Clock } from "lucide-react";
import { TemplatePreview } from "./template-preview";
import { ContactSelector } from "./contact-selector";

interface CampaignWizardProps {
  onClose: () => void;
  editingCampaign?: Campaign | null;
}

const steps = [
  { id: 1, name: "Campaign Details", description: "Basic campaign information" },
  { id: 2, name: "Template & Preview", description: "Choose template and preview message" },
  { id: 3, name: "Select Contacts", description: "Choose your audience" },
  { id: 4, name: "Schedule & Launch", description: "Set timing and launch campaign" },
];

export function CampaignWizard({ onClose, editingCampaign }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  const isEditing = !!editingCampaign;

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const form = useForm<InsertCampaign>({
    resolver: zodResolver(insertCampaignSchema),
    defaultValues: editingCampaign ? {
      name: editingCampaign.name,
      description: editingCampaign.description || "",
      status: editingCampaign.status,
      templateId: editingCampaign.templateId || "",
      contacts: editingCampaign.contacts || [],
      schedule: editingCampaign.schedule || {
        type: "immediate",
      },
    } : {
      name: "",
      description: "",
      status: "draft",
      templateId: "",
      contacts: [],
      schedule: {
        type: "immediate",
      },
    },
  });

  const saveCampaignMutation = useMutation({
    mutationFn: async (data: InsertCampaign) => {
      if (isEditing && editingCampaign?.id) {
        const res = await apiRequest("PUT", `/api/campaigns/${editingCampaign.id}`, data);
        return await res.json();
      } else {
        const res = await apiRequest("POST", "/api/campaigns", data);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: isEditing ? "Campaign updated" : "Campaign created",
        description: `Your campaign has been ${isEditing ? "updated" : "created"} successfully.`,
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: `Failed to ${isEditing ? "update" : "create"} campaign`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const canProceedToNextStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!form.watch("name")?.trim();
      case 2:
        // Allow proceeding without template for testing/demo purposes
        // In production, you might want to make this stricter
        return true;
      case 3:
        return (form.watch("contacts")?.length || 0) > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < 4 && canProceedToNextStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data: InsertCampaign) => {
    saveCampaignMutation.mutate(data);
  };

  const getStepIcon = (stepNumber: number) => {
    if (stepNumber < currentStep) {
      return <Check className="h-4 w-4" />;
    }
    return stepNumber.toString();
  };

  const getStepStyle = (stepNumber: number) => {
    if (stepNumber < currentStep) {
      return "bg-chart-2 text-chart-2-foreground";
    } else if (stepNumber === currentStep) {
      return "bg-primary text-primary-foreground";
    }
    return "bg-muted text-muted-foreground";
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" data-testid="campaign-wizard">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle data-testid="campaign-wizard-title">
                {isEditing ? "Edit Campaign" : "Create New Campaign"}
              </DialogTitle>
              <DialogDescription>
                {isEditing ? "Update your campaign settings" : "Follow the steps to create and launch your WhatsApp campaign"}
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-wizard">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center space-x-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${getStepStyle(step.id)}`} data-testid={`step-${step.id}`}>
                  {getStepIcon(step.id)}
                </div>
                <div className="hidden md:block">
                  <span className={`text-sm ${step.id === currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {step.name}
                  </span>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-px bg-border mx-4 min-w-[50px]"></div>
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px] overflow-y-auto">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-6" data-testid="step-campaign-details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="campaign-name">Campaign Name</Label>
                    <Input
                      id="campaign-name"
                      placeholder="Enter campaign name"
                      data-testid="input-campaign-name"
                      {...form.register("name")}
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive" data-testid="error-campaign-name">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="campaign-status">Campaign Status</Label>
                    <Select 
                      value={form.watch("status")} 
                      onValueChange={(value) => form.setValue("status", value as any)}
                    >
                      <SelectTrigger data-testid="select-campaign-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="running">Running</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign-description">Description</Label>
                  <Textarea
                    id="campaign-description"
                    placeholder="Describe your campaign..."
                    rows={3}
                    data-testid="input-campaign-description"
                    {...form.register("description")}
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6" data-testid="step-template-preview">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Template Selection */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="campaign-template">Message Template</Label>
                      <Select 
                        value={form.watch("templateId") || ""} 
                        onValueChange={(value) => form.setValue("templateId", value)}
                      >
                        <SelectTrigger data-testid="select-campaign-template">
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              No templates available. Import from WhatsApp first.
                            </div>
                          ) : (
                            templates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name} ({template.category})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.templateId && (
                        <p className="text-sm text-destructive" data-testid="error-campaign-template">
                          {form.formState.errors.templateId.message}
                        </p>
                      )}
                    </div>

                    <div className="bg-muted/30 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Template Selection</h4>
                      <div className="text-sm text-muted-foreground">
                        {templates.length > 0 
                          ? `Choose from ${templates.length} available templates, or proceed without selecting one for testing.`
                          : "No templates found. You can still create a campaign and add a template later, or sync templates from WhatsApp."
                        }
                      </div>
                    </div>
                  </div>

                  {/* Template Preview */}
                  <TemplatePreview
                    template={templates.find(t => t.id === form.watch("templateId")) || null}
                    selectedContacts={(form.watch("contacts") as string[]) || []}
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6" data-testid="step-select-contacts">
                <ContactSelector
                  contacts={contacts}
                  selectedContacts={(form.watch("contacts") as string[]) || []}
                  onContactsChange={(contactIds) => form.setValue("contacts", contactIds)}
                />
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6" data-testid="step-schedule-launch">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Scheduling Options */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Schedule Type
                      </Label>
                      <Select 
                        value={form.watch("schedule.type")} 
                        onValueChange={(value) => form.setValue("schedule.type", value as any)}
                      >
                        <SelectTrigger data-testid="select-schedule-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Send Immediately</SelectItem>
                          <SelectItem value="scheduled">Schedule for Later</SelectItem>
                          <SelectItem value="recurring">Recurring Campaign</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {form.watch("schedule.type") === "scheduled" && (
                      <div className="space-y-2">
                        <Label htmlFor="start-time" className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Start Time
                        </Label>
                        <Input
                          id="start-time"
                          type="datetime-local"
                          data-testid="input-start-time"
                          min={new Date().toISOString().slice(0, 16)}
                          onChange={(e) => {
                            if (e.target.value) {
                              form.setValue("schedule.startTime", new Date(e.target.value));
                            }
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          Campaign will start sending at the specified time
                        </p>
                      </div>
                    )}

                    {form.watch("schedule.type") === "recurring" && (
                      <div className="space-y-2">
                        <Label>Recurrence Pattern</Label>
                        <Select 
                          value={(form.watch("schedule.recurrence") as string) || "daily"} 
                          onValueChange={(value) => form.setValue("schedule.recurrence", value as any)}
                        >
                          <SelectTrigger data-testid="select-recurrence">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Campaign will repeat automatically
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Campaign Summary */}
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h4 className="font-medium mb-3" data-testid="campaign-summary-title">Final Campaign Summary</h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-foreground">Campaign Name:</span>
                        <div className="text-muted-foreground">{form.watch("name") || "Untitled Campaign"}</div>
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Template:</span>
                        <div className="text-muted-foreground">{
                          templates.find(t => t.id === form.watch("templateId"))?.name || "None selected"
                        }</div>
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Recipients:</span>
                        <div className="text-muted-foreground">{form.watch("contacts")?.length || 0} contacts selected</div>
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Schedule:</span>
                        <div className="text-muted-foreground">
                          {form.watch("schedule.type") === "immediate" && "Send immediately after creation"}
                          {form.watch("schedule.type") === "scheduled" && "Send at scheduled time"}
                          {form.watch("schedule.type") === "recurring" && `Recurring ${form.watch("schedule.recurrence")}`}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Status:</span>
                        <div className="text-muted-foreground">{form.watch("status")}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div>
              {currentStep > 1 && (
                <Button variant="outline" onClick={prevStep} data-testid="button-previous-step">
                  Previous
                </Button>
              )}
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose} data-testid="button-cancel-wizard">
                Cancel
              </Button>
              {currentStep < 4 ? (
                <Button 
                  onClick={nextStep}
                  disabled={!canProceedToNextStep()}
                  data-testid="button-next-step"
                >
                  Next Step
                </Button>
              ) : (
                <Button 
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={saveCampaignMutation.isPending || !canProceedToNextStep()}
                  data-testid="button-create-campaign"
                  className="bg-primary hover:bg-primary/90"
                >
                  {saveCampaignMutation.isPending ? 
                    (isEditing ? "Updating..." : "Creating...") : 
                    (isEditing ? "Update Campaign" : "Create Campaign")
                  }
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
