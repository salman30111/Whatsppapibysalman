import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Bot, Plus, Edit, Trash2, MessageSquare, Zap, Hash, Power, PowerOff, TestTube, Send } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertBotRuleSchema, type BotRule, type Template } from "@shared/schema";
import { useState } from "react";
import { z } from "zod";

// Form schema for bot rules
const botRuleFormSchema = insertBotRuleSchema.extend({
  triggers: z.array(z.string()).min(1, "At least one trigger is required"),
  replyContent: z.object({
    text: z.string().optional(),
    templateId: z.string().optional(),
    mediaUrl: z.string().optional(),
  }).optional(),
});

type BotRuleFormData = z.infer<typeof botRuleFormSchema>;

export default function BotRules() {
  const { toast } = useToast();
  const [editingRule, setEditingRule] = useState<BotRule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [triggerInput, setTriggerInput] = useState("");
  
  // Bot testing state
  const [testMessage, setTestMessage] = useState("");
  const [testResult, setTestResult] = useState<{
    matchedRule?: BotRule;
    replyPreview?: string;
    noMatch?: boolean;
  } | null>(null);

  // Fetch bot rules
  const { data: rules = [], isLoading } = useQuery<BotRule[]>({
    queryKey: ["/api/bot-rules"],
  });

  // Fetch templates for template reply option
  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  // Form setup
  const form = useForm<BotRuleFormData>({
    resolver: zodResolver(botRuleFormSchema),
    defaultValues: {
      name: "",
      triggerType: "exact",
      triggers: [],
      replyType: "text",
      replyContent: { text: "" },
      priority: 1,
      active: true,
    },
  });

  // Create bot rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (data: BotRuleFormData) => {
      const res = await apiRequest("POST", "/api/bot-rules", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot-rules"] });
      toast({
        title: "Bot rule created",
        description: "Your new bot rule is now active and ready to respond to messages.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create rule",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update bot rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BotRuleFormData> }) => {
      const res = await apiRequest("PUT", `/api/bot-rules/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot-rules"] });
      toast({
        title: "Bot rule updated",
        description: "Your bot rule has been updated successfully.",
      });
      setIsDialogOpen(false);
      setEditingRule(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to update rule",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete bot rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/bot-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot-rules"] });
      toast({
        title: "Bot rule deleted",
        description: "The bot rule has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete rule",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle rule active status
  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await apiRequest("PUT", `/api/bot-rules/${id}`, { active });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot-rules"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to toggle rule",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: BotRuleFormData) => {
    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data });
    } else {
      createRuleMutation.mutate(data);
    }
  };

  // Open dialog for editing
  const openEditDialog = (rule: BotRule) => {
    setEditingRule(rule);
    form.reset({
      name: rule.name,
      triggerType: rule.triggerType,
      triggers: rule.triggers || [],
      replyType: rule.replyType,
      replyContent: rule.replyContent || { text: "" },
      priority: rule.priority,
      active: rule.active,
    });
    setIsDialogOpen(true);
  };

  // Open dialog for creating new rule
  const openCreateDialog = () => {
    setEditingRule(null);
    form.reset();
    setIsDialogOpen(true);
  };

  // Add trigger to the list
  const addTrigger = () => {
    if (!triggerInput.trim()) return;
    const currentTriggers = form.getValues("triggers") || [];
    if (!currentTriggers.includes(triggerInput.trim())) {
      form.setValue("triggers", [...currentTriggers, triggerInput.trim()]);
    }
    setTriggerInput("");
  };

  // Remove trigger from the list
  const removeTrigger = (trigger: string) => {
    const currentTriggers = form.getValues("triggers") || [];
    form.setValue("triggers", currentTriggers.filter(t => t !== trigger));
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case "exact": return Hash;
      case "startswith": return Zap;
      case "contains": return MessageSquare;
      case "regex": return Bot;
      default: return MessageSquare;
    }
  };

  // Test bot logic locally (simulating the server logic)
  const testBotMessage = () => {
    if (!testMessage.trim()) {
      setTestResult({ noMatch: true });
      return;
    }

    const activeRules = rules.filter(rule => rule.active);
    if (activeRules.length === 0) {
      setTestResult({ noMatch: true });
      return;
    }

    // Simulate server-side matching logic
    const messageText = testMessage.toLowerCase().trim();
    
    // Find matching rule using hierarchy: exact > starts with > contains > regex
    const matchTiers = {
      exact: [] as { rule: BotRule, priority: number }[],
      startswith: [] as { rule: BotRule, priority: number }[],
      contains: [] as { rule: BotRule, priority: number }[],
      regex: [] as { rule: BotRule, priority: number }[]
    };
    
    // Categorize matching rules by type
    for (const rule of activeRules) {
      const triggers = Array.isArray(rule.triggers) ? rule.triggers : [];
      let matches = false;
      
      for (const trigger of triggers) {
        const triggerLower = trigger.toLowerCase().trim();
        
        switch (rule.triggerType) {
          case 'exact':
            if (messageText === triggerLower) matches = true;
            break;
          case 'startswith':
            if (messageText.startsWith(triggerLower)) matches = true;
            break;
          case 'contains':
            if (messageText.includes(triggerLower)) matches = true;
            break;
          case 'regex':
            try {
              const regex = new RegExp(trigger, 'i');
              if (regex.test(messageText)) matches = true;
            } catch (e) {
              // Invalid regex, skip
            }
            break;
        }
        
        if (matches) break;
      }
      
      if (matches) {
        matchTiers[rule.triggerType].push({ rule, priority: rule.priority });
      }
    }
    
    // Return highest priority match from the highest tier that has matches
    let matchedRule: BotRule | null = null;
    for (const tier of ['exact', 'startswith', 'contains', 'regex'] as const) {
      if (matchTiers[tier].length > 0) {
        // Sort by priority (highest first) and return the first one
        matchTiers[tier].sort((a, b) => b.priority - a.priority);
        matchedRule = matchTiers[tier][0].rule;
        break;
      }
    }

    if (!matchedRule) {
      setTestResult({ noMatch: true });
      return;
    }

    // Generate reply preview
    let replyPreview = "";
    switch (matchedRule.replyType) {
      case 'text':
        replyPreview = matchedRule.replyContent?.text || "Hello! Thanks for your message.";
        break;
      case 'template':
        const template = templates.find(t => t.id === matchedRule.replyContent?.templateId);
        replyPreview = template ? `📝 Template: ${template.name}` : "📝 Template reply (template not found)";
        break;
      case 'media':
        replyPreview = matchedRule.replyContent?.mediaUrl ? 
          `📷 Media: ${matchedRule.replyContent.mediaUrl}` : 
          "📷 Media reply";
        break;
    }

    setTestResult({
      matchedRule,
      replyPreview
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2" data-testid="page-title">
                <Bot className="h-8 w-8" />
                Bot Rules
              </h1>
              <p className="text-muted-foreground mt-1" data-testid="page-description">
                Create automated responses for incoming WhatsApp messages
              </p>
            </div>
            <Button onClick={openCreateDialog} data-testid="button-add-rule">
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Bot Rules</CardTitle>
              <CardDescription>
                Manage your automated response rules. Rules are processed in order of priority.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[300px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : rules.length === 0 ? (
                <div className="text-center py-12">
                  <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No bot rules yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first bot rule to start automating WhatsApp responses.
                  </p>
                  <Button onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Rule
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Trigger Type</TableHead>
                      <TableHead>Triggers</TableHead>
                      <TableHead>Reply Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => {
                      const TriggerIcon = getTriggerIcon(rule.triggerType);
                      return (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium" data-testid={`rule-name-${rule.id}`}>
                            {rule.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TriggerIcon className="h-4 w-4" />
                              <span className="capitalize">{rule.triggerType}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(rule.triggers || []).slice(0, 3).map((trigger, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {trigger}
                                </Badge>
                              ))}
                              {(rule.triggers || []).length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{(rule.triggers || []).length - 3} more
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {rule.replyType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{rule.priority}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRuleMutation.mutate({ id: rule.id, active: !rule.active })}
                              className="p-0 h-auto"
                              data-testid={`toggle-rule-${rule.id}`}
                            >
                              {rule.active ? (
                                <div className="flex items-center gap-2 text-green-600">
                                  <Power className="h-4 w-4" />
                                  Active
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <PowerOff className="h-4 w-4" />
                                  Inactive
                                </div>
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(rule)}
                                data-testid={`edit-rule-${rule.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" data-testid={`delete-rule-${rule.id}`}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete bot rule?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete the bot rule "{rule.name}". This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteRuleMutation.mutate(rule.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Bot Testing Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Bot Testing Panel
              </CardTitle>
              <CardDescription>
                Test your bot rules by simulating incoming messages and preview the responses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a test message..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && testBotMessage()}
                  data-testid="input-test-message"
                  className="flex-1"
                />
                <Button 
                  onClick={testBotMessage}
                  disabled={!testMessage.trim()}
                  data-testid="button-test-message"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Test
                </Button>
              </div>

              {testResult && (
                <div className="border rounded-lg p-4 space-y-4">
                  {testResult.noMatch ? (
                    <div className="text-center py-4">
                      <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No matching rules found</p>
                      <p className="text-sm text-muted-foreground">
                        This message wouldn't trigger any active bot rules.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Matched Rule</h4>
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <div className="flex items-center gap-2">
                            {testResult.matchedRule && (() => {
                              const TriggerIcon = getTriggerIcon(testResult.matchedRule.triggerType);
                              return <TriggerIcon className="h-4 w-4" />;
                            })()}
                            <span className="font-medium" data-testid="matched-rule-name">
                              {testResult.matchedRule?.name}
                            </span>
                          </div>
                          <Badge variant="outline" className="ml-auto">
                            Priority: {testResult.matchedRule?.priority}
                          </Badge>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Bot Reply Preview</h4>
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <p className="text-sm" data-testid="reply-preview">
                            {testResult.replyPreview}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        <p>
                          <strong>Trigger Type:</strong> {testResult.matchedRule?.triggerType} |{" "}
                          <strong>Reply Type:</strong> {testResult.matchedRule?.replyType}
                        </p>
                        <p>
                          <strong>Triggers:</strong> {(testResult.matchedRule?.triggers || []).join(", ")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add/Edit Bot Rule Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title">
              {editingRule ? "Edit Bot Rule" : "Create Bot Rule"}
            </DialogTitle>
            <DialogDescription>
              Configure an automated response rule for incoming WhatsApp messages.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Rule Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Welcome Message, Support Hours" {...field} data-testid="input-rule-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Trigger Type */}
              <FormField
                control={form.control}
                name="triggerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trigger Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-trigger-type">
                          <SelectValue placeholder="Select trigger type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="exact">Exact Match - Message must match exactly</SelectItem>
                        <SelectItem value="startswith">Starts With - Message starts with trigger</SelectItem>
                        <SelectItem value="contains">Contains - Message contains trigger anywhere</SelectItem>
                        <SelectItem value="regex">Regex - Advanced pattern matching</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Triggers */}
              <FormField
                control={form.control}
                name="triggers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trigger Keywords/Phrases</FormLabel>
                    <FormDescription>
                      Add keywords or phrases that will trigger this rule
                    </FormDescription>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter trigger keyword..."
                          value={triggerInput}
                          onChange={(e) => setTriggerInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTrigger())}
                          data-testid="input-trigger"
                        />
                        <Button type="button" onClick={addTrigger} data-testid="button-add-trigger">
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(field.value || []).map((trigger, idx) => (
                          <Badge key={idx} variant="outline" className="flex items-center gap-1">
                            {trigger}
                            <button
                              type="button"
                              onClick={() => removeTrigger(trigger)}
                              className="ml-1 text-xs hover:text-destructive"
                              data-testid={`remove-trigger-${idx}`}
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Reply Type */}
              <FormField
                control={form.control}
                name="replyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reply Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-reply-type">
                          <SelectValue placeholder="Select reply type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="text">Text Message</SelectItem>
                        <SelectItem value="template">WhatsApp Template</SelectItem>
                        <SelectItem value="media">Media (Image/Document)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Reply Content */}
              {form.watch("replyType") === "text" && (
                <FormField
                  control={form.control}
                  name="replyContent.text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reply Text</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter your reply message..."
                          className="min-h-[80px]"
                          {...field}
                          data-testid="textarea-reply-text"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("replyType") === "template" && (
                <FormField
                  control={form.control}
                  name="replyContent.templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Template</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-template">
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("replyType") === "media" && (
                <FormField
                  control={form.control}
                  name="replyContent.mediaUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Media URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/image.jpg"
                          {...field}
                          data-testid="input-media-url"
                        />
                      </FormControl>
                      <FormDescription>
                        Enter a direct URL to an image, document, or video file
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Priority and Active */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          data-testid="input-priority"
                        />
                      </FormControl>
                      <FormDescription>Higher numbers = higher priority</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Active
                        </FormLabel>
                        <FormDescription>
                          Enable this rule to respond to messages
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                  data-testid="button-save"
                >
                  {editingRule ? "Update Rule" : "Create Rule"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}