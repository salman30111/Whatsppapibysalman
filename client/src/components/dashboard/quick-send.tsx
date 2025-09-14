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
import { Send, Zap, Upload, FileIcon } from "lucide-react";
import { useState, useRef } from "react";
import { z } from "zod";
import type { Template } from "@shared/schema";

const quickSendSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
  templateId: z.string().min(1, "Template is required"),
  parameters: z.string().optional(),
});

type QuickSendData = z.infer<typeof quickSendSchema>;

export function QuickSend() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const form = useForm<QuickSendData>({
    resolver: zodResolver(quickSendSchema),
    defaultValues: {
      phone: "",
      templateId: "",
      parameters: "",
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setMediaId(data.mediaId);
      setUploadProgress(null);
      toast({
        title: "Media uploaded successfully",
        description: `File uploaded: ${data.fileName}`,
      });
    },
    onError: (error: any) => {
      setUploadProgress(null);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
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
        mediaId: mediaId,
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setMediaId(null);
      setUploadProgress("Ready to upload");
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      setUploadProgress("Uploading...");
      uploadMutation.mutate(selectedFile);
    }
  };

  const onSubmit = (data: QuickSendData) => {
    // Validate media upload for video/image templates
    if (hasMediaHeader && !mediaId) {
      toast({
        title: "Media required",
        description: "Please upload a media file for this template",
        variant: "destructive",
      });
      return;
    }
    
    sendMessageMutation.mutate(data);
  };

  // Check if selected template has media header
  const selectedTemplate = templates.find(t => t.templateId === form.watch("templateId"));
  const hasMediaHeader = selectedTemplate?.components?.some(c => 
    c.type === "HEADER" && (c.format === "VIDEO" || c.format === "IMAGE" || c.format === "DOCUMENT")
  );
  
  const headerFormat = selectedTemplate?.components?.find(c => c.type === "HEADER")?.format;

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
            <div className="space-y-4">
              <div>
                <Label htmlFor="mediaFile">
                  Media File ({selectedTemplate?.components?.find(c => c.type === "HEADER")?.format?.toLowerCase()})
                </Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="mediaFile"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept={headerFormat === "DOCUMENT" ? ".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx" : headerFormat === "IMAGE" ? "image/*" : headerFormat === "VIDEO" ? "video/*" : "video/*,image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                    data-testid="input-media-file"
                  />
                  {selectedFile && !mediaId && (
                    <Button
                      type="button"
                      onClick={handleUpload}
                      disabled={uploadMutation.isPending}
                      size="sm"
                      data-testid="button-upload"
                    >
                      {uploadMutation.isPending ? (
                        <><Zap className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload className="w-4 h-4 mr-2" /> Upload</>
                      )}
                    </Button>
                  )}
                </div>
                {selectedFile && (
                  <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                    <FileIcon className="w-4 h-4" />
                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
                {uploadProgress && (
                  <div className="mt-2 text-sm text-blue-600">
                    {uploadProgress}
                  </div>
                )}
                {mediaId && (
                  <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                    ✓ Media uploaded successfully (ID: {mediaId.slice(0, 8)}...)
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Upload a {selectedTemplate?.components?.find(c => c.type === "HEADER")?.format?.toLowerCase()} file. Maximum size: 16MB.
                </p>
              </div>
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
