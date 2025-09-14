import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { insertContactSchema } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedContact {
  name: string;
  phone: string;
  tags?: string[];
  groups?: string[];
  variables?: Record<string, string>;
  isValid: boolean;
  errors: string[];
}

export function CSVImportDialog({ open, onOpenChange }: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const bulkImportMutation = useMutation({
    mutationFn: async (contacts: any[]) => {
      const res = await apiRequest("POST", "/api/contacts/bulk", contacts);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Import Successful",
        description: `Successfully imported ${Array.isArray(data) ? data.length : 0} contacts`,
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Import Failed",
        description: "There was an error importing your contacts. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const isCSV = selectedFile.name.endsWith('.csv');
    const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');

    if (!isCSV && !isExcel) {
      toast({
        title: "Invalid File",
        description: "Please select a CSV or Excel file",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    if (isCSV) {
      parseCSV(selectedFile);
    } else {
      parseExcel(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    setIsProcessing(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const contacts: ParsedContact[] = results.data.map((row: any, index: number) => {
          const contact: ParsedContact = {
            name: "",
            phone: "",
            tags: [],
            groups: [],
            variables: {},
            isValid: true,
            errors: [],
          };

          // Map CSV columns to contact fields (flexible mapping)
          const name = row.name || row.Name || row.full_name || row["Full Name"] || "";
          const phone = row.phone || row.Phone || row.mobile || row.Mobile || row.number || row.Number || "";
          const tagsString = row.tags || row.Tags || "";
          const groupsString = row.groups || row.Groups || "";

          contact.name = String(name).trim();
          contact.phone = String(phone).trim();
          
          // Parse tags and groups
          if (tagsString) {
            contact.tags = String(tagsString).split(",").map(tag => tag.trim()).filter(Boolean);
          }
          if (groupsString) {
            contact.groups = String(groupsString).split(",").map(group => group.trim()).filter(Boolean);
          }

          // Extract other fields as variables
          Object.keys(row).forEach(key => {
            if (!['name', 'Name', 'full_name', 'Full Name', 'phone', 'Phone', 'mobile', 'Mobile', 'number', 'Number', 'tags', 'Tags', 'groups', 'Groups'].includes(key)) {
              if (row[key] && String(row[key]).trim()) {
                contact.variables![key] = String(row[key]).trim();
              }
            }
          });

          // Validation
          try {
            insertContactSchema.parse({
              name: contact.name,
              phone: contact.phone,
              tags: contact.tags,
              groups: contact.groups,
              variables: contact.variables,
            });
          } catch (error) {
            contact.isValid = false;
            if (error instanceof z.ZodError) {
              contact.errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
            } else {
              contact.errors = ["Invalid contact data"];
            }
          }

          return contact;
        });

        setParsedContacts(contacts);
        setShowPreview(true);
        setIsProcessing(false);
      },
      error: (error) => {
        toast({
          title: "Parse Error",
          description: "Failed to parse CSV file. Please check the format.",
          variant: "destructive",
        });
        setIsProcessing(false);
      },
    });
  };

  const parseExcel = (file: File) => {
    setIsProcessing(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Process data same as CSV
        const contacts: ParsedContact[] = jsonData.map((row: any) => {
          const contact: ParsedContact = {
            name: "",
            phone: "",
            tags: [],
            groups: [],
            variables: {},
            isValid: true,
            errors: [],
          };

          // Map columns to contact fields (flexible mapping)
          const name = row.name || row.Name || row.full_name || row["Full Name"] || "";
          const phone = row.phone || row.Phone || row.mobile || row.Mobile || row.number || row.Number || "";
          const tagsString = row.tags || row.Tags || "";
          const groupsString = row.groups || row.Groups || "";

          contact.name = String(name).trim();
          contact.phone = String(phone).trim();
          
          // Parse tags and groups
          if (tagsString) {
            contact.tags = String(tagsString).split(",").map(tag => tag.trim()).filter(Boolean);
          }
          if (groupsString) {
            contact.groups = String(groupsString).split(",").map(group => group.trim()).filter(Boolean);
          }

          // Extract other fields as variables
          Object.keys(row).forEach(key => {
            if (!['name', 'Name', 'full_name', 'Full Name', 'phone', 'Phone', 'mobile', 'Mobile', 'number', 'Number', 'tags', 'Tags', 'groups', 'Groups'].includes(key)) {
              if (row[key] && String(row[key]).trim()) {
                contact.variables![key] = String(row[key]).trim();
              }
            }
          });

          // Validation
          try {
            insertContactSchema.parse({
              name: contact.name,
              phone: contact.phone,
              tags: contact.tags,
              groups: contact.groups,
              variables: contact.variables,
            });
          } catch (error) {
            contact.isValid = false;
            if (error instanceof z.ZodError) {
              contact.errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
            } else {
              contact.errors = ["Invalid contact data"];
            }
          }

          return contact;
        });

        setParsedContacts(contacts);
        setShowPreview(true);
        setIsProcessing(false);
      } catch (error) {
        toast({
          title: "Parse Error",
          description: "Failed to parse Excel file. Please check the format.",
          variant: "destructive",
        });
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      toast({
        title: "File Error",
        description: "Failed to read Excel file.",
        variant: "destructive",
      });
      setIsProcessing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = () => {
    const validContacts = parsedContacts.filter(contact => contact.isValid);
    if (validContacts.length === 0) {
      toast({
        title: "No Valid Contacts",
        description: "Please fix the errors before importing",
        variant: "destructive",
      });
      return;
    }

    const contactsToImport = validContacts.map(contact => ({
      name: contact.name,
      phone: contact.phone,
      tags: contact.tags,
      groups: contact.groups,
      variables: contact.variables,
    }));

    bulkImportMutation.mutate(contactsToImport);
  };

  const handleClose = () => {
    setFile(null);
    setParsedContacts([]);
    setShowPreview(false);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  const validCount = parsedContacts.filter(contact => contact.isValid).length;
  const invalidCount = parsedContacts.length - validCount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]" data-testid="dialog-csv-import">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Contacts from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file with contact information. Required columns: name, phone. Optional: tags, groups.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showPreview ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="csv-file">Select CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  disabled={isProcessing}
                  data-testid="input-csv-file"
                />
              </div>

              {file && !isProcessing && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}

              {isProcessing && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-r-transparent"></div>
                  <span className="text-sm">Processing CSV file...</span>
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>CSV Format:</strong> The first row should contain column headers. 
                  Supported columns: name, phone (required), tags, groups (comma-separated), and any custom fields.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="text-green-700 bg-green-100" data-testid="valid-contacts-count">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {validCount} Valid
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="destructive" data-testid="invalid-contacts-count">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {invalidCount} Invalid
                    </Badge>
                  )}
                </div>
                <Button variant="outline" onClick={() => setShowPreview(false)} data-testid="button-back-to-upload">
                  Upload Different File
                </Button>
              </div>

              <ScrollArea className="h-96 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Groups</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedContacts.map((contact, index) => (
                      <TableRow key={index} data-testid={`contact-preview-${index}`}>
                        <TableCell>
                          {contact.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{contact.name}</TableCell>
                        <TableCell>{contact.phone}</TableCell>
                        <TableCell>
                          {contact.tags && contact.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {contact.tags.slice(0, 2).map((tag, tagIndex) => (
                                <Badge key={tagIndex} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {contact.tags.length > 2 && (
                                <span className="text-xs text-muted-foreground">+{contact.tags.length - 2}</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.groups && contact.groups.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {contact.groups.slice(0, 2).map((group, groupIndex) => (
                                <Badge key={groupIndex} variant="outline" className="text-xs">
                                  {group}
                                </Badge>
                              ))}
                              {contact.groups.length > 2 && (
                                <span className="text-xs text-muted-foreground">+{contact.groups.length - 2}</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.errors.length > 0 && (
                            <div className="text-xs text-red-600">
                              {contact.errors.join(", ")}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel-import">
            Cancel
          </Button>
          {showPreview && (
            <Button
              onClick={handleImport}
              disabled={validCount === 0 || bulkImportMutation.isPending}
              data-testid="button-confirm-import"
            >
              {bulkImportMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-r-transparent mr-2"></div>
                  Importing...
                </>
              ) : (
                `Import ${validCount} Contacts`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}