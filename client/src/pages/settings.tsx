import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, Settings as SettingsIcon, Key, Smartphone, Stethoscope, AlertCircle, CheckCircle, Info } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSettingsSchema, type Settings, type InsertSettings } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface DiagnosticResult {
  status: 'success' | 'warning' | 'error';
  message: string;
  issues: string[];
  warnings: string[];
  info: string[];
  recommendations: string[];
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const form = useForm<InsertSettings>({
    resolver: zodResolver(insertSettingsSchema),
    defaultValues: {
      phoneNumberId: "",
      wabaId: "",
      accessToken: "",
    },
    values: settings ? {
      phoneNumberId: settings.phoneNumberId || "",
      wabaId: settings.wabaId || "",
      accessToken: settings.accessToken || "",
      createdBy: settings.createdBy,
    } : undefined,
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: InsertSettings) => {
      const res = await apiRequest("POST", "/api/settings", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings saved",
        description: "Your WhatsApp Business API settings have been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const runDiagnosticMutation = useMutation({
    mutationFn: async (): Promise<DiagnosticResult> => {
      const res = await apiRequest("GET", "/api/whatsapp/diagnostic");
      return await res.json();
    },
    onSuccess: (result) => {
      setDiagnosticResult(result);
      toast({
        title: "Diagnostic completed",
        description: result.message,
        variant: result.status === 'error' ? 'destructive' : 'default',
      });
    },
    onError: (error) => {
      toast({
        title: "Diagnostic failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertSettings) => {
    saveSettingsMutation.mutate(data);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground" data-testid="page-title">Settings</h2>
              <p className="text-sm text-muted-foreground">Configure your WhatsApp Business API credentials</p>
            </div>
          </div>
        </header>

        {/* Settings Content */}
        <div className="p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="whatsapp-settings-title">
                <SettingsIcon className="h-5 w-5" />
                WhatsApp Business API Configuration
              </CardTitle>
              <CardDescription>
                Configure your WhatsApp Business API credentials to start sending messages.
                These credentials are encrypted and stored securely.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground" data-testid="loading-settings">Loading settings...</p>
                </div>
              ) : (
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumberId" className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Phone Number ID
                      </Label>
                      <Input
                        id="phoneNumberId"
                        placeholder="Your WhatsApp Business Phone Number ID"
                        data-testid="input-phone-number-id"
                        {...form.register("phoneNumberId")}
                      />
                      {form.formState.errors.phoneNumberId && (
                        <p className="text-sm text-destructive" data-testid="error-phone-number-id">
                          {form.formState.errors.phoneNumberId.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Found in your Meta for Developers console under WhatsApp {'>'} API Setup
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wabaId" className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        WhatsApp Business Account ID
                      </Label>
                      <Input
                        id="wabaId"
                        placeholder="Your WhatsApp Business Account ID"
                        data-testid="input-waba-id"
                        {...form.register("wabaId")}
                      />
                      {form.formState.errors.wabaId && (
                        <p className="text-sm text-destructive" data-testid="error-waba-id">
                          {form.formState.errors.wabaId.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Your WhatsApp Business Account identifier
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accessToken" className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Access Token
                    </Label>
                    <Input
                      id="accessToken"
                      type="password"
                      placeholder="Your WhatsApp Business API Access Token"
                      data-testid="input-access-token"
                      {...form.register("accessToken")}
                    />
                    {form.formState.errors.accessToken && (
                      <p className="text-sm text-destructive" data-testid="error-access-token">
                        {form.formState.errors.accessToken.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Your API access token from Meta for Developers. This will be encrypted before storage.
                    </p>
                  </div>

                  <div className="pt-4">
                    <Button 
                      type="submit"
                      disabled={saveSettingsMutation.isPending}
                      data-testid="button-save-settings"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Setup Instructions */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="setup-instructions-title">Setup Instructions</CardTitle>
              <CardDescription>
                Follow these steps to configure your WhatsApp Business API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Create a Meta for Developers Account</h4>
                    <p className="text-sm text-muted-foreground">
                      Visit{" "}
                      <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        developers.facebook.com
                      </a>{" "}
                      and create an account if you don't have one.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Create a WhatsApp Business App</h4>
                    <p className="text-sm text-muted-foreground">
                      Create a new app and add the WhatsApp Business product to it.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Get Your Credentials</h4>
                    <p className="text-sm text-muted-foreground">
                      Copy the Phone Number ID, WABA ID, and Access Token from your app dashboard.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Configure Webhook (Optional)</h4>
                    <p className="text-sm text-muted-foreground">
                      Set your webhook URL to <code className="bg-muted px-1 rounded">{window.location.origin}/api/webhook/whatsapp</code> to receive message status updates.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp Diagnostic */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="diagnostic-title">
                <Stethoscope className="h-5 w-5" />
                WhatsApp Configuration Diagnostic
              </CardTitle>
              <CardDescription>
                Run this diagnostic to check your WhatsApp Business API configuration and identify any issues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => runDiagnosticMutation.mutate()}
                disabled={runDiagnosticMutation.isPending || !settings?.accessToken}
                data-testid="button-run-diagnostic"
              >
                <Stethoscope className="h-4 w-4 mr-2" />
                {runDiagnosticMutation.isPending ? "Running Diagnostic..." : "Run Diagnostic"}
              </Button>

              {!settings?.accessToken && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Save your WhatsApp API settings first to run the diagnostic
                  </AlertDescription>
                </Alert>
              )}

              {diagnosticResult && (
                <div className="space-y-4">
                  <Alert variant={diagnosticResult.status === 'error' ? 'destructive' : 'default'}>
                    {diagnosticResult.status === 'error' ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : diagnosticResult.status === 'warning' ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      <strong>{diagnosticResult.message}</strong>
                    </AlertDescription>
                  </Alert>

                  {diagnosticResult.issues.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Issues Found
                      </h4>
                      <ul className="space-y-1">
                        {diagnosticResult.issues.map((issue, index) => (
                          <li key={index} className="text-sm text-destructive flex items-start gap-2">
                            <span className="w-1 h-1 bg-destructive rounded-full mt-2 flex-shrink-0" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {diagnosticResult.warnings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-orange-600 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Warnings
                      </h4>
                      <ul className="space-y-1">
                        {diagnosticResult.warnings.map((warning, index) => (
                          <li key={index} className="text-sm text-orange-600 flex items-start gap-2">
                            <span className="w-1 h-1 bg-orange-600 rounded-full mt-2 flex-shrink-0" />
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {diagnosticResult.info.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-blue-600 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Configuration Info
                      </h4>
                      <ul className="space-y-1">
                        {diagnosticResult.info.map((info, index) => (
                          <li key={index} className="text-sm text-blue-600 flex items-start gap-2">
                            <span className="w-1 h-1 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                            {info}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="font-semibold text-muted-foreground flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Recommendations
                    </h4>
                    <ul className="space-y-1">
                      {diagnosticResult.recommendations.map((recommendation, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
