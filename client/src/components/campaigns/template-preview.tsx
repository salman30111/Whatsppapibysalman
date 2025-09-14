import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Image, FileText, Phone } from "lucide-react";
import { useState } from "react";
import type { Template } from "@shared/schema";

interface TemplatePreviewProps {
  template: Template | null;
  selectedContacts: string[];
  className?: string;
}

export function TemplatePreview({ template, selectedContacts, className }: TemplatePreviewProps) {
  const [variables, setVariables] = useState<Record<string, string>>({});

  if (!template) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Template Preview
          </CardTitle>
          <CardDescription>Select a template to see the preview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No template selected
          </div>
        </CardContent>
      </Card>
    );
  }

  // Extract variables from template components (looking for {{variable}} patterns)
  const extractVariables = (text: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }
    return matches;
  };

  // Get body component text
  const getBodyText = (): string => {
    const bodyComponent = template.components?.find((comp: any) => comp.type === 'BODY');
    return bodyComponent?.text || '';
  };

  const templateVariables = extractVariables(getBodyText());

  // Replace variables in template text with actual values
  const renderTemplate = (text: string): string => {
    let result = text;
    templateVariables.forEach(variable => {
      const value = variables[variable] || `{{${variable}}}`;
      result = result.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), value);
    });
    return result;
  };

  // Get template components
  const getHeaderComponent = () => template.components?.find((comp: any) => comp.type === 'HEADER');
  const getBodyComponent = () => template.components?.find((comp: any) => comp.type === 'BODY');
  const getFooterComponent = () => template.components?.find((comp: any) => comp.type === 'FOOTER');
  const getButtonsComponent = () => template.components?.find((comp: any) => comp.type === 'BUTTONS');

  const getTemplateTypeIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'marketing':
        return <MessageSquare className="h-4 w-4" />;
      case 'utility':
        return <FileText className="h-4 w-4" />;
      case 'authentication':
        return <Phone className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Template Preview
        </CardTitle>
        <CardDescription>Preview how your message will appear to recipients</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Info */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            {getTemplateTypeIcon(template.category)}
            <div>
              <div className="font-medium">{template.name}</div>
              <div className="text-sm text-muted-foreground">{template.language}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default">
              APPROVED
            </Badge>
            <Badge variant="outline">{template.category}</Badge>
          </div>
        </div>

        {/* Variable Inputs */}
        {templateVariables.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Template Variables</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templateVariables.map((variable) => (
                <div key={variable} className="space-y-1">
                  <Label htmlFor={`var-${variable}`} className="text-xs">
                    {variable.charAt(0).toUpperCase() + variable.slice(1)}
                  </Label>
                  <Input
                    id={`var-${variable}`}
                    placeholder={`Enter ${variable}`}
                    value={variables[variable] || ''}
                    onChange={(e) => setVariables(prev => ({
                      ...prev,
                      [variable]: e.target.value
                    }))}
                    className="h-8 text-sm"
                    data-testid={`input-variable-${variable}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Preview */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Message Preview</h4>
          <div className="bg-white dark:bg-gray-800 border rounded-lg p-4 min-h-[100px]">
            <div className="space-y-3">
              {/* Header */}
              {getHeaderComponent() && (
                <div className="border-b pb-2">
                  {getHeaderComponent()?.format === 'TEXT' && (
                    <div className="font-medium text-sm">
                      {renderTemplate(getHeaderComponent()?.text || '')}
                    </div>
                  )}
                  {getHeaderComponent()?.format === 'IMAGE' && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Image className="h-4 w-4" />
                      <span>Image Header</span>
                    </div>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="text-sm whitespace-pre-wrap">
                {renderTemplate(getBodyText())}
              </div>

              {/* Footer */}
              {getFooterComponent() && (
                <div className="border-t pt-2 text-xs text-muted-foreground">
                  {renderTemplate(getFooterComponent()?.text || '')}
                </div>
              )}

              {/* Buttons */}
              {getButtonsComponent()?.buttons && (
                <div className="space-y-1">
                  {getButtonsComponent()?.buttons.map((button: any, index: number) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="w-full justify-center text-xs h-8"
                      disabled
                    >
                      {button.text}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Send Summary */}
        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
          <div className="text-sm">
            <div className="font-medium mb-1">Campaign Summary</div>
            <div className="text-muted-foreground">
              This message will be sent to <span className="font-medium">{selectedContacts.length}</span> contacts
              {templateVariables.length > 0 && (
                <span> with personalized variables</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}