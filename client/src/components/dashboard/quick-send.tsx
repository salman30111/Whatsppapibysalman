import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Send, Zap } from "lucide-react";
import { z } from "zod";
import type { Template } from "@shared/schema";

const quickSendSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
  templateId: z.string().min(1, "Template is required"),
  parameters: z.string().optional(),
  mediaUrl: z.string().optional(),
}).refine((data) => {
  // No validation needed if no templateId selected
  if (!data.templateId) return true;
  
  // This will be checked in the form component using hasMediaHeader
  return true;
}, {
  message: "Media URL is required for video/image templates",
  path: ["mediaUrl"],
});

type QuickSendData = z.infer<typeof quickSendSchema>;

export function QuickSend() {
  const { toast } = useToast();

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const form = useForm<QuickSendData>({
    resolver: zodResolver(quickSendSchema),
    defaultValues: {
      phone: "",
      templateId: "",
      parameters: "",
      mediaUrl: "",
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: QuickSendData) => {
      const parameters = data.parameters 
        ? data.parameters.split(',').map(p => p.trim()).filter(Boolean)
        : [];
      
      const res = await apiRequest("POST", "/api/messages/send", {
        phone: data.phone,
        templateId: data.templateId,
        parameters,
        mediaUrl: data.mediaUrl,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: QuickSendData) => {
    // Validate media URL for video/image templates
    if (hasMediaHeader && !data.mediaUrl?.trim()) {
      form.setError("mediaUrl", {
        type: "required",
        message: "Media URL is required for this template"
      });
      return;
    }
    
    // Validate media URL format if provided
    if (data.mediaUrl?.trim() && !data.mediaUrl.match(/^https?:\/\/.+/)) {
      form.setError("mediaUrl", {
        type: "format",
        message: "Media URL must be a valid HTTPS URL"
      });
      return;
    }
    
    sendMessageMutation.mutate(data);
  };

  // Check if selected template has media header
  const selectedTemplate = templates.find(t => t.templateId === form.watch("templateId"));
  const hasMediaHeader = selectedTemplate?.components?.some(c => 
    c.type === "HEADER" && (c.format === "VIDEO" || c.format === "IMAGE")
  );

  return (
    <Card className="bg-card border border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" data-testid="quick-send-title">
          <Zap className="h-5 w-5" />
          Quick Send
        </CardTitle>
        <CardDescription>
          Send a single message using a template
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1234567890"
              data-testid="input-quick-send-phone"
              {...form.register("phone")}
            />
            {form.formState.errors.phone && (
              <p className="text-sm text-destructive" data-testid="error-quick-send-phone">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Select 
              value={form.watch("templateId")} 
              onValueChange={(value) => form.setValue("templateId", value)}
            >
              <SelectTrigger data-testid="select-quick-send-template">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No templates available. Import from WhatsApp first.
                  </div>
                ) : (
                  templates.map((template) => (
                    <SelectItem key={template.id} value={template.templateId}>
                      {template.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {form.formState.errors.templateId && (
              <p className="text-sm text-destructive" data-testid="error-quick-send-template">
                {form.formState.errors.templateId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="parameters">Parameters (comma separated)</Label>
            <Textarea
              id="parameters"
              placeholder="John, Product Name, $99.99"
              rows={3}
              data-testid="input-quick-send-parameters"
              {...form.register("parameters")}
            />
            <p className="text-xs text-muted-foreground">
              Enter parameters for template placeholders, separated by commas
            </p>
          </div>

          {hasMediaHeader && (
            <div className="space-y-2">
              <Label htmlFor="mediaUrl">
                Media URL ({selectedTemplate?.components?.find(c => c.type === "HEADER")?.format?.toLowerCase()})
              </Label>
              <Input
                id="mediaUrl"
                type="url"
                placeholder="https://example.com/video.mp4"
                data-testid="input-quick-send-media-url"
                {...form.register("mediaUrl")}
              />
              <p className="text-xs text-muted-foreground">
                Provide a direct URL to the {selectedTemplate?.components?.find(c => c.type === "HEADER")?.format?.toLowerCase()} file. The media must be publicly accessible.
              </p>
              {form.formState.errors.mediaUrl && (
                <p className="text-sm text-destructive" data-testid="error-quick-send-media-url">
                  {form.formState.errors.mediaUrl.message}
                </p>
              )}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={sendMessageMutation.isPending || templates.length === 0}
            data-testid="button-quick-send"
          >
            <Send className="h-4 w-4 mr-2" />
            {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
