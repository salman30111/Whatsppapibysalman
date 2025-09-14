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
import { X, Check } from "lucide-react";

interface CampaignWizardProps {
  onClose: () => void;
  editingCampaign?: Campaign | null;
}

const steps = [
  { id: 1, name: "Campaign Details", description: "Basic campaign information" },
  { id: 2, name: "Contacts & Template", description: "Select audience and message template" },
  { id: 3, name: "Schedule & Launch", description: "Set timing and launch campaign" },
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

  const nextStep = () => {
    if (currentStep < 3) {
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
              <DialogTitle data-testid="campaign-wizard-title">Create New Campaign</DialogTitle>
              <DialogDescription>
                Follow the steps to create and launch your WhatsApp campaign
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
                    <Label htmlFor="campaign-status">Campaign Type</Label>
                    <Select 
                      value={form.watch("status")} 
                      onValueChange={(value) => form.setValue("status", value as any)}
                    >
                      <SelectTrigger data-testid="select-campaign-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Marketing</SelectItem>
                        <SelectItem value="scheduled">Transactional</SelectItem>
                        <SelectItem value="running">Support</SelectItem>
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
              <div className="space-y-6" data-testid="step-contacts-template">
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

                <div className="space-y-2">
                  <Label>Target Contacts</Label>
                  <div className="border border-border rounded-lg p-4 max-h-48 overflow-y-auto">
                    {contacts.length === 0 ? (
                      <p className="text-sm text-muted-foreground" data-testid="no-contacts-available">
                        No contacts available. Add contacts first.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Available Contacts ({contacts.length})</span>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const allContactIds = contacts.map(c => c.id);
                              form.setValue("contacts", allContactIds);
                            }}
                            data-testid="button-select-all-contacts"
                          >
                            Select All
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                          {contacts.map((contact) => (
                            <label key={contact.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(form.watch("contacts") as string[])?.includes(contact.id) || false}
                                onChange={(e) => {
                                  const currentContacts = (form.watch("contacts") as string[]) || [];
                                  if (e.target.checked) {
                                    form.setValue("contacts", [...currentContacts, contact.id]);
                                  } else {
                                    form.setValue("contacts", currentContacts.filter(id => id !== contact.id));
                                  }
                                }}
                                className="rounded"
                                data-testid={`checkbox-contact-${contact.id}`}
                              />
                              <div className="text-sm">
                                <div className="font-medium">{contact.name}</div>
                                <div className="text-muted-foreground">{contact.phone}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                        <div className="text-sm text-muted-foreground mt-2" data-testid="selected-contacts-count">
                          {form.watch("contacts")?.length || 0} contacts selected
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6" data-testid="step-schedule-launch">
                <div className="space-y-2">
                  <Label>Schedule Type</Label>
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
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input
                      id="start-time"
                      type="datetime-local"
                      data-testid="input-start-time"
                      onChange={(e) => {
                        if (e.target.value) {
                          form.setValue("schedule.startTime", new Date(e.target.value));
                        }
                      }}
                    />
                  </div>
                )}

                {form.watch("schedule.type") === "recurring" && (
                  <div className="space-y-2">
                    <Label>Recurrence</Label>
                    <Select 
                      value={(form.watch("schedule.recurrence") as string) || "none"} 
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
                  </div>
                )}

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-medium mb-2" data-testid="campaign-summary-title">Campaign Summary</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {form.watch("name") || "Untitled Campaign"}</p>
                    <p><span className="font-medium">Template:</span> {
                      templates.find(t => t.id === form.watch("templateId"))?.name || "None selected"
                    }</p>
                    <p><span className="font-medium">Contacts:</span> {form.watch("contacts")?.length || 0} selected</p>
                    <p><span className="font-medium">Schedule:</span> {form.watch("schedule.type")}</p>
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
              {currentStep < 3 ? (
                <Button 
                  onClick={nextStep}
                  disabled={
                    (currentStep === 1 && !form.watch("name")) ||
                    (currentStep === 2 && (!form.watch("templateId") || !form.watch("contacts")?.length))
                  }
                  data-testid="button-next-step"
                >
                  Next Step
                </Button>
              ) : (
                <Button 
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={saveCampaignMutation.isPending}
                  data-testid="button-create-campaign"
                >
                  {saveCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
